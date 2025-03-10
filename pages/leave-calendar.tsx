import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';
import LeaveCalendar from '../components/LeaveCalendar';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

const LeaveCalendarPage: NextPage = () => {
  const [isClient, setIsClient] = useState(false);
  const { user, session, loading } = useAuth();
  
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
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
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
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 animate-fadeIn">
          <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
            Leave Calendar
          </h1>
          <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
            View, manage, and request leaves using the calendar interface. Select dates to request new leave.
          </p>
        </div>
        
        <LeaveCalendar />
      </div>
    </Layout>
  );
};

export default LeaveCalendarPage; 