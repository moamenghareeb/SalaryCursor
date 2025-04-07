import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LoadingSpinner from '../components/LoadingSpinner';
import Link from 'next/link';
import { FiCalendar, FiDollarSign, FiArrowRight, FiPieChart, FiChevronLeft, FiChevronRight, FiDownload, FiClock } from 'react-icons/fi';
import { pdf, Font } from '@react-pdf/renderer';
import YearlySalaryPDF from '../components/YearlySalaryPDF';
import toast from 'react-hot-toast';
import StatsPanel from '../components/dashboard/StatsPanel';
import { format, addDays, getDay } from 'date-fns';
import { ShiftType } from '../lib/types/schedule';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/themeContext';
import { useQuery } from '@tanstack/react-query';

// Register Roboto Font (assuming files are in public/fonts)
// You MUST ensure these TTF files exist in public/fonts/
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
    // Add other weights/styles like Italic if needed
  ]
});

// Import skeleton components
import { 
  StatsPanelSkeleton, 
  LeaveBalanceSkeleton,
  SalaryHistorySkeleton
} from '../components/dashboard/SkeletonLoaders';

// Import React Query hooks
import { 
  useEmployee, 
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
  // State and hooks that must be called at the top level
  const router = useRouter();
  const [pdfLoading, setPdfLoading] = useState(false);
  const { isDarkMode } = useTheme();
  
  // Year selection states
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Get user data
  const { data: userData } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const userId = userData?.user?.id;

  // Use React Query hooks - these must be called at the top level
  const { 
    data: employee, 
    isLoading: employeeLoading,
    error: employeeError
  } = useEmployee(userId);
  
  const {
    data: leaveBalanceData,
    isLoading: leaveLoading,
    error: leaveError
  } = useLeaveBalance(userId, currentYear);
  
  const {
    data: salaryData,
    isLoading: salaryLoading,
    error: salaryError
  } = useSalaryData(userId, selectedYear);

  // Derived state and computations
  const isLoading = employeeLoading || leaveLoading || salaryLoading;
  const hasError = employeeError || leaveError || salaryError;

  // Format currency with 2 decimal places
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format hours with 2 decimal places
  const formatHours = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return '0';
    return hours.toFixed(2);
  };

  // Format date
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return 'N/A';
    return parsedDate.toLocaleDateString('en-EG', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Get current month's salary record
  const currentMonthRecord = useMemo(() => {
    if (!salaryData?.monthlySalaries) return null;
    const currentMonth = new Date().getMonth() + 1;
    return salaryData.monthlySalaries.find(month => month.month === currentMonth);
  }, [salaryData?.monthlySalaries]);

  // Get current year's salary records
  const currentYearRecords = useMemo(() => {
    if (!salaryData?.monthlySalaries) return [];
    return salaryData.monthlySalaries.filter(month => month.month > 0);
  }, [salaryData?.monthlySalaries]);

  // Handler for changing the selected year
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  // Handler for generating PDF
  const handleGeneratePDF = async () => {
    try {
      setPdfLoading(true);
      // Implement PDF generation logic here
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  // Render logic
  if (!userId) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please log in to view your dashboard</h2>
            <Link href="/login" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Login
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (hasError) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Error Loading Dashboard</h2>
            <p className="text-red-500">
              {(() => {
                if (employeeError) return 'Error loading employee data';
                if (leaveError) return 'Error loading leave balance';
                if (salaryError) return 'Error loading salary data';
                return 'An error occurred while loading your data';
              })()}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Dashboard - SalaryCursor</title>
        <meta name="description" content="View your salary and leave summary" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatsPanel
            stats={{
              monthlyEarnings: currentMonthRecord?.total || 0,
              overtimeHours: 0
            }}
            isLoading={salaryLoading}
            error={salaryError}
          />

          <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-2">
                <FiCalendar className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              </div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Leave Balance
              </span>
            </div>
            {leaveLoading ? (
              <LeaveBalanceSkeleton isDarkMode={isDarkMode} />
            ) : leaveError ? (
              <div className="text-red-500 text-center py-4">
                Error loading leave balance
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-500'} mb-1`}>
                  {leaveBalanceData?.remainingBalance || 0} days
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Available leave days
                </p>
                <div className="mt-2 flex justify-between">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Taken: {leaveBalanceData?.leaveTaken || 0} days
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Remaining: {leaveBalanceData?.remainingBalance || 0} days
                  </p>
                </div>
              </>
            )}
          </div>

          <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-2">
                <FiDollarSign className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
              </div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Yearly Salary
              </span>
            </div>
            {salaryLoading ? (
              <SalaryHistorySkeleton isDarkMode={isDarkMode} />
            ) : salaryError ? (
              <div className="text-red-500 text-center py-4">
                Error loading salary data
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className={`w-32 px-3 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleGeneratePDF}
                    className={`px-4 py-2 rounded-md ${pdfLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'} text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? 'Generating...' : 'Generate PDF'}
                  </button>
                </div>
                <div className="space-y-4">
                  {currentYearRecords.map((month, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-between`}
                    >
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {formatDate(new Date(selectedYear, month.month - 1).toISOString())}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          Basic: {formatCurrency(month.total)}
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${isDarkMode ? 'text-green-400' : 'text-green-500'}`}>
                        {formatCurrency(month.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
