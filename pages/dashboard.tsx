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
import { ShiftType } from '../lib/types/schedule';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/themeContext';

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
  const { isDarkMode } = useTheme();
  
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
        <title>Dashboard - SalaryCursor</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          {/* Header section */}
          <div className="mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Welcome back, {employee?.name || 'Loading...'}
            </p>
          </div>

          {/* Stats Panel */}
          <div className="grid gap-4 sm:gap-6 mb-4 sm:mb-6">
            {isLoading ? (
              <StatsPanelSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Salary Stats */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FiDollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Last Month's Salary</h3>
                      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                        {salaryData?.currentSalary ? `EGP ${salaryData.currentSalary.toLocaleString()}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Overtime Stats */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <FiPieChart className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Overtime Hours</h3>
                      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                        {shiftData?.stats?.overtimeHours ? `${shiftData.stats.overtimeHours} hrs` : '0 hrs'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Leave Balance */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <FiCalendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Leave Balance</h3>
                      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                        {leaveBalanceData?.remainingBalance ? `${leaveBalanceData.remainingBalance} days` : '0 days'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Shift */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <FiArrowRight className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Next Shift</h3>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {upcomingShifts.length > 0 ? format(new Date(upcomingShifts[0].date), 'MMM dd') : 'No upcoming shifts'}
                      </p>
                      {upcomingShifts.length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{upcomingShifts[0].type} Shift</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Upcoming Shifts */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Upcoming Shifts</h2>
                  <Link 
                    href="/schedule" 
                    className="flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    View Schedule
                    <FiArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {isLoading ? (
                  <UpcomingShiftsSkeleton />
                ) : upcomingShifts.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingShifts.map((shift, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            shift.type === 'Day' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                            shift.type === 'Night' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          }`}>
                            <FiCalendar className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {format(new Date(shift.date), 'EEEE, MMMM d')}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {shift.type} Shift
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getShiftTimes(shift.type).start}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getShiftTimes(shift.type).end}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">No upcoming shifts scheduled</p>
                  </div>
                )}
              </div>
            </div>

            {/* Salary History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Salary History</h2>
                  <div className="flex items-center space-x-2">
                    <Link 
                      href="/salary" 
                      className="flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      View All
                      <FiArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {isLoading ? (
                  <SalaryHistorySkeleton />
                ) : salaryData?.monthlySalaries && salaryData.monthlySalaries.length > 0 ? (
                  <div className="space-y-4">
                    {salaryData.monthlySalaries.slice(0, 5).map((month, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {month.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Month {month.month}: EGP {month.total.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            EGP {month.total.toLocaleString()}
                          </p>
                          <button
                            onClick={() => handleDownloadPDF()}
                            disabled={pdfLoading}
                            className="mt-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
                          >
                            <FiDownload className="h-4 w-4 mr-1" />
                            PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">No salary history available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 