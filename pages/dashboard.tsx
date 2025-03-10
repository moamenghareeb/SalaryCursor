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
import { useData } from '../lib/swr';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import useSWR from 'swr';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';

type DashboardData = {
  employee: Employee | null;
  latestSalary: Salary | null;
  leaveBalance: number;
  leaveTaken: number;
  inLieuSummary: { count: number; daysAdded: 0 };
};

type DashboardProps = {
  initialData: DashboardData;
};

export default function Dashboard() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
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

  // Define fetcher inside the component using session from useAuth
  const fetcher = async (url: string) => {
    console.log('Dashboard fetcher session:', session);
    if (!session) {
      throw new Error('Your session has expired. Please log in again.');
    }
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    return response.data;
  };

  const { data, error, mutate } = useSWR(
    session ? '/api/dashboard/summary' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      shouldRetryOnError: true,
      errorRetryCount: maxRetries,
      dedupingInterval: 10000,
      errorRetryInterval: retryDelay,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (error.response?.status === 404 || error.response?.status === 401) {
          return;
        }
        if (retryCount >= maxRetries) {
          return;
        }
        setTimeout(() => {
          setRetryCount(retryCount);
          revalidate({ retryCount });
        }, retryDelay * Math.pow(2, retryCount));
      }
    }
  );

  // Debug log to check the data received from the API
  useEffect(() => {
    if (data) {
      console.log('Dashboard data received:', {
        leaveBalance: data.leaveBalance, 
        leaveTaken: data.leaveTaken,
        inLieuSummary: data.inLieuSummary
      });
    }
  }, [data]);

  // Force refresh the dashboard data when the component loads and periodically
  useEffect(() => {
    if (session) {
      console.log('Initial dashboard data refresh...');
      mutate();
      
      const intervalId = setInterval(() => {
        console.log('Periodic dashboard data refresh...');
        mutate();
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [session, mutate]);

  // Add another useEffect to refresh data when returning from other pages
  useEffect(() => {
    const handleRouteChange = () => {
      if (session) {
        console.log('Route changed, refreshing dashboard data...');
        mutate();
      }
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, session, mutate]);

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
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
          <div className="text-red-500 dark:text-red-400 mb-4">
            {error.response?.status === 401 ? 'Your session has expired. Please log in again.' :
             error.response?.status === 404 ? 'Employee data not found. Please contact HR.' :
             error.response?.status === 429 ? 'Too many requests. Please try again in a moment.' :
             error.message || 'Failed to load dashboard data. Please try again.'}
          </div>
          <button
            onClick={() => {
              if (retryCount < maxRetries) {
                setRetryCount(prev => prev + 1);
                mutate();
              } else {
                setRetryCount(0);
                mutate();
              }
            }}
            className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
          >
            {retryCount >= maxRetries ? 'Try Again' : 'Retry'}
          </button>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  const { employee, latestSalary, leaveBalance, leaveTaken, inLieuSummary } = data;

  return (
    <Layout>
      <Head>
        <title>Dashboard | SalaryCursor</title>
      </Head>
      <div className="space-y-6">
        {/* Welcome message */}
        <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 animate-fadeIn">
          <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
            Welcome, {employee?.name || 'User'}
          </h1>
          <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
            Here's an overview of your salary and leave information.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Salary Card */}
          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
            <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">Latest Salary</h2>
            {latestSalary ? (
              <div>
                <div className="text-2xl font-bold text-apple-blue dark:text-blue-400">
                  {formatCurrency(latestSalary?.total_salary)}
                </div>
                <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                  {latestSalary.month || 'N/A'}
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
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{data?.leaveBalance?.toFixed(2) || '0.00'} days</p>
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
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
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
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (context) => {
  // Default initial data with empty values to prevent null errors
  const initialData: DashboardData = {
    employee: null,
    latestSalary: null,
    leaveBalance: 0,
    leaveTaken: 0,
    inLieuSummary: { count: 0, daysAdded: 0 },
  };
  
  // Return the initial (empty) data structure
  // Authentication will be handled client-side
  return {
    props: {
      initialData,
    },
  };
}; 