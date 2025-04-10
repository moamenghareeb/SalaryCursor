import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import PremiumThemeToggle from './PremiumThemeToggle';
import NotificationCenter from './NotificationCenter';
import RefreshButton from './RefreshButton';
import { motion } from 'framer-motion';
import { FiCalendar, FiDollarSign, FiClock, FiLogOut, FiHome } from 'react-icons/fi';

type MobileLayoutProps = {
  children: ReactNode;
};

export default function MobileLayout({ children }: MobileLayoutProps) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  // Handle scroll effect for transparent to solid nav transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle page transitions
  useEffect(() => {
    const handleStart = () => setIsPageTransitioning(true);
    const handleComplete = () => setIsPageTransitioning(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-apple-gray-light dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-gray-light dark:bg-dark-bg font-sans text-apple-gray-dark dark:text-dark-text-primary transition-colors duration-200">
      {isPageTransitioning && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-apple-blue z-50">
          <div className="h-full bg-white/30 animate-pulse-once"></div>
        </div>
      )}
      
      {/* Main content */}
      <main className={`pt-12 ${router.pathname === '/schedule' ? 'px-0' : 'px-4'} pb-16 animate-fadeIn`}>
        {children}
      </main>
      
      {/* Fixed header with theme toggle */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md z-50 border-b border-gray-200 dark:border-dark-border flex items-center px-4">
        <div className="flex-1">
          <Link href="/salary" className="text-lg font-semibold text-apple-gray-dark dark:text-white">
            SalaryCursor
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <PremiumThemeToggle />
        </div>
      </div>
      
      {/* Refresh button (fixed at bottom above navigation) */}
      <div className="fixed bottom-[4.5rem] right-4 z-40">
        <RefreshButton
          size="sm"
          variant="secondary"
          showText={false}
          className="shadow-lg h-12 w-12 p-0"
        />
      </div>
      
      {/* Bottom navigation */}
      <div className="fixed bottom-2 left-2 right-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-lg ios-safe-bottom">
        <nav className="flex justify-around items-center h-16">
          <Link href="/schedule" className={`flex flex-col items-center justify-center w-1/5 ${router.pathname === '/schedule' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
            <FiCalendar className="text-2xl" />
            <span className="text-xs mt-1">Schedule</span>
          </Link>
          <Link href="/salary" className={`flex flex-col items-center justify-center w-1/5 ${router.pathname === '/salary' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
            <FiDollarSign className="text-2xl" />
            <span className="text-xs mt-1">Salary</span>
          </Link>
          <Link href="/leave" className={`flex flex-col items-center justify-center w-1/5 ${router.pathname === '/leave' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
            <FiClock className="text-2xl" />
            <span className="text-xs mt-1">Leave</span>
          </Link>
          <Link href="/dashboard" className={`flex flex-col items-center justify-center w-1/5 ${router.pathname === '/dashboard' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
            <FiHome className="text-2xl" />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }} 
            className={`flex flex-col items-center justify-center w-1/5 text-gray-500 dark:text-gray-400`}
          >
            <FiLogOut className="text-2xl" />
            <span className="text-xs mt-1">Sign Out</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
