import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold">
                Salary & Leave Manager
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="px-3 py-2 hover:bg-blue-700 rounded">
                Dashboard
              </Link>
              <Link href="/salary" className="px-3 py-2 hover:bg-blue-700 rounded">
                Salary
              </Link>
              <Link href="/leave" className="px-3 py-2 hover:bg-blue-700 rounded">
                Annual Leave
              </Link>
              <span className="px-3 py-2">{user?.email}</span>
              <button
                onClick={signOut}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
} 