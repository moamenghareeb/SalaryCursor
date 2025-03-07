import { ReactNode, useState, useEffect } from 'react';
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
  const [scrolled, setScrolled] = useState(false);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-apple-gray-light">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-gray-light font-sans">
      <nav 
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 backdrop-blur-md shadow-apple-nav' : 'bg-apple-gray-light'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12 items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-lg sm:text-xl font-medium text-apple-gray-dark">
                SalaryCursor
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-full text-apple-gray-dark hover:bg-gray-100 focus:outline-none"
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

            {/* Desktop menu */}
            <div className="hidden sm:flex sm:items-center sm:space-x-6">
              <Link 
                href="/dashboard" 
                className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark font-medium hover:bg-gray-100 ${
                  router.pathname === '/dashboard' ? 'bg-gray-100' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/salary" 
                className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark font-medium hover:bg-gray-100 ${
                  router.pathname === '/salary' ? 'bg-gray-100' : ''
                }`}
              >
                Salary
              </Link>
              <Link 
                href="/leave" 
                className={`px-3 py-1 rounded-full text-sm text-apple-gray-dark font-medium hover:bg-gray-100 ${
                  router.pathname === '/leave' ? 'bg-gray-100' : ''
                }`}
              >
                Leave
              </Link>
              
              <div className="pl-4 border-l border-gray-200 flex items-center space-x-3">
                <span className="hidden lg:block text-sm text-apple-gray">{user?.email}</span>
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
        <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden border-t border-gray-200 bg-white`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark ${
                router.pathname === '/dashboard' ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/salary"
              className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark ${
                router.pathname === '/salary' ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Salary
            </Link>
            <Link
              href="/leave"
              className={`block px-3 py-2 rounded-md text-base font-medium text-apple-gray-dark ${
                router.pathname === '/leave' ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Leave
            </Link>
            <div className="px-3 py-2 text-sm text-apple-gray">{user?.email}</div>
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
      </nav>
      <main className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
} 