import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LoadingSpinner from '../components/LoadingSpinner';
import Link from 'next/link';
import { FiCalendar, FiDollarSign, FiArrowRight, FiPieChart, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import { pdf } from '@react-pdf/renderer';
import YearlySalaryPDF from '../components/YearlySalaryPDF';
import toast from 'react-hot-toast';
import StatsPanel, { StatsData } from '../components/dashboard/StatsPanel';
import UpcomingShifts, { UpcomingShift } from '../components/dashboard/UpcomingShifts';
import { format, addDays, getDay } from 'date-fns';
import { ShiftType } from '../components/calendar/DayCell';
import { supabase } from '../lib/supabase';

// Import skeleton components
import { 
  StatsPanelSkeleton, 
  UpcomingShiftsSkeleton, 
  LeaveBalanceSkeleton,
  SalaryHistorySkeleton
} from '../components/dashboard/SkeletonLoaders';

// Import React Query hooks
import { 
  useEmployee, 
  useShiftData, 
  useSalaryData, 
  useLeaveBalance 
} from '../lib/hooks';

// Helper to calculate start and end times based on shift type
const getShiftTimes = (type: ShiftType): { start: string, end: string } => {
  switch (type) {
    case 'Day':
      return { start: '08:00 AM', end: '04:00 PM' };
    case 'Night':
      return { start: '08:00 PM', end: '04:00 AM' };
    case 'Overtime':
      return { start: '04:00 PM', end: '08:00 PM' };
    default:
      return { start: '00:00', end: '00:00' };
  }
};

export default function Dashboard() {
  const router = useRouter();
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // Year selection states
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Fix getting supabase user data
  const [userData, setUserData] = useState<{ user: { id: string } | null }>({ user: null });
  const userId = userData?.user?.id;

  // Add useEffect to get user data
  useEffect(() => {
    async function getUserData() {
      const { data } = await supabase.auth.getUser();
      setUserData(data);
    }
    getUserData();
  }, []);

  // Use React Query hooks
  const { 
    data: employee, 
    isLoading: employeeLoading,
    error: employeeError
  } = useEmployee(userId);
  
  const {
    data: leaveBalanceData,
    isLoading: leaveLoading
  } = useLeaveBalance(userId, currentYear);
  
  const {
    data: salaryData,
    isLoading: salaryLoading
  } = useSalaryData(userId, selectedYear);
  
  const {
    data: shiftData,
    isLoading: shiftLoading
  } = useShiftData(userId);
  
  // Generate upcoming shifts
  const upcomingShifts = useMemo(() => {
    if (!shiftData?.shifts) return [];
    
    const upcoming: UpcomingShift[] = [];
    const today = new Date();
    
    // Generate upcoming shifts (next 5 days)
    for (let i = 0; i < 5; i++) {
      const date = addDays(today, i);
      const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
      
      // Skip weekends in this simple example
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Find if there's an override for this date
      const dateStr = format(date, 'yyyy-MM-dd');
      const override = shiftData.shifts.find(s => s.date === dateStr);
      
      // Default shift if no override
      let shiftType: ShiftType = 'Day';
      
      if (override) {
        shiftType = override.shift_type as ShiftType;
      }
      
      // Skip off/leave days
      if (shiftType === 'Off' || shiftType === 'Leave') continue;
      
      const { start, end } = getShiftTimes(shiftType);
      
      upcoming.push({
        date,
        type: shiftType,
        startTime: start,
        endTime: end,
        notes: override?.notes
      });
      
      // Only show max 3 upcoming shifts
      if (upcoming.length >= 3) break;
    }
    
    return upcoming;
  }, [shiftData?.shifts]);
  
  // Prepare stats data
  const stats = useMemo(() => {
    return {
      monthlyEarnings: salaryData?.currentSalary || 0,
      overtimeHours: shiftData?.stats?.overtimeHours || 0
    };
  }, [salaryData, shiftData]);
  
  // Combined loading state
  const isLoading = employeeLoading || leaveLoading || salaryLoading || shiftLoading;
  
  // Handler for changing the selected year
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };
  
  // Generate available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    // Add current year
    years.add(currentYear);
    
    // Add years from salary data if available
    if (salaryData?.monthlySalaries) {
      salaryData.monthlySalaries.forEach(month => {
        if (month) {
          years.add(selectedYear);
        }
      });
    }
    
    // Add previous and next years
    years.add(currentYear - 1);
    years.add(currentYear + 1);
    
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, salaryData, selectedYear]);
  
  // Handle downloading PDF
  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true);
      toast.loading('Generating PDF...');
      
      // Fix YearlySalaryPDF props
      const blob = await pdf(
        <YearlySalaryPDF 
          employee={{
            name: employee?.name || 'Employee',
            employee_id: employee?.employee_id || '-',
            position: employee?.position || '-',
            id: userId || '',
            created_at: '',
            updated_at: '',
            email: '',
            years_of_service: 0,
            is_admin: false
          }}
          year={selectedYear}
          totalSalary={salaryData?.yearlyTotal || 0}
          averageSalary={(salaryData?.yearlyTotal || 0) / 12}
          monthlyBreakdown={salaryData?.monthlySalaries || []}
        />
      ).toBlob();
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a link and click it
      const link = document.createElement('a');
      link.href = url;
      link.download = `salary_report_${selectedYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate PDF');
      console.error('PDF generation error:', error);
    } finally {
      setPdfLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <Head>
          <title>Dashboard - SalaryCursor</title>
          <meta name="description" content="View your salary and leave summary" />
        </Head>
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>Dashboard | SalaryCursor</title>
      </Head>
      
      {employeeError ? (
        <div className="bg-red-500 bg-opacity-20 text-red-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>{employeeError.message}</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Welcome, {employee?.name || 'Employee'}
            </h1>
            <p className="text-gray-400">
              {employee?.position || 'Staff'} • ID: {employee?.employee_id || 'N/A'}
            </p>
          </div>
          
          {/* Stats Panel */}
          {salaryLoading ? <StatsPanelSkeleton /> : <StatsPanel stats={stats} isLoading={false} />}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upcoming Shifts */}
            <div className="md:col-span-1">
              {shiftLoading ? <UpcomingShiftsSkeleton /> : <UpcomingShifts shifts={upcomingShifts} isLoading={false} />}
              
              {/* Leave Balance */}
              {leaveLoading ? (
                <LeaveBalanceSkeleton />
              ) : (
                <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6">
                  <h2 className="text-lg font-semibold mb-4 text-white">Leave Balance</h2>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Annual Leave</span>
                    <span className="text-white font-medium">{leaveBalanceData?.remainingBalance || 0} days</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, ((leaveBalanceData?.remainingBalance || 0) / 30) * 100)}%` }}
                    ></div>
                  </div>
                  <Link href="/leave" className="text-blue-400 hover:text-blue-300 text-sm flex justify-center items-center mt-3">
                    Request Leave
                  </Link>
                </div>
              )}
            </div>
            
            {/* Salary Chart */}
            <div className="md:col-span-2">
              {salaryLoading ? (
                <SalaryHistorySkeleton />
              ) : (
                <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-white">Salary History</h2>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedYear(selectedYear - 1)}
                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                      >
                        <FiChevronLeft />
                      </button>
                      <span className="text-gray-300">{selectedYear}</span>
                      <button 
                        onClick={() => setSelectedYear(selectedYear + 1)}
                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                      >
                        <FiChevronRight />
                      </button>
                      <button
                        onClick={handleDownloadPDF}
                        disabled={pdfLoading}
                        className="ml-2 p-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center"
                      >
                        {pdfLoading ? 'Generating...' : <><FiDownload className="mr-1" /> Export</>}
                      </button>
                    </div>
                  </div>
                  
                  {/* Monthly Salary Breakdown */}
                  <div className="h-64 w-full overflow-auto">
                    {salaryData?.monthlySalaries && salaryData.monthlySalaries.length > 0 ? (
                      <div className="space-y-3">
                        {salaryData.monthlySalaries.map((month, index) => (
                          <div key={index} className="bg-gray-700 p-3 rounded-md">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-300">{month.name}</span>
                              <span className="text-white font-semibold">EGP {month.total.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (month.total / (salaryData.yearlyTotal || 1)) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400">No salary data available for {selectedYear}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Yearly Total</p>
                      <p className="text-xl font-bold text-white">EGP {salaryData?.yearlyTotal?.toLocaleString() || '0'}</p>
                    </div>
                    <Link href="/salary" className="text-blue-400 hover:text-blue-300 text-sm flex items-center">
                      View Details <FiArrowRight className="ml-1" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Link href="/schedule" className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center mr-3">
                  <FiCalendar className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Schedule</h3>
                  <p className="text-sm text-gray-400">View your shifts</p>
                </div>
              </div>
            </Link>
            
            <Link href="/salary" className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mr-3">
                  <FiDollarSign className="text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Salary</h3>
                  <p className="text-sm text-gray-400">Monthly breakdown</p>
                </div>
              </div>
            </Link>
            
            <Link href="/leave" className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center mr-3">
                  <FiCalendar className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Leave</h3>
                  <p className="text-sm text-gray-400">Request time off</p>
                </div>
              </div>
            </Link>
            
            <Link href="/reports" className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-yellow-500 bg-opacity-20 flex items-center justify-center mr-3">
                  <FiPieChart className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Reports</h3>
                  <p className="text-sm text-gray-400">View annual reports</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </Layout>
  );
} 