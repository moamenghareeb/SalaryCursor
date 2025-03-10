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

export default function Dashboard({ initialData }: DashboardProps) {
  const { isDarkMode } = useTheme();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  
  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Use SWR for client-side data fetching with initialData from SSR
  const { data, error, isLoading } = useData<DashboardData>(
    isClient && !authLoading && user ? '/api/dashboard/summary' : null,
    {
      fallbackData: initialData,
      revalidateOnMount: true,
    }
  );

  // Extract data from SWR response
  const employee = data?.employee || null;
  const latestSalary = data?.latestSalary || null;
  const leaveBalance = data?.leaveBalance || 0;
  const leaveTaken = data?.leaveTaken || 0;
  const inLieuSummary = data?.inLieuSummary || { count: 0, daysAdded: 0 };

  // Format currency values
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'EGP 0';
    return `EGP ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  // Show loading state until component mounts on client side or while auth is loading
  if (!isClient || authLoading) {
    return (
      <Layout>
        <Head>
          <title>Dashboard | SalaryCursor</title>
        </Head>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
          <span className="ml-3 text-apple-gray">Loading dashboard...</span>
        </div>
      </Layout>
    );
  }
  
  // If the user is not authenticated after auth loading completes, redirect to login
  if (!authLoading && (!user || !session)) {
    // Use useEffect for client-side navigation to prevent React warning
    useEffect(() => {
      router.replace('/login');
    }, [router]);
    
    return (
      <Layout>
        <Head>
          <title>Redirecting... | SalaryCursor</title>
        </Head>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
          <span className="ml-3 text-apple-gray">Redirecting to login...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Dashboard | SalaryCursor</title>
      </Head>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
          <span className="ml-3 text-apple-gray">Loading your data...</span>
        </div>
      ) : (
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
              <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">Annual Leave Balance</h2>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{leaveBalance?.toFixed(2) || '0.00'} days</p>
                <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                  {leaveTaken} days taken this year
                </p>
                <Link href="/leave" className="mt-4 inline-block text-sm text-apple-blue hover:underline">
                  Request Leave →
                </Link>
              </div>
            </div>

            {/* In-Lieu Time Card */}
            <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
              <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">In-Lieu Time</h2>
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">{inLieuSummary?.count || 0} records</p>
                <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                  {inLieuSummary?.daysAdded || 0} days added to leave balance
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
      )}
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