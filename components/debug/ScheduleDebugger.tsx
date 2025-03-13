import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import AuthHelp from './AuthHelp';

interface ScheduleDebuggerProps {
  userId: string;
}

interface DebugResult {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: any;
}

const ScheduleDebugger: React.FC<ScheduleDebuggerProps> = ({ userId }) => {
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [authErrors, setAuthErrors] = useState(0);
  const [forcedUserId, setForcedUserId] = useState<string>(userId || '');
  const [directApiUrl, setDirectApiUrl] = useState('');

  // Get the auth token on mount
  useEffect(() => {
    const getToken = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          setAuthToken(data.session.access_token);
          addResult({
            type: 'info',
            message: 'Auth token retrieved successfully'
          });
        } else {
          addResult({
            type: 'error',
            message: 'No auth token available - authentication required'
          });
        }
      } catch (error: any) {
        console.error('Error getting auth token:', error);
        addResult({
          type: 'error',
          message: `Error retrieving auth token: ${error.message}`,
        });
      }
    };

    getToken();
  }, []);
  
  // Detect multiple auth errors and suggest help
  useEffect(() => {
    if (authErrors >= 2) {
      setShowAuthHelp(true);
    }
  }, [authErrors]);
  
  const addResult = (result: DebugResult) => {
    setResults(prev => [result, ...prev].slice(0, 10)); // Keep only the last 10 results
    
    // Check if this is an auth error
    if (result.type === 'error' && 
        (result.message.includes('auth') || 
         result.message.includes('token') || 
         result.message.includes('Unauthorized'))) {
      setAuthErrors(prev => prev + 1);
    }
  };
  
  const buildApiUrl = (operation: string) => {
    let url = `/api/debug/direct-check?start=${startDate}&end=${endDate}&op=${operation}`;
    
    // Add test mode for development fallback
    url += '&testMode=true';
    
    // Add token if available
    if (authToken) {
      url += `&token=${authToken}`;
    }
    
    // Add forced user ID if provided
    if (forcedUserId && forcedUserId !== userId) {
      url += `&forceUserId=${forcedUserId}`;
    }
    
    return url;
  };
  
  const handleCheck = async () => {
    setIsLoading(true);
    try {
      addResult({
        type: 'info',
        message: `Checking for shifts in date range: ${startDate} to ${endDate}`
      });
      
      const url = buildApiUrl('check');
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error checking shifts');
      }
      
      addResult({
        type: 'success',
        message: `Found ${data.inLieuShifts?.count || 0} in-lieu shifts and ${data.inLieuRecords?.count || 0} in-lieu records out of ${data.totalDays} total days`,
        details: data
      });
    } catch (error: any) {
      addResult({
        type: 'error',
        message: `Error checking shifts: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreate = async () => {
    setIsLoading(true);
    try {
      addResult({
        type: 'info',
        message: `Creating in-lieu shifts for: ${startDate} to ${endDate}`
      });
      
      const url = buildApiUrl('force-create');
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error creating shifts');
      }
      
      addResult({
        type: 'success',
        message: `Created ${data.created?.shiftsCreated || 0} new in-lieu shifts and 1 in-lieu record`,
        details: data
      });
      
      // Trigger a refresh
      handleRefreshSchedule();
    } catch (error: any) {
      addResult({
        type: 'error',
        message: `Error creating shifts: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      addResult({
        type: 'info',
        message: `Deleting in-lieu shifts for: ${startDate} to ${endDate}`
      });
      
      const url = buildApiUrl('force-delete');
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error deleting shifts');
      }
      
      addResult({
        type: 'success',
        message: `Deleted ${data.deleted?.shiftsDeleted || 0} in-lieu shifts and ${data.deleted?.inLieuRecordsDeleted || 0} in-lieu records`,
        details: data
      });
      
      // Trigger a refresh
      handleRefreshSchedule();
    } catch (error: any) {
      addResult({
        type: 'error',
        message: `Error deleting shifts: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDirectCheck = async () => {
    setIsLoading(true);
    try {
      addResult({
        type: 'info',
        message: 'Checking database directly for in-lieu shifts'
      });
      
      // Directly query the database
      const { data, error } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', userId)
        .eq('shift_type', 'InLieu');
        
      if (error) throw error;
      
      addResult({
        type: 'success',
        message: `Found ${data.length} in-lieu shifts directly in database`,
        details: data
      });
    } catch (error: any) {
      addResult({
        type: 'error',
        message: `Error in direct database check: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefreshSchedule = async () => {
    setIsLoading(true);
    try {
      addResult({
        type: 'info',
        message: 'Refreshing schedule data...'
      });
      
      // Force refresh the schedule by invalidating all relevant queries
      // This is a client-side approach that doesn't go through the API
      const event = new CustomEvent('refresh-schedule');
      window.dispatchEvent(event);
      
      addResult({
        type: 'success',
        message: 'Sent schedule refresh event'
      });
    } catch (error: any) {
      addResult({
        type: 'error',
        message: `Error refreshing schedule: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReauthenticate = async () => {
    setIsLoading(true);
    try {
      addResult({
        type: 'info',
        message: 'Refreshing authentication token...'
      });
      
      // Force a refresh of the auth token
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (data?.session?.access_token) {
        setAuthToken(data.session.access_token);
        addResult({
          type: 'success',
          message: 'Successfully refreshed authentication token',
          details: { token: data.session.access_token.substring(0, 20) + '...' }
        });
        
        // Test the new token right away
        await handleAuthTest();
      } else {
        addResult({
          type: 'error',
          message: 'No token returned after refresh'
        });
      }
    } catch (error: any) {
      addResult({
        type: 'error',
        message: `Error refreshing authentication: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAuthTest = async () => {
    setIsLoading(true);
    try {
      addResult({
        type: 'info',
        message: 'Testing authentication with the API...'
      });
      
      const url = buildApiUrl('auth-test');
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }
      
      addResult({
        type: 'success',
        message: `Authentication successful! User ID: ${data.userId}, Method: ${data.authMethod}`,
        details: data
      });
    } catch (error: any) {
      addResult({
        type: 'error',
        message: `Authentication test failed: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a help button
  const handleShowHelp = () => {
    setShowAuthHelp(true);
  };

  return (
    <>
      <div className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400">Schedule Debugger</h3>
          <div className="flex gap-2">
            <button
              onClick={handleAuthTest}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Test Auth
            </button>
            <button
              onClick={handleShowHelp}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Help
            </button>
          </div>
        </div>
        
        {!authToken && (
          <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
            <div className="flex justify-between items-center">
              <span>⚠️ Not authenticated - some features may not work</span>
              <button
                onClick={handleReauthenticate}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs"
              >
                Fix Authentication
              </button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="debug-start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <input
              id="debug-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div className="flex-1">
            <label htmlFor="debug-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date
            </label>
            <input
              id="debug-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleCheck}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Check Shifts
          </button>
          
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Create In-Lieu
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Delete In-Lieu
          </button>
          
          <button
            onClick={handleDirectCheck}
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Direct DB Check
          </button>
          
          <button
            onClick={handleRefreshSchedule}
            disabled={isLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Refresh Schedule
          </button>
          
          <button
            onClick={handleReauthenticate}
            disabled={isLoading}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Refresh Auth
          </button>
        </div>
        
        {/* Direct API URL for advanced debugging */}
        <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 rounded overflow-x-auto">
          <p className="font-semibold mb-1">Direct API URL:</p>
          <code>{buildApiUrl('check')}</code>
        </div>
        
        {/* Force User ID (for advanced debugging) */}
        <div className="mb-4">
          <label htmlFor="force-user-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Force User ID (Advanced)
          </label>
          <div className="flex gap-2">
            <input
              id="force-user-id"
              type="text"
              placeholder={userId}
              value={forcedUserId}
              onChange={(e) => setForcedUserId(e.target.value)}
              className="mt-1 flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only change this if you need to test a different user's records.</p>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Results Log:</h4>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-2 max-h-40 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No results yet</p>
            ) : (
              <ul className="space-y-2">
                {results.map((result, index) => (
                  <li 
                    key={index} 
                    className={`text-sm p-2 rounded ${
                      result.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                      result.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    <div>{result.message}</div>
                    {result.details && (
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p>User ID: {userId}</p>
          <p>Auth Status: {authToken ? 'Authenticated' : 'Not authenticated'}</p>
          <p className="mt-1">This debugger is only visible in development mode.</p>
        </div>
      </div>
      
      {showAuthHelp && <AuthHelp onDismiss={() => setShowAuthHelp(false)} />}
    </>
  );
};

export default ScheduleDebugger; 