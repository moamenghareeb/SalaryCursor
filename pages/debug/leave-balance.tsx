import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/authContext';
import axios from 'axios';
import { useRouter } from 'next/router';
import LoadingSpinner from '../../components/LoadingSpinner';
import Head from 'next/head';

type DiagnosticReport = {
  timestamp: string;
  employee: {
    id: string;
    name: string;
    stored_leave_balance: number;
    stored_annual_leave_balance: number;
    years_of_service: number;
    hire_date: string;
  };
  leave_records: {
    count: number;
    records: any[];
    total_days_taken: number;
    error: string | null;
  };
  in_lieu_records: {
    count: number;
    records: any[];
    total_days_added: number;
    error: string | null;
  };
  leave_allocations: {
    count: number;
    records: any[];
    error: string | null;
  };
  leave_service_calculation: {
    baseLeaveBalance: number;
    inLieuBalance: number;
    leaveTaken: number;
    remainingBalance: number;
    error?: string;
    debug?: any;
  };
  manual_calculation: {
    base_leave: number;
    allocated_leave: number | null;
    base_to_use: number;
    in_lieu_days: number;
    days_taken: number;
    calculated_balance: number;
  };
};

export default function LeaveBalanceDebug() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Only allow in dev mode
    if (process.env.NODE_ENV === 'production') {
      router.push('/dashboard');
      return;
    }

    // Initialize userId from current user if available
    if (user && !userId) {
      setUserId(user.id);
    }
  }, [user, userId, router]);

  const fetchDiagnosticData = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/debug/leave-balance?userId=${userId}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      setDiagnosticData(response.data as DiagnosticReport);
    } catch (err: any) {
      console.error('Error fetching leave balance diagnostic data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch diagnostic data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Leave Balance Debug | SalaryCursor</title>
      </Head>

      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-apple-gray-dark dark:text-dark-text-primary">
          Leave Balance Diagnostic Tool
        </h1>

        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200">
            This tool is for development and debugging purposes only. It shows detailed information about leave balance calculations.
          </p>
        </div>

        <div className="mb-6 bg-white dark:bg-dark-surface p-4 rounded-lg shadow-apple-card dark:shadow-dark-card">
          <label className="block mb-2 font-medium">User ID:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-dark-surface-2"
              placeholder="Enter user ID"
            />
            <button
              onClick={fetchDiagnosticData}
              disabled={loading}
              className="px-4 py-2 bg-apple-blue text-white rounded-lg hover:bg-apple-blue-hover disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Analyze'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {loading && (
          <div className="flex justify-center my-12">
            <LoadingSpinner />
          </div>
        )}

        {!loading && diagnosticData && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-apple-card dark:shadow-dark-card">
              <h2 className="text-xl font-semibold mb-3 text-apple-gray-dark dark:text-dark-text-primary">
                Employee Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-apple-gray dark:text-dark-text-secondary">Name:</p>
                  <p className="font-medium">{diagnosticData.employee.name}</p>
                </div>
                <div>
                  <p className="text-apple-gray dark:text-dark-text-secondary">User ID:</p>
                  <p className="font-mono text-sm">{diagnosticData.employee.id}</p>
                </div>
                <div>
                  <p className="text-apple-gray dark:text-dark-text-secondary">Years of Service:</p>
                  <p className="font-medium">{diagnosticData.employee.years_of_service}</p>
                </div>
                <div>
                  <p className="text-apple-gray dark:text-dark-text-secondary">Hire Date:</p>
                  <p className="font-medium">{new Date(diagnosticData.employee.hire_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-apple-gray dark:text-dark-text-secondary">Stored Leave Balance:</p>
                  <p className="font-medium">{diagnosticData.employee.stored_leave_balance?.toFixed(2) || 'N/A'} days</p>
                </div>
                <div>
                  <p className="text-apple-gray dark:text-dark-text-secondary">Stored Annual Leave Balance:</p>
                  <p className="font-medium">{diagnosticData.employee.stored_annual_leave_balance?.toFixed(2) || 'N/A'} days</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-apple-card dark:shadow-dark-card">
              <h2 className="text-xl font-semibold mb-3 text-apple-gray-dark dark:text-dark-text-primary">
                Leave Balance Calculations
              </h2>
              
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Final Calculation Result</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-green-700 dark:text-green-300">Service Calculation:</div>
                  <div className="font-mono font-bold text-green-800 dark:text-green-200">
                    {diagnosticData.leave_service_calculation.remainingBalance.toFixed(2)} days
                  </div>
                  
                  <div className="text-green-700 dark:text-green-300">Manual Calculation:</div>
                  <div className="font-mono font-bold text-green-800 dark:text-green-200">
                    {diagnosticData.manual_calculation.calculated_balance.toFixed(2)} days
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Leave Service Calculation</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Base Balance:</span>
                      <span className="font-mono">{diagnosticData.leave_service_calculation.baseLeaveBalance.toFixed(2)} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">In-Lieu Balance:</span>
                      <span className="font-mono">{diagnosticData.leave_service_calculation.inLieuBalance.toFixed(2)} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Leave Taken:</span>
                      <span className="font-mono">{diagnosticData.leave_service_calculation.leaveTaken.toFixed(2)} days</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">Remaining Balance:</span>
                      <span className="font-mono font-semibold">{diagnosticData.leave_service_calculation.remainingBalance.toFixed(2)} days</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                  <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">Manual Calculation</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-purple-700 dark:text-purple-300">Base Leave:</span>
                      <span className="font-mono">{diagnosticData.manual_calculation.base_leave.toFixed(2)} days</span>
                    </div>
                    {diagnosticData.manual_calculation.allocated_leave && (
                      <div className="flex justify-between">
                        <span className="text-purple-700 dark:text-purple-300">Allocated Leave:</span>
                        <span className="font-mono">{diagnosticData.manual_calculation.allocated_leave.toFixed(2)} days</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-purple-700 dark:text-purple-300">Base Used:</span>
                      <span className="font-mono">{diagnosticData.manual_calculation.base_to_use.toFixed(2)} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700 dark:text-purple-300">In-Lieu Days:</span>
                      <span className="font-mono">{diagnosticData.manual_calculation.in_lieu_days.toFixed(2)} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700 dark:text-purple-300">Days Taken:</span>
                      <span className="font-mono">{diagnosticData.manual_calculation.days_taken.toFixed(2)} days</span>
                    </div>
                    <div className="flex justify-between border-t border-purple-200 dark:border-purple-700 pt-1 mt-1">
                      <span className="font-semibold text-purple-800 dark:text-purple-200">Calculated Balance:</span>
                      <span className="font-mono font-semibold">{diagnosticData.manual_calculation.calculated_balance.toFixed(2)} days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-apple-card dark:shadow-dark-card">
              <h2 className="text-xl font-semibold mb-3 text-apple-gray-dark dark:text-dark-text-primary">
                Leave Records Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Annual Leave</h3>
                  <p className="text-apple-gray dark:text-dark-text-secondary">
                    Found {diagnosticData.leave_records.count} approved leave records for the current year.
                  </p>
                  <p className="font-medium mt-1">
                    Total Days Taken: {diagnosticData.leave_records.total_days_taken.toFixed(2)} days
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">In-Lieu Time</h3>
                  <p className="text-apple-gray dark:text-dark-text-secondary">
                    Found {diagnosticData.in_lieu_records.count} approved in-lieu records.
                  </p>
                  <p className="font-medium mt-1">
                    Total Days Added: {diagnosticData.in_lieu_records.total_days_added.toFixed(2)} days
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-apple-gray dark:text-dark-text-secondary">
              Diagnostic generated at: {new Date(diagnosticData.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 