import React, { ReactNode } from 'react';
import Head from 'next/head';
import Header from './Header';
import { useAuth } from '../../lib/authContext';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function MainLayout({ children, title = 'SalaryCursor' }: MainLayoutProps) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-apple-gray-light dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-gray-light dark:bg-dark-bg">
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#0066cc" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SalaryCursor" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </Head>
      
      <Header />
      
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fadeIn">
        {children}
      </main>
      
      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface shadow-t border-t border-gray-200 dark:border-dark-border z-40 sm:hidden">
        <div className="flex justify-around">
          <a 
            href="/dashboard" 
            className="flex flex-col items-center justify-center py-2 px-2 flex-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Dashboard</span>
          </a>
          
          <a 
            href="/salary" 
            className="flex flex-col items-center justify-center py-2 px-2 flex-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1">Salary</span>
          </a>
          
          <a 
            href="/leave" 
            className="flex flex-col items-center justify-center py-2 px-2 flex-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">Leave</span>
          </a>
          
          <a 
            href="/schedule" 
            className="flex flex-col items-center justify-center py-2 px-2 flex-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">Schedule</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
