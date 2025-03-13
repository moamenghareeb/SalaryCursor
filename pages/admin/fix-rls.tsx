import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function FixRLSPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // Check for authentication on component mount
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to access this page');
        router.push('/login');
        return;
      }
      
      setToken(session.access_token);
    };
    
    checkAuth();
  }, [router]);

  // Function to directly execute queries against the database
  const fixRLSPolicies = async () => {
    setStatus('loading');
    try {
      // Call the migration API endpoint
      const response = await fetch('/api/admin/run-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          migrationFile: 'fix_shift_overrides_rls.sql'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error running migration:', data);
        setStatus('error');
        setResult(data);
        return;
      }
      
      setStatus('success');
      setResult(data);
      
      // Test if the fix worked by trying to access shift_overrides table
      await testShiftOverrides();
      
    } catch (error) {
      console.error('Error running migration:', error);
      setStatus('error');
      setResult(error instanceof Error ? { error: error.message } : { error: String(error) });
    }
  };
  
  // Function to test if the fix worked
  const testShiftOverrides = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'No active session' };
      }
      
      // Try to access shift_overrides table
      const { data, error } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', session.user.id);
      
      if (error) {
        console.error('Error accessing shift_overrides after fix:', error);
        return { error: error.message, details: error };
      }
      
      return { success: true, count: data?.length || 0 };
    } catch (error) {
      console.error('Error testing shift_overrides access:', error);
      return { error: 'Test failed', details: error };
    }
  };
  
  return (
    <Layout>
      <Head>
        <title>Fix RLS Policies | SalaryCursor</title>
      </Head>
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Fix Row Level Security Policies</h1>
          
          <div className="mb-8">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This page allows you to fix Row Level Security (RLS) policies for the shift_overrides table.
              This can help resolve issues with in-lieu time not showing up in the schedule.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6">
              <p className="text-yellow-800 dark:text-yellow-300 font-medium">Warning</p>
              <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                This operation will modify database permissions. Only proceed if you are experiencing issues
                with in-lieu time not appearing in the schedule.
              </p>
            </div>
            
            <button
              onClick={fixRLSPolicies}
              disabled={status === 'loading' || !token}
              className={`px-4 py-2 rounded-lg font-medium ${
                status === 'loading'
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {status === 'loading' ? 'Fixing Policies...' : 'Fix RLS Policies'}
            </button>
          </div>
          
          {status === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-green-800 dark:text-green-300 font-medium">Success!</p>
              <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                The RLS policies have been successfully updated. In-lieu time should now appear correctly in the schedule.
              </p>
              <div className="mt-3">
                <Link 
                  href="/schedule" 
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Go to Schedule
                </Link>
              </div>
              
              {result && (
                <pre className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
              <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                An error occurred while updating the RLS policies. Please try again or contact support.
              </p>
              
              {result && (
                <pre className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
              
              <div className="mt-4">
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">Alternative Solutions:</p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <li>Try restarting the application</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Log out and log back in</li>
                  <li>Try accessing the <Link href="/schedule" className="text-blue-600 hover:underline dark:text-blue-400">schedule page</Link> directly</li>
                </ul>
              </div>
            </div>
          )}
          
          <div className="mt-8 border-t pt-6 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Instructions for Developers</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              If the fix above doesn&apos;t work, you can manually run the SQL commands in the Supabase dashboard:
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded font-mono text-sm overflow-x-auto">
              <pre className="text-gray-800 dark:text-gray-300">
{`-- Function to fix RLS policies for shift_overrides table
CREATE OR REPLACE FUNCTION fix_shift_overrides_rls()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own shift overrides" ON public.shift_overrides;
  DROP POLICY IF EXISTS "Users can insert their own shift overrides" ON public.shift_overrides;
  DROP POLICY IF EXISTS "Users can update their own shift overrides" ON public.shift_overrides;
  DROP POLICY IF EXISTS "Users can delete their own shift overrides" ON public.shift_overrides;
  
  -- Create new policies
  CREATE POLICY "Users can view their own shift overrides"
    ON public.shift_overrides
    FOR SELECT
    USING (auth.uid() = employee_id);
    
  CREATE POLICY "Users can insert their own shift overrides"
    ON public.shift_overrides
    FOR INSERT
    WITH CHECK (auth.uid() = employee_id);
    
  CREATE POLICY "Users can update their own shift overrides"
    ON public.shift_overrides
    FOR UPDATE
    USING (auth.uid() = employee_id);
    
  CREATE POLICY "Users can delete their own shift overrides"
    ON public.shift_overrides
    FOR DELETE
    USING (auth.uid() = employee_id);
    
  RETURN 'RLS policies fixed successfully';
END;
$$;

-- Call the function to fix the policies
SELECT fix_shift_overrides_rls();

-- Make sure Row Level Security is enabled on the table
ALTER TABLE public.shift_overrides ENABLE ROW LEVEL SECURITY;`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 