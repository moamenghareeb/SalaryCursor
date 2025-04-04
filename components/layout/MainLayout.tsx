import React, { ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import Header from './Header';
import { useAuth } from '../../lib/authContext';
import MobileLayout from '../MobileLayout';
import { isMobileDevice } from '../../lib/pwaUtils';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function MainLayout({ children, title = 'SalaryCursor' }: MainLayoutProps) {
  const { loading } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile on the client side
  useEffect(() => {
    setIsMobile(isMobileDevice() || window.innerWidth < 640);
    
    const handleResize = () => {
      setIsMobile(isMobileDevice() || window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-apple-gray-light dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }
  
  // Use MobileLayout for mobile devices
  if (isMobile || process.env.NEXT_PUBLIC_ENABLE_MOBILE_LAYOUT === 'true') {
    return (
      <>
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
        <MobileLayout>{children}</MobileLayout>
      </>
    );
  }

  // Desktop layout
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
    </div>
  );
}
