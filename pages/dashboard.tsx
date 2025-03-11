import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import { useTheme } from '../lib/themeContext';
import { useRouter } from 'next/router';
import LoadingSpinner from '../components/LoadingSpinner';
import Link from 'next/link';
import { FiCalendar, FiDollarSign, FiArrowRight } from 'react-icons/fi';
import { leaveService } from '../lib/leaveService';

export default function Dashboard() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [employee, setEmployee] = useState<any>(null);
  const [currentSalary, setCurrentSalary] = useState<number | null>(null);
  const [remainingLeave, setRemainingLeave] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
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
          // Store debug info
          setDebugInfo(`Found ${allSalaryRecords.length} total salary records. 
            Most recent: ${JSON.stringify(allSalaryRecords[0])}`);
          
          // Check if we have March 2025 data in ANY format
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1; // 1-12 format
          
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
          const marchRecord = allSalaryRecords.find(record => {
            if (!record.month) return false;
            const monthStr = String(record.month).trim();
            return targetFormats.some(format => 
              monthStr === format || monthStr.startsWith(format + '-') || monthStr.includes(format)
            );
          });
          
          if (marchRecord) {
            console.log('Found March 2025 record:', marchRecord);
            setCurrentSalary(marchRecord.total_salary);
          } else {
            console.log('No March 2025 record found. Formats searched:', targetFormats);
            // Default to the most recent record if we can't find the current month
            const mostRecent = allSalaryRecords[0];
            console.log('Using most recent record instead:', mostRecent);
            setCurrentSalary(mostRecent.total_salary);
          }
        } else {
          console.log('No salary records found at all');
          setCurrentSalary(null);
        }
      }
      
      // Fetch leave balance
      const currentYear = currentDate.getFullYear();
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
        <div className="grid gap-6 md:grid-cols-2">
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
      </div>
    </Layout>
  );
} 