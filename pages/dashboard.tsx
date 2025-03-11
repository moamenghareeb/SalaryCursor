import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Salary, Leave, InLieuRecord } from '../types';
import Link from 'next/link';
import Head from 'next/head';
import SalaryTrendChart from '../components/SalaryTrendChart';
import LeaveTrendChart from '../components/LeaveTrendChart';
import { useTheme } from '../lib/themeContext';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import useSWR from 'swr';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'react-hot-toast';

// Define proper types for the debug data
interface DebugInfo {
  queries: string[];
  results: {
    inLieu?: {
      data: Array<{
        id: string;
        days_added?: number;
        leave_days_added?: number;
        status?: string;
        date?: string;
        [key: string]: any;
      }>;
      error?: any;
    };
    leaves?: {
      data: Array<{
        id: string;
        leave_type?: string;
        days_taken?: number;
        status?: string;
        start_date: string;
        end_date: string;
        [key: string]: any;
      }>;
      error?: any;
    };
    [key: string]: any;
  };
}

interface LeaveServiceDebug {
  baseLeaveBalance: number;
  inLieuBalance: number;
  leaveTaken: number;
  remainingBalance: number;
  error?: string;
  debug?: DebugInfo;
}

// Extend Employee type to include leave_balance
interface DashboardEmployee extends Employee {
  leave_balance?: number;
  annual_leave_balance?: number;
}

// Dashboard data structure - match exactly what the API returns
type DashboardData = {
  employee: DashboardEmployee | null;
  latestSalary: Salary | null;
  leaveBalance: number | null; // Remaining leave balance
  leaveTaken: number;
  inLieuSummary: { count: number; daysAdded: number };
  timestamp?: string; // API timestamp for debugging
  debug?: {
    leaveService?: LeaveServiceDebug;
    [key: string]: any;
  };
};

