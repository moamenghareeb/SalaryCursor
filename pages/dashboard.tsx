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
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Dashboard</h1>
          
          {employee && (
            <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Employee Information</h2>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-lg font-medium mt-1">{employee.name}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="text-lg font-medium mt-1">{employee.employee_id}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Position</p>
                  <p className="text-lg font-medium mt-1">{employee.position}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Years of Service</p>
                  <p className="text-lg font-medium mt-1">{employee.years_of_service}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Salary Information</h2>
              {latestSalary ? (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Month</p>
                    <p className="text-lg font-medium mt-1">
                      {new Date(latestSalary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Salary</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {latestSalary.total_salary.toLocaleString()} EGP
                    </p>
                  </div>
                  <Link 
                    href="/salary" 
                    className="block w-full text-center bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-blue-700"
                  >
                    Manage Salary
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">No salary information available.</p>
                  <Link 
                    href="/salary" 
                    className="block w-full text-center bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-blue-700"
                  >
                    Calculate Salary
                  </Link>
                </div>
              )}
            </div>
            
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Annual Leave</h2>
              {leaveBalance !== null && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Annual Leave Entitlement</p>
                    <p className="text-lg font-medium mt-1">{leaveBalance} days</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Leave Taken This Year</p>
                    <p className="text-lg font-medium mt-1">{leaveTaken} days</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Remaining Leave</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {(leaveBalance - leaveTaken).toFixed(2)} days
                    </p>
                  </div>
                  <Link 
                    href="/leave" 
                    className="block w-full text-center bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-blue-700"
                  >
                    Manage Leave
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
} 