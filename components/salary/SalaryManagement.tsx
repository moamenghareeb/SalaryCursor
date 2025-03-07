import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Employee, SalaryDetails, LeaveBalance, LeaveRequest } from '../../types';
import SalaryBreakdown from './SalaryBreakdown';
import LeaveOverview from './LeaveOverview';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

interface SalaryManagementProps {
  employeeId?: string;
}

export default function SalaryManagement({ employeeId }: SalaryManagementProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [salaryDetails, setSalaryDetails] = useState<SalaryDetails | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch employee details
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .single();

        if (employeeError) throw new Error('Failed to fetch employee details');
        setEmployee(employeeData);

        // Fetch salary details
        const { data: salaryData, error: salaryError } = await supabase
          .from('salary_details')
          .select('*')
          .eq('employee_id', employeeId)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1)
          .single();

        if (salaryError) throw new Error('Failed to fetch salary details');
        setSalaryDetails(salaryData);

        // Fetch leave balance
        const { data: leaveData, error: leaveError } = await supabase
          .from('leave_balance')
          .select('*')
          .eq('employee_id', employeeId)
          .single();

        if (leaveError) throw new Error('Failed to fetch leave balance');
        setLeaveBalance(leaveData);

        // Fetch leave history
        const { data: historyData, error: historyError } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employeeId)
          .order('start_date', { ascending: false });

        if (historyError) throw new Error('Failed to fetch leave history');
        setLeaveHistory(historyData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId]);

  const handleRequestLeave = () => {
    // TODO: Implement leave request modal/form
    console.log('Request leave clicked');
  };

  if (loading) {
    return <LoadingSpinner size="large" />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }

  if (!employee || !salaryDetails || !leaveBalance) {
    return <ErrorMessage message="Employee data not found" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Employee Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="mr-2">Employee ID:</span>
            <span className="font-medium">{employee.employeeId}</span>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="mr-2">Department:</span>
            <span className="font-medium">{employee.department}</span>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="mr-2">Position:</span>
            <span className="font-medium">{employee.position}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Salary Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-6">Salary Information</h3>
          <SalaryBreakdown salary={salaryDetails} />
        </section>

        {/* Leave Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-6">Leave Management</h3>
          <LeaveOverview
            balance={leaveBalance}
            history={leaveHistory}
            onRequestLeave={handleRequestLeave}
          />
        </section>
      </div>
    </div>
  );
} 