import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
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

// Dashboard data structure - match exactly what the API returns
type DashboardData = {
  employee: Employee | null;
  latestSalary: Salary | null;
  leaveBalance: number | null; // Remaining leave balance
  leaveTaken: number;
  inLieuSummary: { count: number; daysAdded: number };
  timestamp?: string; // API timestamp for debugging
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
      
      console.log('API response received:', response.data);
      
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
      revalidateOnFocus: true,
      revalidateOnMount: true,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000,
      errorRetryCount: maxRetries,
      errorRetryInterval: retryDelay,
      onSuccess: (data) => {
        console.log('SWR success, data:', data);
      },
      onError: (error) => {
        console.error('SWR error:', error);
      }
    }
  );

  // Manual refresh function with visual feedback
  const refreshData = async () => {
    console.log('Manual refresh triggered');
    try {
      await mutate();
      toast.success('Dashboard data refreshed');
    } catch (error) {
      console.error('Manual refresh error:', error);
      toast.error('Failed to refresh data');
    }
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
        {/* Header with refresh button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
              Welcome, {data?.employee?.name || 'User'}
            </h1>
            <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
              Here's an overview of your salary and leave information.
            </p>
          </div>
          <button
            onClick={refreshData}
            className="px-3 py-1.5 bg-apple-blue text-white rounded-md hover:bg-apple-blue-hover flex items-center"
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Refreshing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh All
              </>
            )}
          </button>
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
                {data?.latestSalary ? (
                  <div>
                    <div className="text-2xl font-bold text-apple-blue dark:text-blue-400">
                      {formatCurrency(data.latestSalary?.total_salary)}
                    </div>
                    <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                      {data.latestSalary.month || 'N/A'}
                    </p>
                    <Link href="/salary" className="mt-4 inline-block text-sm text-apple-blue hover:underline">
                      View Details →
                    </Link>
                  </div>
                ) : (
                  <p className="text-apple-gray dark:text-dark-text-secondary">No salary data available</p>
                )}
              </div>

              {/* Leave Balance Card */}
              <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Remaining Leave Balance</h2>
                  <button 
                    onClick={() => mutate()} 
                    title="Refresh leave balance" 
                    className="text-apple-blue hover:text-apple-blue-hover transition-colors"
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <span className="h-5 w-5 border-2 border-apple-blue border-t-transparent rounded-full animate-spin inline-block"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                </div>
                <div>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                      {data?.leaveBalance !== null && data?.leaveBalance !== undefined 
                        ? data.leaveBalance.toFixed(2) 
                        : '0.00'} days
                    </p>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Base + In-Lieu - Taken)</span>
                  </div>
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                    {data?.leaveTaken || 0} days taken this year
                  </p>
                  <Link href="/leave" className="mt-4 inline-block text-sm text-apple-blue hover:underline">
                    Request Leave →
                  </Link>
                </div>
              </div>

              {/* In-Lieu Time Card */}
              <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">In-Lieu Time</h2>
                  <button 
                    onClick={() => mutate()} 
                    title="Refresh in-lieu data" 
                    className="text-apple-blue hover:text-apple-blue-hover transition-colors"
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <span className="h-5 w-5 border-2 border-apple-blue border-t-transparent rounded-full animate-spin inline-block"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                </div>
                <div>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">{data?.inLieuSummary?.count || 0} records</p>
                  </div>
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                    {data?.inLieuSummary?.daysAdded || 0} days added to leave balance
                  </p>
                  <Link href="/leave" className="mt-4 inline-block text-sm text-apple-blue hover:underline">
                    Manage In-Lieu Time →
                  </Link>
                </div>
              </div>
            </div>

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