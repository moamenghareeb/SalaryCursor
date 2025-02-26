import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Salary, Leave } from '../types';
import Link from 'next/link';

export default function Dashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestSalary, setLatestSalary] = useState<Salary | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<number | null>(null);
  const [leaveTaken, setLeaveTaken] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        
        if (!user.user) return;

        // Fetch employee details
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', user.user.id)
          .single();

        if (employeeError) throw employeeError;
        setEmployee(employeeData);

        // Fetch latest salary
        const { data: salaryData, error: salaryError } = await supabase
          .from('salaries')
          .select('*')
          .eq('employee_id', user.user.id)
          .order('month', { ascending: false })
          .limit(1)
          .single();

        if (!salaryError) {
          setLatestSalary(salaryData);
        }

        // Calculate leave balance
        const totalLeave = employeeData.years_of_service >= 10 ? 24.67 : 18.67;
        setLeaveBalance(totalLeave);

        // Calculate leave taken this year
        const currentYear = new Date().getFullYear();
        const { data: leaveData, error: leaveError } = await supabase
          .from('leaves')
          .select('days_taken')
          .eq('employee_id', user.user.id)
          .eq('year', currentYear);

        if (!leaveError && leaveData) {
          const total = leaveData.reduce((sum, item) => sum + item.days_taken, 0);
          setLeaveTaken(total);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {employee && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Employee Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium">{employee.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Employee ID</p>
                <p className="font-medium">{employee.employee_id}</p>
              </div>
              <div>
                <p className="text-gray-600">Position</p>
                <p className="font-medium">{employee.position}</p>
              </div>
              <div>
                <p className="text-gray-600">Years of Service</p>
                <p className="font-medium">{employee.years_of_service}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Salary Information</h2>
            {latestSalary ? (
              <div>
                <div className="mb-4">
                  <p className="text-gray-600">Month</p>
                  <p className="font-medium">{new Date(latestSalary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="mb-4">
                  <p className="text-gray-600">Total Salary</p>
                  <p className="font-medium text-xl text-green-600">{latestSalary.total_salary.toLocaleString()} EGP</p>
                </div>
                <Link 
                  href="/salary" 
                  className="inline-block mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Manage Salary
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">No salary information available.</p>
                <Link 
                  href="/salary" 
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Calculate Salary
                </Link>
              </div>
            )}
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Annual Leave</h2>
            {leaveBalance !== null && (
              <div>
                <div className="mb-4">
                  <p className="text-gray-600">Annual Leave Entitlement</p>
                  <p className="font-medium">{leaveBalance} days</p>
                </div>
                <div className="mb-4">
                  <p className="text-gray-600">Leave Taken This Year</p>
                  <p className="font-medium">{leaveTaken} days</p>
                </div>
                <div className="mb-4">
                  <p className="text-gray-600">Remaining Leave</p>
                  <p className="font-medium text-xl text-blue-600">{(leaveBalance - leaveTaken).toFixed(2)} days</p>
                </div>
                <Link 
                  href="/leave" 
                  className="inline-block mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Manage Leave
                </Link>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
} 