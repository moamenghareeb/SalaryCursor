import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalEmployees: number;
  totalLeaveTaken: number;
  remainingLeave: number;
  recentLeaveRequests: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Direct approach - query the database tables directly
      // Get employee count
      const { count: employeeCount, error: empError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });
      
      if (empError) throw new Error('Failed to fetch employee data');
      
      // Get leave data
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (leaveError) throw new Error('Failed to fetch leave data');

      // Calculate total leave taken
      const totalLeaveTaken = leaveData?.reduce((sum, leave) => sum + (leave.days_taken || 0), 0) || 0;
      
      // Get leave balance if available
      const { data: user } = await supabase.auth.getUser();
      let remainingLeave = 0;
      
      if (user?.user?.id) {
        const { data: employee } = await supabase
          .from('employees')
          .select('annual_leave_balance')
          .eq('id', user.user.id)
          .single();
          
        remainingLeave = employee?.annual_leave_balance || 0;
      }

      setStats({
        totalEmployees: employeeCount || 0,
        totalLeaveTaken,
        remainingLeave,
        recentLeaveRequests: leaveData?.slice(0, 5) || []
      });
      
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError('Unable to load dashboard statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">Total Leave Taken</h3>
        <p className="mt-2 text-3xl font-bold text-indigo-600">
          {stats?.totalLeaveTaken || 0} days
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">Remaining Leave</h3>
        <p className="mt-2 text-3xl font-bold text-green-600">
          {stats?.remainingLeave || 0} days
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">Recent Requests</h3>
        <p className="mt-2 text-3xl font-bold text-blue-600">
          {stats?.recentLeaveRequests.length || 0}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">Total Employees</h3>
        <p className="mt-2 text-3xl font-bold text-purple-600">
          {stats?.totalEmployees || 0}
        </p>
      </div>
    </div>
  );
} 