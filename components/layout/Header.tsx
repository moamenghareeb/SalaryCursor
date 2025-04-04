import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/authContext';
import DarkModeToggle from '../DarkModeToggle';
import NotificationCenter from '../NotificationCenter';

export default function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="fixed w-full z-40 bg-white dark:bg-dark-surface shadow-apple-nav dark:shadow-dark-card">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-12 items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-lg sm:text-xl font-medium text-apple-gray-dark dark:text-dark-text-primary">
              SalaryCursor
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:flex sm:items-center sm:space-x-6">
            <Link 
              href="/schedule" 
              className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark dark:text-dark-text-primary font-medium hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors ${
                router.pathname === '/schedule' ? 'bg-gray-100 dark:bg-dark-surface' : ''
              }`}
            >
              Schedule
            </Link>
            <Link 
              href="/dashboard" 
              className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark dark:text-dark-text-primary font-medium hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors ${
                router.pathname === '/dashboard' ? 'bg-gray-100 dark:bg-dark-surface' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/salary" 
              className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark dark:text-dark-text-primary font-medium hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors ${
                router.pathname === '/salary' ? 'bg-gray-100 dark:bg-dark-surface' : ''
              }`}
            >
              Salary
            </Link>
            <Link 
              href="/leave" 
              className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark dark:text-dark-text-primary font-medium hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors ${
                router.pathname === '/leave' ? 'bg-gray-100 dark:bg-dark-surface' : ''
              }`}
            >
              Leave
            </Link>
          </div>

          {/* Desktop controls */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            <DarkModeToggle />
            <span className="hidden lg:block text-sm text-apple-gray dark:text-dark-text-secondary">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-full text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-inset focus:ring-apple-blue"
          >
            <span className="sr-only">Open main menu</span>
            {isMenuOpen ? (
              <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link 
            href="/schedule" 
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/schedule' ? 'bg-gray-100 dark:bg-dark-surface' : 'hover:bg-gray-50 dark:hover:bg-dark-surface'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Schedule
          </Link>
          <Link 
            href="/dashboard" 
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/dashboard' ? 'bg-gray-100 dark:bg-dark-surface' : 'hover:bg-gray-50 dark:hover:bg-dark-surface'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/salary" 
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/salary' ? 'bg-gray-100 dark:bg-dark-surface' : 'hover:bg-gray-50 dark:hover:bg-dark-surface'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Salary
          </Link>
          <Link 
            href="/leave" 
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/leave' ? 'bg-gray-100 dark:bg-dark-surface' : 'hover:bg-gray-50 dark:hover:bg-dark-surface'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Leave
          </Link>
          <div className="px-3 py-2 text-sm text-apple-gray dark:text-dark-text-secondary">{user?.email}</div>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              handleSignOut();
            }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-apple-blue text-white hover:bg-apple-blue-hover"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
