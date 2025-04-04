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

  return (
    <header className="fixed w-full z-40 bg-white dark:bg-dark-surface shadow-apple-nav dark:shadow-dark-card">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-12 items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-lg sm:text-xl font-medium text-apple-gray-dark dark:text-dark-text-primary">
              SalaryCursor
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <DarkModeToggle />
            <NotificationCenter />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-full text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface focus:outline-none ml-2"
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
          
          {/* Desktop navigation */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4">
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
            <Link
              href="/schedule"
              className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark dark:text-dark-text-primary font-medium hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors ${
                router.pathname === '/schedule' ? 'bg-gray-100 dark:bg-dark-surface' : ''
              }`}
            >
              Schedule
            </Link>
            
            <div className="pl-4 border-l border-gray-200 dark:border-dark-border flex items-center space-x-3">
              <NotificationCenter />
              <DarkModeToggle />
              <span className="hidden lg:block text-sm text-apple-gray dark:text-dark-text-secondary">{user?.email}</span>
              <button
                onClick={signOut}
                className="px-3 py-1 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-full text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link
            href="/dashboard"
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/dashboard' ? 'bg-gray-100 dark:bg-dark-surface/70' : 'hover:bg-gray-50 dark:hover:bg-dark-surface/70'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/salary"
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/salary' ? 'bg-gray-100 dark:bg-dark-surface/70' : 'hover:bg-gray-50 dark:hover:bg-dark-surface/70'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Salary
          </Link>
          <Link
            href="/leave"
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/leave' ? 'bg-gray-100 dark:bg-dark-surface/70' : 'hover:bg-gray-50 dark:hover:bg-dark-surface/70'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Leave
          </Link>
          <Link
            href="/schedule"
            className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark dark:text-dark-text-primary ${
              router.pathname === '/schedule' ? 'bg-gray-100 dark:bg-dark-surface/70' : 'hover:bg-gray-50 dark:hover:bg-dark-surface/70'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Schedule
          </Link>
          <div className="px-3 py-2 text-sm text-apple-gray dark:text-dark-text-secondary">{user?.email}</div>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              signOut();
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
