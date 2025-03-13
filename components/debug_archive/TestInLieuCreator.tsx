import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TestInLieuCreator() {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTestInLieu = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      // Get today's date and next week
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const todayStr = today.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      // Create date range (today through next week)
      const dateRange = [];
      const tempDate = new Date(today);
      while (tempDate <= nextWeek) {
        dateRange.push(tempDate.toISOString().split('T')[0]);
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      console.log('Creating in-lieu shifts for dates:', dateRange);
      
      // Create shift overrides for each day
      const shiftsToCreate = dateRange.map(date => ({
        employee_id: session.user.id,
        date,
        shift_type: 'InLieu',
        source: 'test-creator'
      }));
      
      // Insert all shift overrides
      const { data: createdShifts, error: shiftsError } = await supabase
        .from('shift_overrides')
        .upsert(shiftsToCreate, { onConflict: 'employee_id,date' })
        .select();
        
      if (shiftsError) {
        throw shiftsError;
      }
      
      // Create an in-lieu record
      const { data: inLieuRecord, error: recordError } = await supabase
        .from('in_lieu_records')
        .upsert({
          employee_id: session.user.id,
          start_date: todayStr,
          end_date: nextWeekStr,
          days_count: dateRange.length,
          leave_days_added: dateRange.length * 0.667,
          status: 'Approved',
          reason: 'Test in-lieu creation'
        })
        .select();
        
      if (recordError) {
        throw recordError;
      }
      
      // Set success result
      setResult({
        success: true,
        shifts: createdShifts,
        record: inLieuRecord,
        dateRange
      });
      
      // Now check if we can read the shifts we just created
      const { data: readShifts, error: readError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', session.user.id)
        .in('date', dateRange)
        .eq('shift_type', 'InLieu');
        
      if (readError) {
        console.error('Error reading created shifts:', readError);
        setResult(prev => ({
          ...prev,
          readTest: {
            success: false,
            error: readError.message
          }
        }));
      } else {
        setResult(prev => ({
          ...prev,
          readTest: {
            success: true,
            count: readShifts?.length || 0,
            data: readShifts
          }
        }));
      }
    } catch (err) {
      console.error('Error creating test in-lieu:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 my-4">
      <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">Test In-Lieu Creator</h3>
      
      <button
        onClick={createTestInLieu}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create Test In-Lieu Shifts (Today to Next Week)'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded mb-2">
            <p className="font-medium">
              {result.success 
                ? `Successfully created ${result.shifts?.length || 0} in-lieu shifts!` 
                : 'Operation completed with issues'}
            </p>
            
            {result.readTest && (
              <p className="mt-2">
                Read test: {result.readTest.success 
                  ? `Successfully read ${result.readTest.count} shifts` 
                  : `Failed to read shifts: ${result.readTest.error}`}
              </p>
            )}
          </div>
          
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 