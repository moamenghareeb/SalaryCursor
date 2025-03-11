import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <>
      <Head>
        <title>SalaryCursor - Manage Salary and Leave</title>
        <meta name="description" content="Simplify salary and leave management with SalaryCursor" />
      </Head>
      
      <div className="flex justify-center items-center h-screen bg-apple-gray-light">
        <div className="text-center px-4">
          <h1 className="text-4xl font-semibold text-apple-gray-dark mb-4">SalaryCursor</h1>
          <p className="text-apple-gray mb-8 max-w-md mx-auto">Elegantly manage salary and leave in one place</p>
          <div className="relative">
            <div className="w-8 h-8 mx-auto">
              <svg className="animate-spin w-full h-full text-apple-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-sm text-apple-gray mt-4">Redirecting you to the right place...</p>
          </div>
        </div>
      </div>
    </>
  );
} 