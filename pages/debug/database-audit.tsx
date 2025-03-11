import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/authContext';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Head from 'next/head';
import axios from 'axios';
import { useRouter } from 'next/router';

// Debug-only page for database auditing
export default function DatabaseAudit() {
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const router = useRouter();

  // Only available in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    async function fetchAuditData() {
      if (!user?.id || !session) return;

      try {
        setLoading(true);
        const response = await axios.get(`/api/debug/database-audit?userId=${user.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        setAuditData(response.data);
        console.log('Audit data:', response.data);
      } catch (err: any) {
        console.error('Error fetching audit data:', err);
        setError(err.message || 'Failed to fetch audit data');
      } finally {
        setLoading(false);
      }
    }

    fetchAuditData();
  }, [user, session]);

  // Helper function to display JSON in a readable format
  const prettyJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return 'Error formatting JSON';
    }
  };

  return (
    <Layout>
      <Head>
        <title>Database Audit | SalaryCursor</title>
      </Head>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Database Audit Tool</h1>
          <p className="text-gray-700 dark:text-gray-300">
            This page shows detailed information about leave balance calculations from all data sources.
            Use this to identify discrepancies in your leave balance calculation.
          </p>
        </div>

        {process.env.NODE_ENV === 'production' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">Production Mode</p>
            <p>This tool is only available in development mode.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : auditData ? (
          <div className="space-y-8">
            {/* Key Metrics Summary */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Leave Balance Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Base Leave Balance</h3>
                  <p className="text-2xl font-bold">{auditData.calculated?.baseLeaveBalance || 0}</p>
                  <p className="text-xs text-gray-500">(Based on years of service)</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">In-Lieu Days</h3>
                  <p className="text-2xl font-bold">{auditData.inLieuRecords?.summary.reconciliation.daysAddedSum || 0}</p>
                  <p className="text-xs text-gray-500">({auditData.inLieuRecords?.summary.totalRecords || 0} records)</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Leave Taken</h3>
                  <p className="text-2xl font-bold">{auditData.leaveRecords?.summary.totalDaysTaken || 0}</p>
                  <p className="text-xs text-gray-500">({auditData.leaveRecords?.summary.totalRecords || 0} records)</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">Calculated Balance</h3>
                  <p className="text-2xl font-bold">{auditData.calculated?.calculatedTotalBalance?.toFixed(2) || 0}</p>
                  <p className="text-xs text-gray-500">(Base + In-Lieu - Taken)</p>
                </div>
              </div>
            </div>

            {/* Values Comparison */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">Database vs Calculated Values</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Source</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Value</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">employee.leave_balance</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold">{auditData.employee?.leave_balance !== undefined ? auditData.employee.leave_balance : 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Total leave balance stored in database</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">employee.annual_leave_balance</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold">{auditData.employee?.annual_leave_balance !== undefined ? auditData.employee.annual_leave_balance : 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">In-lieu balance stored in database</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">Base + In-Lieu - Taken</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold">{auditData.calculated?.calculatedTotalBalance?.toFixed(2) || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Calculated balance from formula</td>
                    </tr>
                    <tr className="bg-yellow-50 dark:bg-yellow-900/10">
                      <td className="px-4 py-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">Difference</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold">
                        {auditData.employee?.leave_balance !== undefined && auditData.calculated
                          ? (auditData.employee.leave_balance - auditData.calculated.calculatedTotalBalance).toFixed(2)
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Discrepancy between stored and calculated values
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Field Existence Check */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">Schema Analysis</h2>
              
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">In-Lieu Records Fields</h3>
                <div className="flex gap-4">
                  <div className={`py-1 px-3 rounded-full text-sm font-medium ${auditData.inLieuRecords?.summary.hasDays_added ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                    days_added: {auditData.inLieuRecords?.summary.hasDays_added ? 'Present' : 'Missing'}
                  </div>
                  <div className={`py-1 px-3 rounded-full text-sm font-medium ${auditData.inLieuRecords?.summary.hasLeave_days_added ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                    leave_days_added: {auditData.inLieuRecords?.summary.hasLeave_days_added ? 'Present' : 'Missing'}
                  </div>
                  <div className={`py-1 px-3 rounded-full text-sm font-medium ${auditData.inLieuRecords?.summary.reconciliation.issues.length > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                    Field Mismatches: {auditData.inLieuRecords?.summary.reconciliation.issues.length || 0}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Leave Records Fields</h3>
                <div className="flex gap-4">
                  <div className={`py-1 px-3 rounded-full text-sm font-medium ${auditData.leaveRecords?.summary.hasLeaveType ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                    leave_type: {auditData.leaveRecords?.summary.hasLeaveType ? 'Present' : 'Missing'}
                  </div>
                  <div className={`py-1 px-3 rounded-full text-sm font-medium ${auditData.leaveRecords?.summary.hasStatus ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                    status: {auditData.leaveRecords?.summary.hasStatus ? 'Present' : 'Missing'}
                  </div>
                </div>
              </div>
            </div>

            {/* In-Lieu Records Section */}
            {auditData.inLieuRecords?.raw.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">
                  In-Lieu Records ({auditData.inLieuRecords.raw.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">days_added</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">leave_days_added</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {auditData.inLieuRecords.raw.map((record: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/20' : ''}>
                          <td className="px-4 py-2 text-xs font-mono whitespace-nowrap">{record.id}</td>
                          <td className="px-4 py-2 text-xs whitespace-nowrap">{record.date || 'N/A'}</td>
                          <td className="px-4 py-2 text-xs font-mono whitespace-nowrap">
                            {record.days_added !== undefined ? record.days_added : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-xs font-mono whitespace-nowrap">
                            {record.leave_days_added !== undefined ? record.leave_days_added : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-xs whitespace-nowrap">{record.status || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Raw JSON Data (collapsible) */}
            <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <summary className="text-xl font-bold cursor-pointer text-gray-700 dark:text-gray-300">
                Raw JSON Data (Click to expand)
              </summary>
              <div className="mt-4 bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-[500px]">
                <pre className="text-xs font-mono text-gray-800 dark:text-gray-200">{prettyJson(auditData)}</pre>
              </div>
            </details>
          </div>
        ) : (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <p>No audit data available. Please ensure you are logged in.</p>
          </div>
        )}
      </div>
    </Layout>
  );
} 