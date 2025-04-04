import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/schedule' : '/login');
    }
  }, [user, loading, router]);

  return (
    <>
      <Head>
        <title>SalaryCursor</title>
        <meta name="description" content="Salary and schedule management system" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-4">Redirecting you to the schedule page...</p>
        </div>
      </div>
    </>
  );
}