export default function Dashboard() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  const { user, session, loading: authLoading, refreshSession } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !session) {
      refreshSession();
      const timer = setTimeout(() => {
        if (!session) {
          router.push('/login');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, session, refreshSession, router]);

  // Custom fetcher with console logs at every step for debugging
  const fetcher = async (url: string) => {
    console.log('Dashboard fetcher started with session:', session ? 'valid' : 'none');
    
    if (!session) {
      throw new Error('Your session has expired. Please log in again.');
    }
    
    try {
      console.log(`Fetching ${url} with auth token...`);
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      // Add detailed logging to examine the exact response structure
      console.log('API response received - Full structure:', JSON.stringify(response.data, null, 2));
      console.log('Leave balance value:', response.data?.leaveBalance, 'Type:', typeof response.data?.leaveBalance);
      console.log('Employee base leave:', response.data?.employee?.annual_leave_balance);
      console.log('In lieu days added:', response.data?.inLieuSummary?.daysAdded);
      console.log('Leave taken:', response.data?.leaveTaken);
      
      // Validate the data structure
      if (response.data && typeof response.data.leaveBalance === 'number') {
        // Update last refreshed timestamp
        setLastRefreshed(new Date().toLocaleTimeString());
        return response.data;
      } else {
        console.error('Invalid data structure received:', response.data);
        throw new Error('Invalid data structure received from API');
      }
    } catch (error) {
      console.error('Fetcher error:', error);
      throw error;
    }
  };

  // No destructuring - keep data in SWR
  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardData>(
    session ? '/api/dashboard/summary' : null,
    fetcher,
    {
      revalidateOnFocus: false, // Disable revalidation on window focus
      revalidateOnMount: true,  // Only load data once on initial mount
      refreshInterval: 0,       // Disable automatic refreshing completely
      dedupingInterval: 30000,  // Prevent duplicate requests for 30 seconds
      errorRetryCount: 2,       // Reduce retry attempts
      errorRetryInterval: 5000, // Increase retry interval
      onSuccess: (data) => {
        // Update last refreshed timestamp
        setLastRefreshed(new Date().toLocaleTimeString());
        console.log('SWR success, data:', data);
      },
      onError: (error) => {
        console.error('SWR error:', error);
      }
    }
  );

  // Show debug mode toggle in development only
  const [showDebug, setShowDebug] = useState(false);
  const isDevMode = process.env.NODE_ENV === 'development';

  // Process data to ensure correct leave balance
  const processedData = useMemo(() => {
    if (!data) return null;
    
    // Instead of recalculating, log what we received from the API
    console.log('Dashboard received data from API:', {
      leaveBalance: data.leaveBalance,
      employeeBaseLeave: data.employee?.annual_leave_balance,
      inLieuDays: data.inLieuSummary?.daysAdded,
      daysTaken: data.leaveTaken
    });
    
    // Additional logging to help debug
    console.log('Leave calculation details:', {
      baseLeave: data.employee?.annual_leave_balance || 18.67,
      inLieuDays: data.inLieuSummary?.daysAdded || 0,
      daysTaken: data.leaveTaken || 0,
      formula: `${data.employee?.annual_leave_balance || 18.67} + ${data.inLieuSummary?.daysAdded || 0} - ${data.leaveTaken || 0} = ${((data.employee?.annual_leave_balance || 18.67) + (data.inLieuSummary?.daysAdded || 0) - (data.leaveTaken || 0)).toFixed(2)}`
    });
    
    // Trust the server calculation unless it's clearly invalid
    if (data.leaveBalance === null || data.leaveBalance === undefined || isNaN(data.leaveBalance)) {
      console.warn('Invalid leave balance received from API, falling back to manual calculation');
      
      // Only in this case, do a fallback calculation
      const baseLeave = data.employee?.annual_leave_balance || 18.67;
      const inLieuDays = data.inLieuSummary?.daysAdded || 0;
      const daysTaken = data.leaveTaken || 0;
      
      // Calculate the CORRECT balance as a fallback only
      const correctBalance = parseFloat((baseLeave + inLieuDays - daysTaken).toFixed(2));
      
      console.log('Fallback calculation performed:', {
        originalBalance: data.leaveBalance,
        fallbackBalance: correctBalance,
        calculation: `${baseLeave} + ${inLieuDays} - ${daysTaken} = ${correctBalance}`
      });
      
      // Return a new object with the corrected balance
      return {
        ...data,
        leaveBalance: correctBalance
      };
    }
    
    // In the normal case, trust the server calculation
    return data;
  }, [data]);
  
  // Use processedData instead of data from this point onwards
  const displayData = processedData || {
    employee: null,
    latestSalary: null,
    leaveBalance: 0,
    leaveTaken: 0,
    inLieuSummary: { count: 0, daysAdded: 0 }
  };

  if (!isClient || authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (error) {
    console.error('Dashboard render error:', error);
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-md">
            <h2 className="text-lg font-medium">Error loading dashboard</h2>
            <p className="mt-1">{error.message || 'Please try refreshing the page.'}</p>
            <button 
              onClick={() => mutate()} 
              className="mt-2 px-4 py-2 bg-red-100 dark:bg-red-800 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
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
        <title>Dashboard | SalaryCursor</title>
      </Head>
      
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fadeIn">
        {/* Header without refresh button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
              Welcome, {displayData?.employee?.name || 'User'}
            </h1>
            <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
              Here's an overview of your salary and leave information.
            </p>
          </div>
          {/* Refresh button has been removed completely as requested */}
        </div>
        
        {lastRefreshed && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: {lastRefreshed}</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Salary Card */}
              <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
                <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">Latest Salary</h2>
                {displayData?.latestSalary ? (
                  <div>
                    <div className="text-2xl font-bold text-apple-blue dark:text-blue-400">
                      {formatCurrency(displayData.latestSalary?.total_salary)}
                    </div>
                    <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                      {displayData.latestSalary.month || 'N/A'}
                    </p>
                    <Link href="/salary" className="mt-4 inline-block text-sm text-apple-blue hover:underline">
                      View Details →
                    </Link>
                  </div>
                ) : (
                  <p className="text-apple-gray dark:text-dark-text-secondary">No salary data available</p>
                )}
              </div>

              {/* Remaining Leave Balance Card */}
              <div className="bg-apple-gray-lightest dark:bg-dark-surface-2 rounded-apple p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">
                    Remaining Leave Balance
                  </h3>
                  <Link href="/leave" className="text-apple-blue hover:text-apple-blue-hover">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                    {displayData?.leaveBalance !== null && displayData?.leaveBalance !== undefined
                      ? (typeof displayData.leaveBalance === 'number' 
                          ? displayData.leaveBalance.toFixed(2) 
                          : '0.00')
                      : '0.00'} days
                    <span className="text-sm text-apple-gray dark:text-dark-text-secondary ml-2">
                      (Base + In-Lieu - Taken)
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-apple-gray dark:text-dark-text-secondary">
                    <div className="font-medium mb-1">Calculation Details:</div>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="flex justify-between">
                        <span>Base Annual Leave:</span>
                        <span className="font-mono">{displayData?.employee?.annual_leave_balance?.toFixed(2) || '0.00'} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>In-Lieu Time Added:</span>
                        <span className="font-mono">{displayData?.inLieuSummary?.daysAdded?.toFixed(2) || '0.00'} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Leave Taken This Year:</span>
                        <span className="font-mono">{displayData?.leaveTaken?.toFixed(2) || '0.00'} days</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-medium">
                        <span>Remaining Balance:</span>
                        <span className="font-mono">{displayData?.leaveBalance?.toFixed(2) || '0.00'} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Lieu Time Card */}
              <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">In-Lieu Time</h2>
                  {/* Refresh button removed as requested */}
                </div>
                <div>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">{displayData?.inLieuSummary?.count || 0} records</p>
                  </div>
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                    {displayData?.inLieuSummary?.daysAdded || 0} days added to leave balance
                  </p>
                  <Link href="/leave" className="mt-4 inline-block text-sm text-apple-blue hover:underline">
                    Manage In-Lieu Time →
                  </Link>
                </div>
              </div>
            </div>

            {/* Debug Panel - Only in development mode */}
            {isDevMode && (
              <div className="mt-8">
                <button 
                  onClick={() => setShowDebug(!showDebug)}
                  className="mb-4 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
                </button>
                
                {showDebug && displayData?.debug && (
                  <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg border-2 border-orange-500 overflow-auto max-h-[600px]">
                    <h2 className="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">Leave Balance Debug Information</h2>
                    
                    <div className="grid gap-4">
                      {/* Final Calculation Summary */}
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
                        <h3 className="font-bold text-lg mb-2">Final Calculation</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-gray-700 dark:text-gray-300">Dashboard leaveBalance:</div>
                          <div className="font-mono">{displayData?.leaveBalance !== null ? displayData.leaveBalance : 'null'}</div>
                          
                          <div className="text-gray-700 dark:text-gray-300">Leave Service Base Balance:</div>
                          <div className="font-mono">{displayData?.debug?.leaveService?.baseLeaveBalance || 'N/A'}</div>
                          
                          <div className="text-gray-700 dark:text-gray-300">Leave Service In-Lieu Balance:</div>
                          <div className="font-mono">{displayData?.debug?.leaveService?.inLieuBalance || 'N/A'}</div>
                          
                          <div className="text-gray-700 dark:text-gray-300">Leave Service Leave Taken:</div>
                          <div className="font-mono">{displayData?.debug?.leaveService?.leaveTaken || 'N/A'}</div>
                          
                          <div className="text-gray-700 dark:text-gray-300">Leave Service Remaining Balance:</div>
                          <div className="font-mono">{displayData?.debug?.leaveService?.remainingBalance || 'N/A'}</div>
                          
                          <div className="text-gray-700 dark:text-gray-300">Manual Calculation:</div>
                          <div className="font-mono">
                            {displayData?.debug?.leaveService ? 
                              `${displayData.debug.leaveService.baseLeaveBalance} + ${displayData.debug.leaveService.inLieuBalance} - ${displayData.debug.leaveService.leaveTaken} = ${
                                Number(displayData.debug.leaveService.baseLeaveBalance) + 
                                Number(displayData.debug.leaveService.inLieuBalance) - 
                                Number(displayData.debug.leaveService.leaveTaken)
                              }` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Employee Data */}
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
                        <h3 className="font-bold text-lg mb-2">Employee Record Data</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-gray-700 dark:text-gray-300">employee.leave_balance:</div>
                          <div className="font-mono">{displayData?.employee?.leave_balance !== undefined ? displayData.employee.leave_balance : 'N/A'}</div>
                          
                          <div className="text-gray-700 dark:text-gray-300">employee.annual_leave_balance:</div>
                          <div className="font-mono">{displayData?.employee?.annual_leave_balance !== undefined ? displayData.employee.annual_leave_balance : 'N/A'}</div>
                          
                          <div className="text-gray-700 dark:text-gray-300">employee.years_of_service:</div>
                          <div className="font-mono">{displayData?.employee?.years_of_service !== undefined ? displayData.employee.years_of_service : 'N/A'}</div>
                        </div>
                      </div>
                      
                      {/* Database Queries */}
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
                        <h3 className="font-bold text-lg mb-2">Database Queries Executed</h3>
                        <ul className="list-disc pl-5">
                          {displayData?.debug?.leaveService?.debug?.queries.map((query: string, index: number) => (
                            <li key={index} className="font-mono text-sm">{query}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* In-Lieu Records */}
                      {displayData?.debug?.leaveService?.debug?.results?.inLieu?.data && (
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
                          <h3 className="font-bold text-lg mb-2">In-Lieu Records ({displayData.debug.leaveService.debug.results.inLieu.data.length})</h3>
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-600">
                                <th className="px-2 py-1 text-left">ID</th>
                                <th className="px-2 py-1 text-left">days_added</th>
                                <th className="px-2 py-1 text-left">leave_days_added</th>
                                <th className="px-2 py-1 text-left">status</th>
                                <th className="px-2 py-1 text-left">date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayData.debug.leaveService.debug.results.inLieu.data.map((record: any, index: number) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}>
                                  <td className="px-2 py-1 font-mono">{record.id}</td>
                                  <td className="px-2 py-1 font-mono">{record.days_added !== undefined ? record.days_added : 'N/A'}</td>
                                  <td className="px-2 py-1 font-mono">{record.leave_days_added !== undefined ? record.leave_days_added : 'N/A'}</td>
                                  <td className="px-2 py-1 font-mono">{record.status || 'N/A'}</td>
                                  <td className="px-2 py-1 font-mono">{record.date || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Leave Records */}
                      {displayData?.debug?.leaveService?.debug?.results?.leaves?.data && (
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
                          <h3 className="font-bold text-lg mb-2">Leave Records ({displayData.debug.leaveService.debug.results.leaves.data.length})</h3>
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-600">
                                <th className="px-2 py-1 text-left">ID</th>
                                <th className="px-2 py-1 text-left">leave_type</th>
                                <th className="px-2 py-1 text-left">days_taken</th>
                                <th className="px-2 py-1 text-left">status</th>
                                <th className="px-2 py-1 text-left">dates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayData.debug.leaveService.debug.results.leaves.data.map((record: any, index: number) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}>
                                  <td className="px-2 py-1 font-mono">{record.id}</td>
                                  <td className="px-2 py-1 font-mono">{record.leave_type || 'N/A'}</td>
                                  <td className="px-2 py-1 font-mono">{record.days_taken !== undefined ? record.days_taken : 'N/A'}</td>
                                  <td className="px-2 py-1 font-mono">{record.status || 'N/A'}</td>
                                  <td className="px-2 py-1 font-mono">{record.start_date} to {record.end_date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* API Response Timestamp */}
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
                        <h3 className="font-bold text-lg mb-2">API Response Metadata</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-gray-700 dark:text-gray-300">Timestamp:</div>
                          <div className="font-mono">{displayData?.timestamp}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Data Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalaryTrendChart />
              <LeaveTrendChart />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

// Remove the incorrect getServerSideProps implementation
// The dashboard now uses client-side data fetching exclusively 