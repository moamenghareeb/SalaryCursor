import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import { useTheme } from '../lib/themeContext';
import { useRouter } from 'next/router';
import LoadingSpinner from '../components/LoadingSpinner';
import Link from 'next/link';
import { FiCalendar, FiDollarSign, FiArrowRight, FiPieChart, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import { leaveService } from '../lib/leaveService';
import { pdf } from '@react-pdf/renderer';
import YearlySalaryPDF from '../components/YearlySalaryPDF';
import toast from 'react-hot-toast';
import StatsPanel, { StatsData } from '../components/dashboard/StatsPanel';
import UpcomingShifts, { UpcomingShift } from '../components/dashboard/UpcomingShifts';
import { format, addDays, getDay } from 'date-fns';
import { ShiftType } from '../components/calendar/DayCell';

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
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [employee, setEmployee] = useState<any>(null);
  const [currentSalary, setCurrentSalary] = useState<number | null>(null);
  const [yearlyTotal, setYearlyTotal] = useState<number | null>(null);
  const [monthlySalaries, setMonthlySalaries] = useState<any[]>([]);
  const [remainingLeave, setRemainingLeave] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // Stats data
  const [stats, setStats] = useState<StatsData>({
    totalShifts: 0,
    monthlyEarnings: 0,
    overtimeHours: 0,
    shiftChanges: 0
  });
  
  // Upcoming shifts
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  
  // Year selection states
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]); // Re-fetch data when selected year changes
  
  const fetchDashboardData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Get the current user
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        setError('Authentication failed. Please try logging in again.');
        return;
      }

      if (!userData?.user) {
        setError('No user found. Please log in.');
        return;
      }
      
      const userId = userData.user.id;
      
      // Fetch employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (employeeError) {
        setError(`Error fetching employee data: ${employeeError.message}`);
        return;
      }
      
      setEmployee(employeeData);
      
      // Get the current date once to use throughout the function
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12 format
      
      // First get ALL salary records to understand what we're working with
      const { data: allSalaryRecords, error: allSalaryError } = await supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });
        
      if (allSalaryError) {
        console.error('Error fetching all salary records:', allSalaryError);
      } else {
        console.log('All salary records:', allSalaryRecords);
        
        if (allSalaryRecords && allSalaryRecords.length > 0) {
          // Find all available years in the salary data
          const years = new Set<number>();
          allSalaryRecords.forEach(record => {
            if (record.month) {
              const yearMatch = String(record.month).match(/\b(20\d{2})\b/);
              if (yearMatch && yearMatch[1]) {
                years.add(parseInt(yearMatch[1]));
              }
            }
          });
          
          // Add current year if it doesn't exist in records
          years.add(currentYear);
          
          // Set available years in descending order (newest first)
          setAvailableYears(Array.from(years).sort((a, b) => b - a));
          
          // Store debug info
          setDebugInfo(`Found ${allSalaryRecords.length} total salary records. 
            Most recent: ${JSON.stringify(allSalaryRecords[0])}
            Available years: ${Array.from(years).join(', ')}`);
          
          // Check if we have the current month data in ANY format
          const year = currentYear;
          const month = currentMonth;
          
          // Define possible month formats we're looking for
          const targetFormats = [
            `${year}-${String(month).padStart(2, '0')}`, // 2025-03
            `${year}-${month}`,                         // 2025-3
            `${month}/${year}`,                         // 3/2025
            `${String(month).padStart(2, '0')}/${year}`, // 03/2025
            `${month}-${year}`,                         // 3-2025
            `${String(month).padStart(2, '0')}-${year}` // 03-2025
          ];
          
          // Find a record that matches any of these formats
          const currentMonthRecord = allSalaryRecords.find(record => {
            if (!record.month) return false;
            const monthStr = String(record.month).trim();
            return targetFormats.some(format => 
              monthStr === format || monthStr.startsWith(format + '-') || monthStr.includes(format)
            );
          });
          
          if (currentMonthRecord) {
            console.log('Found current month record:', currentMonthRecord);
            setCurrentSalary(currentMonthRecord.total_salary);
          } else {
            console.log('No current month record found. Formats searched:', targetFormats);
            // Default to the most recent record if we can't find the current month
            const mostRecent = allSalaryRecords[0];
            console.log('Using most recent record instead:', mostRecent);
            setCurrentSalary(mostRecent.total_salary);
          }
          
          // Calculate yearly total by filtering and summing records for the selected year
          const yearRecords = allSalaryRecords.filter(record => {
            if (!record.month) return false;
            const monthStr = String(record.month).trim();
            // Check if the record's month string contains the selected year
            return monthStr.includes(String(selectedYear));
          });
          
          if (yearRecords.length > 0) {
            // Calculate total and organize monthly data
            const yearlySum = yearRecords.reduce((sum, record) => sum + (record.total_salary || 0), 0);
            setYearlyTotal(yearlySum);
            
            // Prepare monthly breakdown for display
            const monthlyData = [];
            for (let m = 1; m <= 12; m++) {
              const monthRecords = yearRecords.filter(record => {
                const monthStr = String(record.month).trim();
                const monthFormats = [
                  `${selectedYear}-${String(m).padStart(2, '0')}`,
                  `${selectedYear}-${m}`,
                  `${m}/${selectedYear}`,
                  `${String(m).padStart(2, '0')}/${selectedYear}`,
                  `${m}-${selectedYear}`,
                  `${String(m).padStart(2, '0')}-${selectedYear}`
                ];
                return monthFormats.some(format => 
                  monthStr === format || monthStr.startsWith(format + '-') || monthStr.includes(format)
                );
              });
              
              if (monthRecords.length > 0) {
                const monthTotal = monthRecords.reduce((sum, record) => sum + (record.total_salary || 0), 0);
                const monthName = new Date(selectedYear, m-1, 1).toLocaleString('default', { month: 'long' });
                monthlyData.push({
                  month: m,
                  name: monthName,
                  total: monthTotal
                });
              }
            }
            
            setMonthlySalaries(monthlyData);
            console.log('Monthly breakdown:', monthlyData);
          } else {
            console.log('No records found for selected year:', selectedYear);
            setYearlyTotal(null);
            setMonthlySalaries([]);
          }
        } else {
          console.log('No salary records found at all');
          setCurrentSalary(null);
          setYearlyTotal(null);
          setMonthlySalaries([]);
        }
      }
      
      // Fetch leave balance
      const leaveBalanceResult = await leaveService.calculateLeaveBalance(userId, currentYear);
      
      if (leaveBalanceResult.error) {
        console.error('Error calculating leave balance:', leaveBalanceResult.error);
      } else {
        setRemainingLeave(leaveBalanceResult.remainingBalance);
      }
      
      // Additionally, fetch shift data for stats and upcoming shifts
      await fetchShiftData(userId);
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'An error occurred while fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchShiftData = async (userId: string | undefined) => {
    if (!userId) return;
    
    try {
      // Get the current month's shifts
      const startDate = new Date(currentYear, new Date().getMonth(), 1);
      const endDate = new Date(currentYear, new Date().getMonth() + 1, 0);
      
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', userId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));
        
      if (shiftsError) throw shiftsError;
      
      // Calculate stats
      const totalShifts = shiftsData?.length || 0;
      let overtimeHours = 0;
      let shiftChanges = 0;
      
      shiftsData?.forEach(shift => {
        if (shift.shift_type === 'Overtime') {
          overtimeHours += 4; // Assuming 4 hours per overtime shift
        }
        if (shift.source === 'manual') {
          shiftChanges++;
        }
      });
      
      // Estimate monthly earnings (simplified calculation)
      const baseRate = employee?.hourly_rate || 20; // Default to $20/hr if not set
      const regularHours = totalShifts * 8; // 8 hours per regular shift
      const overtimeRate = baseRate * 1.5;
      
      const monthlyEarnings = (regularHours * baseRate) + (overtimeHours * overtimeRate);
      
      setStats({
        totalShifts,
        monthlyEarnings,
        overtimeHours,
        shiftChanges
      });
      
      // Generate upcoming shifts (next 5 days)
      const upcoming: UpcomingShift[] = [];
      const today = new Date();
      
      // Simplified approach - in a real app you'd fetch actual upcoming shifts
      for (let i = 0; i < 5; i++) {
        const date = addDays(today, i);
        const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
        
        // Skip weekends in this simple example
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        // Find if there's an override for this date
        const dateStr = format(date, 'yyyy-MM-dd');
        const override = shiftsData?.find(s => s.date === dateStr);
        
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
      
      setUpcomingShifts(upcoming);
      
    } catch (err) {
      console.error('Error fetching shift data:', err);
      // Don't show error to user, just log it
    }
  };
  
  // Handler for changing the selected year
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };
  
  // Go to previous year
  const goToPreviousYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentIndex + 1]);
    }
  };
  
  // Go to next year
  const goToNextYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1]);
    }
  };
  
  // Add new function to download yearly PDF
  const handleDownloadPDF = async () => {
    try {
      if (!employee) {
        toast.error('Employee data not found');
        return;
      }
      
      setPdfLoading(true);
      
      // Get the session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        toast.error('Authentication error. Please sign in again.');
        setPdfLoading(false);
        return;
      }
      
      // Fetch yearly data from API
      const response = await fetch(`/api/salary-yearly?employee_id=${employee.id}&year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch yearly salary data');
      }
      
      const yearlyData = await response.json();
      
      // Generate PDF
      const pdfDocument = (
        <YearlySalaryPDF
          employee={employee}
          year={yearlyData.year}
          totalSalary={yearlyData.totalSalary}
          averageSalary={yearlyData.averageSalary}
          monthlyBreakdown={yearlyData.monthlyBreakdown}
        />
      );
      
      const pdfBlob = await pdf(pdfDocument).toBlob();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${employee.name}_yearly_salary_${selectedYear}.pdf`;
      link.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success('Yearly salary report downloaded successfully');
    } catch (error) {
      console.error('Error generating yearly PDF:', error);
      toast.error(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPdfLoading(false);
    }
  };
  
  if (loading) {
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
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-500 bg-opacity-20 text-red-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>{error}</p>
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
          <StatsPanel stats={stats} isLoading={loading} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upcoming Shifts */}
            <div className="md:col-span-1">
              <UpcomingShifts shifts={upcomingShifts} isLoading={loading} />
              
              {/* Leave Balance */}
              <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6">
                <h2 className="text-lg font-semibold mb-4 text-white">Leave Balance</h2>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Annual Leave</span>
                  <span className="text-white font-medium">{remainingLeave || 0} days</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: `${Math.min(100, ((remainingLeave || 0) / 30) * 100)}%` }}
                  ></div>
                </div>
                <Link href="/leave" className="text-blue-400 hover:text-blue-300 text-sm flex justify-center items-center mt-3">
                  Request Leave
                </Link>
              </div>
            </div>
            
            {/* Salary Chart */}
            <div className="md:col-span-2">
              <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Salary History</h2>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setSelectedYear(selectedYear - 1)}
                      disabled={!availableYears.includes(selectedYear - 1)}
                      className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                    >
                      <FiChevronLeft />
                    </button>
                    <span className="text-gray-300">{selectedYear}</span>
                    <button 
                      onClick={() => setSelectedYear(selectedYear + 1)}
                      disabled={!availableYears.includes(selectedYear + 1)}
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
                
                {/* Salary chart component would go here */}
                <div className="h-64 w-full">
                  {/* Existing chart code */}
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Yearly Total</p>
                    <p className="text-xl font-bold text-white">${yearlyTotal?.toLocaleString() || '0'}</p>
                  </div>
                  <Link href="/salary" className="text-blue-400 hover:text-blue-300 text-sm flex items-center">
                    View Details <FiArrowRight className="ml-1" />
                  </Link>
                </div>
              </div>
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
                  <p className="text-sm text-gray-400">Payment details</p>
                </div>
              </div>
            </Link>
            
            <Link href="/leave" className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-yellow-500 bg-opacity-20 flex items-center justify-center mr-3">
                  <FiCalendar className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Leave</h3>
                  <p className="text-sm text-gray-400">Request time off</p>
                </div>
              </div>
            </Link>
            
            <Link href="/reports" className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center mr-3">
                  <FiPieChart className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Reports</h3>
                  <p className="text-sm text-gray-400">View analytics</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </Layout>
  );
} 