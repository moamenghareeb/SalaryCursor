import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/authContext';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Head from 'next/head';
import axios from 'axios';
import { useRouter } from 'next/router';

type ValidationIssue = {
  table: string;
  recordId: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
};

type ValidationResponse = {
  timestamp: string;
  issues: ValidationIssue[];
  summary: {
    totalRecords: {
      employees: number;
      leaves: number;
      inLieuRecords: number;
      leaveAllocations: number;
    };
    issuesByTable: Record<string, number>;
    issuesBySeverity: {
      high: number;
      medium: number;
      low: number;
    };
  };
};

export default function ValidateLeaveData() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ValidationResponse | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.push('/dashboard');
      return;
    }

    const fetchValidationData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/admin/validate-leave-data');
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchValidationData();
  }, [router]);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Layout>
      <Head>
        <title>Leave Data Validation</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              Leave Data Validation
            </h1>

            {loading && (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {data && (
              <div className="space-y-8">
                {/* Summary Statistics */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">Total Records</p>
                      <dl className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Employees</dt>
                          <dd className="text-sm font-medium text-gray-900">{data.summary.totalRecords.employees}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Leaves</dt>
                          <dd className="text-sm font-medium text-gray-900">{data.summary.totalRecords.leaves}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">In-Lieu Records</dt>
                          <dd className="text-sm font-medium text-gray-900">{data.summary.totalRecords.inLieuRecords}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Leave Allocations</dt>
                          <dd className="text-sm font-medium text-gray-900">{data.summary.totalRecords.leaveAllocations}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">Issues by Severity</p>
                      <dl className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <dt className="text-sm text-red-600">High</dt>
                          <dd className="text-sm font-medium text-red-600">{data.summary.issuesBySeverity.high}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-yellow-600">Medium</dt>
                          <dd className="text-sm font-medium text-yellow-600">{data.summary.issuesBySeverity.medium}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-blue-600">Low</dt>
                          <dd className="text-sm font-medium text-blue-600">{data.summary.issuesBySeverity.low}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">Issues by Table</p>
                      <dl className="mt-2 space-y-1">
                        {Object.entries(data.summary.issuesByTable).map(([table, count]) => (
                          <div key={table} className="flex justify-between">
                            <dt className="text-sm text-gray-600">{table}</dt>
                            <dd className="text-sm font-medium text-gray-900">{count}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">Last Updated</p>
                      <p className="mt-2 text-sm text-gray-900">
                        {new Date(data.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Issues List */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Validation Issues</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Table
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Record ID
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Issue
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Severity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.issues.map((issue, index) => (
                          <tr key={`${issue.table}-${issue.recordId}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {issue.table}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {issue.recordId}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {issue.issue}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'}`}>
                                {issue.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 