import { ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-lg sm:text-xl font-bold">
                Salary & Leave Manager
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {!isMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              <Link 
                href="/dashboard" 
                className={`px-3 py-2 rounded ${
                  router.pathname === '/dashboard' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/salary" 
                className={`px-3 py-2 rounded ${
                  router.pathname === '/salary' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                Salary
              </Link>
              <Link 
                href="/leave" 
                className={`px-3 py-2 rounded ${
                  router.pathname === '/leave' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                Annual Leave
              </Link>
              <span className="px-3 py-2 hidden lg:block">{user?.email}</span>
              <button
                onClick={signOut}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden border-t border-blue-700`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded text-base font-medium ${
                router.pathname === '/dashboard' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/salary"
              className={`block px-3 py-2 rounded text-base font-medium ${
                router.pathname === '/salary' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Salary
            </Link>
            <Link
              href="/leave"
              className={`block px-3 py-2 rounded text-base font-medium ${
                router.pathname === '/leave' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Annual Leave
            </Link>
            <div className="px-3 py-2 text-sm">{user?.email}</div>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                signOut();
              }}
              className="block w-full text-left px-3 py-2 rounded text-base font-medium bg-red-600 hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6">{children}</main>
    </div>
  );
} 