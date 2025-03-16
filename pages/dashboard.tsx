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
  const stats = useMemo(() => ({
    monthlyEarnings: salaryData?.currentSalary || 0,
    overtimeHours: shiftData?.stats?.overtimeHours || 0
  }), [salaryData, shiftData]);
  
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
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome back, {employee?.name || 'Loading...'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Here's an overview of your work schedule and salary information
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 mb-8">
            {isLoading ? (
              <StatsPanelSkeleton />
            ) : (
              <StatsPanel data={stats} />
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming Shifts Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FiCalendar className="w-5 h-5 text-blue-500 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Upcoming Shifts
                    </h2>
                  </div>
                  <Link 
                    href="/schedule" 
                    className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    View Schedule
                    <FiArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <UpcomingShiftsSkeleton />
                ) : upcomingShifts.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingShifts.map((shift, index) => (
                      <div 
                        key={index}
                        className="flex items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-4">
                          <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {format(new Date(shift.date), 'd')}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {format(new Date(shift.date), 'EEEE, MMMM d')}
                            </h3>
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              shift.type === 'Day' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : shift.type === 'Night'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {shift.type} Shift
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {shift.startTime} - {shift.endTime}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      <FiCalendar className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      No Upcoming Shifts
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You have no scheduled shifts for the next few days
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Leave Balance Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FiPieChart className="w-5 h-5 text-blue-500 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Leave Balance
                    </h2>
                  </div>
                  <Link 
                    href="/leave" 
                    className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Request Leave
                    <FiArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <LeaveBalanceSkeleton />
                ) : leaveBalanceData ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Annual Leave
                        </h3>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {leaveBalanceData.used} used
                        </span>
                      </div>
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                              {leaveBalanceData.remainingBalance}
                            </span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                              days remaining
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {Math.round((leaveBalanceData.remainingBalance / leaveBalanceData.total) * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-600">
                          <div 
                            style={{ width: `${(leaveBalanceData.remainingBalance / leaveBalanceData.total) * 100}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Sick Leave
                        </h3>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {leaveBalanceData.used} used
                        </span>
                      </div>
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                              {leaveBalanceData.remainingBalance}
                            </span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                              days remaining
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {Math.round((leaveBalanceData.remainingBalance / leaveBalanceData.total) * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-600">
                          <div 
                            style={{ width: `${(leaveBalanceData.remainingBalance / leaveBalanceData.total) * 100}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 dark:bg-green-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      <FiPieChart className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      No Leave Data
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your leave balance information is not available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Salary History */}
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FiDollarSign className="w-5 h-5 text-blue-500 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Recent Salary History
                    </h2>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={pdfLoading}
                      className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiDownload className="w-4 h-4 mr-1.5" />
                      {pdfLoading ? 'Generating...' : 'Yearly Report'}
                    </button>
                    <Link 
                      href="/salary" 
                      className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      View All
                      <FiArrowRight className="ml-1 w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Month
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Basic Salary
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Overtime
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {isLoading ? (
                          <SalaryHistorySkeleton />
                        ) : salaryData?.monthlySalaries && salaryData.monthlySalaries.length > 0 ? (
                          salaryData.monthlySalaries.slice(0, 5).map((salary, index) => (
                            <tr 
                              key={index}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {format(new Date(salary.date), 'MMMM yyyy')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                {salary.basic_salary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                {salary.overtime_pay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900 dark:text-white">
                                {salary.total_salary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                              No salary history available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 