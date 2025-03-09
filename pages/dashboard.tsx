import { GetServerSideProps } from 'next';
import ProtectedRoute from '../components/ProtectedRoute';
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

type DashboardProps = {
  initialData: {
    employee: Employee | null;
    latestSalary: Salary | null;
    leaveBalance: number | null;
    leaveTaken: number;
    inLieuSummary: { count: number; daysAdded: number };
  };
};

export default function Dashboard({ initialData }: DashboardProps) {
  const { isDarkMode } = useTheme();
  
  // Use SWR for client-side data fetching with initialData from SSR
  const { data, error, isLoading } = useData<typeof initialData>(
    '/api/dashboard/summary',
    {
      fallbackData: initialData,
      revalidateOnMount: true,
    }
  );

  // Extract data from SWR response
  const employee = data?.employee || null;
  const latestSalary = data?.latestSalary || null;
  const leaveBalance = data?.leaveBalance || null;
  const leaveTaken = data?.leaveTaken || 0;
  const inLieuSummary = data?.inLieuSummary || { count: 0, daysAdded: 0 };

  return (
    <ProtectedRoute>
      <Layout>
        <Head>
          <title>Dashboard | SalaryCursor</title>
        </Head>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Welcome message */}
            <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 animate-fadeIn">
              <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
                Welcome, {employee?.first_name} {employee?.last_name}
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
                    <p className="text-2xl font-bold text-apple-blue">${latestSalary.total_salary.toFixed(2)}</p>
                    <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                      {latestSalary.month}
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
                {leaveBalance !== null ? (
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-500">{leaveBalance.toFixed(2)} days</p>
                    <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                      {leaveTaken} days taken this year
                    </p>
                    <Link href="/leave" className="mt-4 inline-block text-sm text-apple-blue hover:underline">
                      Request Leave →
                    </Link>
                  </div>
                ) : (
                  <p className="text-apple-gray dark:text-dark-text-secondary">Leave balance not available</p>
                )}
              </div>

              {/* In-Lieu Time Card */}
              <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
                <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">In-Lieu Time</h2>
                <div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">{inLieuSummary.count} records</p>
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                    {inLieuSummary.daysAdded} days added to leave balance
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
    </ProtectedRoute>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Get the auth cookie from the request
  const authCookie = context.req.cookies['sb-access-token'] || context.req.cookies['supabase-auth-token'];
  
  // Default initial data
  const initialData = {
    employee: null,
    latestSalary: null,
    leaveBalance: null,
    leaveTaken: 0,
    inLieuSummary: { count: 0, daysAdded: 0 },
  };
  
  // If no auth cookie, redirect to login
  if (!authCookie) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  try {
    // Extract token from cookie
    let token = authCookie;
    if (authCookie.startsWith('[')) {
      try {
        const parsedCookie = JSON.parse(authCookie);
        token = parsedCookie[0].token;
      } catch (error) {
        console.error('Error parsing auth cookie:', error);
      }
    }
    
    // Get user from token
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }
    
    const userId = userData.user.id;
    
    // Fetch employee details
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!employeeError && employeeData) {
      initialData.employee = employeeData;
    }
    
    // Fetch latest salary
    const { data: salaryData, error: salaryError } = await supabase
      .from('salaries')
      .select('*')
      .eq('employee_id', userId)
      .order('month', { ascending: false })
      .limit(1)
      .single();
    
    if (!salaryError && salaryData) {
      initialData.latestSalary = salaryData;
    }
    
    // Calculate leave balance
    const baseLeave = employeeData?.years_of_service >= 10 ? 24.67 : 18.67;
    
    // Get leave taken
    const currentYear = new Date().getFullYear();
    const { data: leaveTakenData, error: leaveTakenError } = await supabase
      .from('leave_requests')
      .select('duration')
      .eq('employee_id', userId)
      .eq('status', 'approved')
      .gte('start_date', `${currentYear}-01-01`)
      .lte('end_date', `${currentYear}-12-31`);
    
    let leaveTaken = 0;
    if (!leaveTakenError && leaveTakenData) {
      leaveTaken = leaveTakenData.reduce((total, leave) => total + leave.duration, 0);
      initialData.leaveTaken = leaveTaken;
    }
    
    // Get in-lieu records
    const { data: inLieuData, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .select('*')
      .eq('employee_id', userId);
    
    let inLieuDaysAdded = 0;
    if (!inLieuError && inLieuData) {
      inLieuDaysAdded = inLieuData.reduce((total, record) => total + record.days_added, 0);
      initialData.inLieuSummary = {
        count: inLieuData.length,
        daysAdded: inLieuDaysAdded,
      };
    }
    
    // Calculate final leave balance
    if (baseLeave !== null) {
      initialData.leaveBalance = baseLeave + inLieuDaysAdded - leaveTaken;
    }
    
    return {
      props: {
        initialData,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        initialData,
      },
    };
  }
}; 