import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';
import LeaveCalendar from '../components/LeaveCalendar';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import LoadingSpinner from '../components/LoadingSpinner';

const LeaveCalendarPage: NextPage = () => {
  const [isClient, setIsClient] = useState(false);
  const { user, session, loading: authLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Check auth on client side
  useEffect(() => {
    setIsClient(true);
    
    // Check session if auth context is done loading
    if (!authLoading && (!user || !session)) {
      window.location.href = '/login';
    }
  }, [user, session, authLoading]);

  // Handle retry
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setError(null);
    }
  };
  
  // Show loading state until client-side rendering is available
  if (!isClient || authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  // Show error state if authentication failed
  if (!user || !session) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-red-500 mb-4">Authentication required</div>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
          >
            Go to Login
          </button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>Leave Calendar | SalaryCursor</title>
        <meta name="description" content="View and manage your leave requests using a calendar interface" />
      </Head>
      
      <div className="space-y-6 animate-fadeIn">
        <div className={`rounded-apple p-6 ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white'} shadow-apple-card dark:shadow-dark-card`}>
          <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
            Leave Calendar
          </h1>
          <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
            View, manage, and request leaves using the calendar interface. Select dates to request new leave.
          </p>
        </div>
        
        <div className={`rounded-apple shadow-apple-card ${isDarkMode ? 'dark:shadow-dark-card' : ''}`}>
          <LeaveCalendar key={retryCount} />
        </div>
      </div>
    </Layout>
  );
};

export default LeaveCalendarPage; 