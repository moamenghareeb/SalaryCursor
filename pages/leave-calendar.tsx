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
  const { user, session, loading } = useAuth();
  const { isDarkMode } = useTheme();
  
  // Check auth on client side
  useEffect(() => {
    setIsClient(true);
    
    // Check session if auth context is done loading
    if (!loading && (!user || !session)) {
      window.location.href = '/login';
    }
  }, [user, session, loading]);
  
  // Show loading state until client-side rendering is available
  if (!isClient || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
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
          <LeaveCalendar />
        </div>
      </div>
    </Layout>
  );
};

export default LeaveCalendarPage; 