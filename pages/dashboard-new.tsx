import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import axios from 'axios';
import { formatCurrency } from '../utils/formatters';

// Simple type definitions
type DashboardData = {
  employee: {
    id: string;
    name: string;
    email: string;
    annual_leave_balance: number;
  } | null;
  salary: {
    id: string;
    month: string;
    total_salary: number;
  } | null;
  leave: {
    baseBalance: number;
    inLieuDays: number;
    daysTaken: number;
    remainingBalance: number;
    leaveRecords: Array<{
      id: string;
      start_date: string;
      end_date: string;
      days_taken: number;
      leave_type: string;
      status: string;
    }>;
  };
};

export default function NewDashboard() {
  const { user, session, loading: authLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Simple data fetching function with minimal complexity
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session) {
        throw new Error('No active session. Please log in.');
      }

      console.log('Fetching dashboard data...');
      const response = await axios.get('/api/dashboard-direct', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      console.log('Dashboard API response:', response.data);
      setData(response.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when session is available
  useEffect(() => {
    if (!authLoading && session) {
      fetchDashboardData();
    }
  }, [authLoading, session]);

  if (authLoading || (loading && !data)) {
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
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-md">
            <h2 className="text-lg font-medium">Error loading dashboard</h2>
            <p className="mt-1">{error}</p>
            <button
              onClick={fetchDashboardData}
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
            Welcome, {data?.employee?.name || user?.email || 'User'}
          </h1>
          <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
            Here's an overview of your salary and leave information.
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Salary Card */}
          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
            <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">
              Latest Salary
            </h2>
            {data?.salary ? (
              <div>
                <div className="text-2xl font-bold text-apple-blue dark:text-blue-400">
                  {formatCurrency(data.salary.total_salary)}
                </div>
                <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                  {data.salary.month || 'N/A'}
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
          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
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
                {data?.leave.remainingBalance.toFixed(2) || '0.00'} days
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-apple-gray dark:text-dark-text-secondary">Base Annual Leave:</span>
                  <span className="font-medium">{data?.leave.baseBalance.toFixed(2) || '0.00'} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-apple-gray dark:text-dark-text-secondary">In-Lieu Time Added:</span>
                  <span className="font-medium">{data?.leave.inLieuDays.toFixed(2) || '0.00'} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-apple-gray dark:text-dark-text-secondary">Leave Taken This Year:</span>
                  <span className="font-medium">{data?.leave.daysTaken.toFixed(2) || '0.00'} days</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200 dark:border-dark-border mt-1.5">
                  <span className="font-medium text-apple-gray-dark dark:text-dark-text-primary">Remaining Balance:</span>
                  <span className="font-medium">{data?.leave.remainingBalance.toFixed(2) || '0.00'} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Leave Card */}
          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
            <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">
              Recent Leave
            </h2>
            {data?.leave.leaveRecords && data.leave.leaveRecords.length > 0 ? (
              <div className="space-y-3">
                {data.leave.leaveRecords.slice(0, 2).map(record => (
                  <div key={record.id} className="flex justify-between pb-2 border-b border-gray-100 dark:border-dark-border">
                    <div>
                      <p className="text-sm font-medium">{new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}</p>
                      <p className="text-xs text-apple-gray dark:text-dark-text-secondary mt-0.5">{record.leave_type}</p>
                    </div>
                    <div className="text-sm font-medium">
                      {record.days_taken} day{record.days_taken !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
                <Link href="/leave" className="mt-2 inline-block text-sm text-apple-blue hover:underline">
                  View All Leave →
                </Link>
              </div>
            ) : (
              <p className="text-apple-gray dark:text-dark-text-secondary">No recent leave records</p>
            )}
          </div>
        </div>

        {/* Leave and Salary Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
            <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-4">
              Leave Overview
            </h2>
            {data?.leave.leaveRecords && data.leave.leaveRecords.length > 0 ? (
              <div className="min-h-[250px] flex flex-col justify-center">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-medium">Type</div>
                  <div className="text-sm font-medium">Days</div>
                </div>
                <div className="space-y-2">
                  {Object.entries(
                    data.leave.leaveRecords.reduce((acc, record) => {
                      const type = record.leave_type || 'Annual';
                      acc[type] = (acc[type] || 0) + record.days_taken;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, days]) => (
                    <div key={type} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ 
                            backgroundColor: 
                              type.toLowerCase().includes('annual') ? '#8884d8' : 
                              type.toLowerCase().includes('sick') ? '#ffc658' : 
                              type.toLowerCase().includes('casual') ? '#82ca9d' : '#ff8042' 
                          }}
                        ></div>
                        <span className="text-apple-gray-dark dark:text-dark-text-primary">{type}</span>
                      </div>
                      <span className="font-medium">{days} day{days !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-apple-gray dark:text-dark-text-secondary">
                <p>No leave data available</p>
                <p className="text-sm mt-2">Leave data will appear here once you have taken leave</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
            <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/leave"
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Request Leave</span>
              </Link>
              
              <Link 
                href="/leave#in-lieu"
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Add In-Lieu Time</span>
              </Link>
              
              <Link 
                href="/salary"
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">View Salary History</span>
              </Link>
              
              <Link 
                href="/profile"
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium">Update Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 