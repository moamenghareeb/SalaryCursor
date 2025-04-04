import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import DarkModeToggle from './DarkModeToggle';
import NotificationCenter from './NotificationCenter';
import { motion } from 'framer-motion';

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

  // Handle page transition effects
  useEffect(() => {
    const handleStart = () => {
      setIsPageTransitioning(true);
    };
    
    const handleComplete = () => {
      setIsPageTransitioning(false);
    };

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

  const isSchedulePage = router.pathname === '/schedule';

  return (
    <div className="min-h-screen bg-apple-gray-light dark:bg-dark-bg font-sans text-apple-gray-dark dark:text-dark-text-primary transition-colors duration-200">
      {isPageTransitioning && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-apple-blue z-50">
          <div className="h-full bg-white/30 animate-pulse-once"></div>
        </div>
      )}
      
      {/* Mobile-optimized top nav */}
      <nav 
        className={`fixed w-full z-40 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md shadow-apple-nav dark:shadow-dark-card' 
            : 'bg-apple-gray-light dark:bg-dark-bg'
        }`}
      >
        <div className="px-2 py-2">
          <div className="flex justify-between h-12 items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">
                SalaryCursor
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center">
              <NotificationCenter />
              <DarkModeToggle />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-full text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface focus:outline-none ml-2"
                aria-label="Open main menu"
              >
                <span className="sr-only">Open main menu</span>
                {!isMenuOpen ? (
                  <svg className="block h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu drawer - slide in from right */}
        <motion.div 
          className={`fixed inset-y-0 right-0 w-3/4 max-w-xs z-50 bg-white dark:bg-dark-surface shadow-lg transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          initial={false}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-dark-border">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Menu</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface/70"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
            </div>
            
            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <Link
                href="/dashboard"
                className={`flex items-center px-4 py-3 rounded-lg text-base font-medium ${
                  router.pathname === '/dashboard' 
                    ? 'bg-apple-blue text-white' 
                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-surface/70'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              
              <Link
                href="/salary"
                className={`flex items-center px-4 py-3 rounded-lg text-base font-medium ${
                  router.pathname === '/salary' 
                    ? 'bg-apple-blue text-white' 
                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-surface/70'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Salary
              </Link>
              
              <Link
                href="/leave"
                className={`flex items-center px-4 py-3 rounded-lg text-base font-medium ${
                  router.pathname === '/leave' 
                    ? 'bg-apple-blue text-white' 
                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-surface/70'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Leave
              </Link>
              
              <Link
                href="/schedule"
                className={`flex items-center px-4 py-3 rounded-lg text-base font-medium ${
                  router.pathname === '/schedule' 
                    ? 'bg-apple-blue text-white' 
                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-surface/70'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Schedule
              </Link>
            </div>
            
            {/* Bottom section with sign out */}
            <div className="p-4 border-t border-gray-200 dark:border-dark-border">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  signOut();
                }}
                className="flex items-center w-full px-4 py-3 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Backdrop for mobile menu */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMenuOpen(false)}
          ></div>
        )}
      </nav>

      {/* Main content */}
      <main className={`pt-16 pb-16 ${isSchedulePage ? 'px-0' : 'px-4'} animate-fadeIn`}>
        {children}
      </main>
      
      {/* Mobile bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface shadow-t border-t border-gray-200 dark:border-dark-border z-40">
        <div className="flex justify-around">
          <Link 
            href="/dashboard" 
            className={`flex flex-col items-center justify-center py-2 px-2 flex-1 ${
              router.pathname === '/dashboard' ? 'text-apple-blue' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          
          <Link 
            href="/salary" 
            className={`flex flex-col items-center justify-center py-2 px-2 flex-1 ${
              router.pathname === '/salary' ? 'text-apple-blue' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1">Salary</span>
          </Link>
          
          <Link 
            href="/leave" 
            className={`flex flex-col items-center justify-center py-2 px-2 flex-1 ${
              router.pathname === '/leave' ? 'text-apple-blue' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">Leave</span>
          </Link>
          
          <Link 
            href="/schedule" 
            className={`flex flex-col items-center justify-center py-2 px-2 flex-1 ${
              router.pathname === '/schedule' ? 'text-apple-blue' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">Schedule</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
