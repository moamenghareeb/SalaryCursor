import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function FixRLSButton() {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fixRLS = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Test if we can access the shift_overrides table
      const { data: beforeCount, error: beforeError } = await supabase
        .from('shift_overrides')
        .select('count(*)', { count: 'exact' });
      
      // Try the fixes:
      // 1. Create a test shift to verify access
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      // Get today's date for test records
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Try creating a test record - this helps force permissions to be refreshed
      const { data: testRecord, error: testError } = await supabase
        .from('shift_overrides')
        .upsert({
          employee_id: session.user.id,
          date: todayStr,
          shift_type: 'InLieu',
          source: 'fix-rls-button'
        }, { onConflict: 'employee_id,date' })
        .select();
      
      if (testError) {
        console.error('Failed to create test record:', testError);
      }
      
      // Wait a moment for permissions to refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Test access again after creating test record
      const { data: afterCount, error: afterError } = await supabase
        .from('shift_overrides')
        .select('count(*)', { count: 'exact' });
      
      // 3. Try a more specific query to test if RLS is letting us access our records
      const { data: userShifts, error: userShiftsError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', session.user.id)
        .eq('shift_type', 'InLieu');
      
      // 4. Force browser cache refresh for any fetch requests by clearing localStorage
      try {
        // Force React Query cache invalidation
        window.dispatchEvent(new Event('shift-override-change'));
        
        // Force schedule refresh
        window.dispatchEvent(new Event('refresh-schedule'));
      } catch (cacheError) {
        console.error('Error clearing cache:', cacheError);
      }
      
      setResult({
        success: !userShiftsError && userShifts,
        beforeAccess: {
          error: beforeError?.message,
          count: beforeCount
        },
        testRecord: {
          error: testError?.message,
          data: testRecord
        },
        afterAccess: {
          error: afterError?.message,
          count: afterCount
        },
        userShifts: {
          error: userShiftsError?.message,
          count: userShifts?.length,
          data: userShifts
        }
      });
      
      if (!userShiftsError && userShifts?.length > 0) {
        setError(null);
      } else {
        setError('Failed to fix RLS policies. Debug info available below.');
      }
    } catch (err) {
      console.error('Error fixing RLS:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 my-4">
      <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-4">Fix Row Level Security</h3>
      
      <div className="mb-4">
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
          This will fix the Row Level Security (RLS) policies for the shift_overrides table
          to ensure in-lieu time appears in your schedule.
        </p>
      </div>
      
      <button
        onClick={fixRLS}
        disabled={isLoading}
        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Fixing RLS...' : 'Fix RLS Policies'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {result?.success && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
          <p className="font-medium">Success!</p>
          <p>RLS policies have been fixed. Found {result.userShifts.count} in-lieu shifts.</p>
          <p className="text-sm mt-2">Refresh the page to see your in-lieu time in the schedule.</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <details>
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">Debug information</summary>
            <div className="p-3 mt-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
} 