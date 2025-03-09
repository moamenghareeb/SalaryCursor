import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import LeaveCalendar from '../components/LeaveCalendar';

const LeaveCalendarPage: NextPage = () => {
  return (
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
};

export default LeaveCalendarPage; 