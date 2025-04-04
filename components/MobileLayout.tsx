import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import DarkModeToggle from './DarkModeToggle';
import NotificationCenter from './NotificationCenter';
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
      <main className={`pt-0 ${router.pathname === '/schedule' ? 'px-0' : 'px-4'} pb-16 animate-fadeIn`}>
        {children}
      </main>
      
      {/* Mobile bottom navigation bar with prominent icons */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg border-t border-gray-200 dark:border-gray-700 z-40 ios-safe-bottom sc-mobile-nav">
        {/* Bottom navigation bar */}
        <div className="flex justify-around items-center h-16" data-testid="mobile-bottom-nav">
          <Link 
            href="/schedule" 
            className={`relative flex flex-col items-center justify-center py-3 px-4 flex-1 transition-all duration-200 ${router.pathname === '/schedule' 
              ? 'text-apple-blue' 
              : 'text-gray-500 dark:text-gray-400'}`}
          >
            {/* Active indicator dot */}
            {router.pathname === '/schedule' && (
              <span className="absolute top-0 w-10 h-1 rounded-full bg-apple-blue" />
            )}
            
            <div className={`p-1.5 rounded-full ${router.pathname === '/schedule' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <FiCalendar className="w-7 h-7" />
            </div>
            <span className={`text-xs mt-1 ${router.pathname === '/schedule' ? 'font-medium' : ''}`}>Schedule</span>
          </Link>

          <Link 
            href="/dashboard" 
            className={`relative flex flex-col items-center justify-center py-3 px-4 flex-1 transition-all duration-200 ${router.pathname === '/dashboard' 
              ? 'text-apple-blue' 
              : 'text-gray-500 dark:text-gray-400'}`}
          >
            {/* Active indicator dot */}
            {router.pathname === '/dashboard' && (
              <span className="absolute top-0 w-10 h-1 rounded-full bg-apple-blue" />
            )}
            
            <div className={`p-1.5 rounded-full ${router.pathname === '/dashboard' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <FiHome className="w-7 h-7" />
            </div>
            <span className={`text-xs mt-1 ${router.pathname === '/dashboard' ? 'font-medium' : ''}`}>Dashboard</span>
          </Link>

          <Link 
            href="/salary" 
            className={`relative flex flex-col items-center justify-center py-3 px-4 flex-1 transition-all duration-200 ${router.pathname === '/salary' 
              ? 'text-apple-blue' 
              : 'text-gray-500 dark:text-gray-400'}`}
          >
            {/* Active indicator dot */}
            {router.pathname === '/salary' && (
              <span className="absolute top-0 w-10 h-1 rounded-full bg-apple-blue" />
            )}
            
            <div className={`p-1.5 rounded-full ${router.pathname === '/salary' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <FiDollarSign className="w-7 h-7" />
            </div>
            <span className={`text-xs mt-1 ${router.pathname === '/salary' ? 'font-medium' : ''}`}>Salary</span>
          </Link>
          
          <Link 
            href="/leave" 
            className={`relative flex flex-col items-center justify-center py-3 px-4 flex-1 transition-all duration-200 ${router.pathname === '/leave' 
              ? 'text-apple-blue' 
              : 'text-gray-500 dark:text-gray-400'}`}
          >
            {/* Active indicator dot */}
            {router.pathname === '/leave' && (
              <span className="absolute top-0 w-10 h-1 rounded-full bg-apple-blue" />
            )}
            
            <div className={`p-1.5 rounded-full ${router.pathname === '/leave' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <FiClock className="w-7 h-7" />
            </div>
            <span className={`text-xs mt-1 ${router.pathname === '/leave' ? 'font-medium' : ''}`}>Leave</span>
          </Link>
          
          <button
            onClick={() => {
              setIsMenuOpen(false);
              signOut();
            }}
            className="flex flex-col items-center justify-center py-3 px-4 flex-1 transition-all duration-200 text-red-600 dark:text-red-400"
          >
            <FiLogOut className="w-7 h-7" />
            <span className="text-xs mt-1">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Dark/Light mode toggle - fixed at the top */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>
    </div>
  );
}
