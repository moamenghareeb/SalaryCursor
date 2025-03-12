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
      
    } catch (error: any) {
      console.error('Error in fetchDashboardData:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
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
  const downloadYearlyPDF = async () => {
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
        <title>Dashboard - SalaryCursor</title>
        <meta name="description" content="View your salary and leave summary" />
      </Head>
      
      <div className="px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-6">
            <p>{error}</p>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
            >
              Go to Login
            </button>
          </div>
        )}
        
        {/* Debug info - only visible during development */}
        {process.env.NODE_ENV !== 'production' && debugInfo && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-md mb-6 text-xs font-mono overflow-auto">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <pre>{debugInfo}</pre>
          </div>
        )}
        
        {/* Header section */}
        <section className="mb-8">
          <h1 className="text-3xl font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">Dashboard</h1>
          <p className="text-apple-gray dark:text-dark-text-secondary">
            Welcome back, {employee?.name || 'User'}
          </p>
        </section>
        
        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Salary Card */}
          <div className={`rounded-apple p-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} shadow-apple-card dark:shadow-dark-card`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">Current Month Salary</h2>
                <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <FiDollarSign className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-3xl font-bold text-apple-gray-dark dark:text-dark-text-primary">
                EGP {currentSalary ? currentSalary.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0.00'}
              </p>
              {!currentSalary && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  No salary recorded for current month
                </p>
              )}
            </div>
            
            <div className="mt-6">
              <Link 
                href="/salary" 
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                <span>Go to Salary Management</span>
                <FiArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>
          
          {/* Leave Balance Card */}
          <div className={`rounded-apple p-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} shadow-apple-card dark:shadow-dark-card`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">Leave Balance</h2>
                <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                  Available as of {new Date().toLocaleDateString()}
                </p>
              </div>
              <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <FiCalendar className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-3xl font-bold text-apple-gray-dark dark:text-dark-text-primary">
                {remainingLeave !== null ? remainingLeave.toFixed(2) : '0.00'} days
              </p>
              {remainingLeave === null && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  Unable to calculate leave balance
                </p>
              )}
            </div>
            
            <div className="mt-6">
              <Link 
                href="/leave" 
                className="flex items-center text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
              >
                <span>Go to Leave Management</span>
                <FiArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Yearly Salary Summary Card */}
        <div className={`rounded-apple p-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} shadow-apple-card dark:shadow-dark-card mb-6`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">Yearly Salary Summary</h2>
              
              {/* Year selector */}
              <div className="flex items-center mt-2 space-x-2">
                <button 
                  onClick={goToPreviousYear}
                  disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
                  className={`p-1 rounded-full ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  } ${
                    availableYears.indexOf(selectedYear) === availableYears.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                >
                  <FiChevronLeft className="w-4 h-4 text-apple-gray-dark dark:text-dark-text-secondary" />
                </button>
                
                <div className="relative">
                  <select 
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className={`appearance-none bg-transparent pr-8 pl-2 py-1 rounded-md border ${
                      isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-1 focus:ring-purple-500`}
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <button 
                  onClick={goToNextYear}
                  disabled={availableYears.indexOf(selectedYear) === 0}
                  className={`p-1 rounded-full ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  } ${
                    availableYears.indexOf(selectedYear) === 0 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                >
                  <FiChevronRight className="w-4 h-4 text-apple-gray-dark dark:text-dark-text-secondary" />
                </button>
                
                {/* Download PDF Button */}
                <button 
                  onClick={downloadYearlyPDF}
                  disabled={pdfLoading || !yearlyTotal}
                  className={`ml-2 flex items-center px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    isDarkMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  } ${
                    (pdfLoading || !yearlyTotal) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {pdfLoading ? (
                    <LoadingSpinner size="small" className="mr-1" />
                  ) : (
                    <FiDownload className="mr-1 w-3 h-3" />
                  )}
                  <span>PDF</span>
                </button>
              </div>
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
              <FiPieChart className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-3xl font-bold text-apple-gray-dark dark:text-dark-text-primary">
              EGP {yearlyTotal ? yearlyTotal.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0.00'}
            </p>
            {!yearlyTotal && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                No salary records found for {selectedYear}
              </p>
            )}
          </div>
          
          {/* Monthly Breakdown */}
          {monthlySalaries.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-3">Monthly Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {monthlySalaries.map((item) => (
                  <div key={item.month} className="p-3 rounded-md bg-gray-50 dark:bg-dark-surface/60">
                    <p className="text-xs text-apple-gray dark:text-dark-text-secondary">{item.name}</p>
                    <p className="font-medium text-apple-gray-dark dark:text-dark-text-primary">
                      EGP {item.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 