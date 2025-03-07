import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Salary, Leave, InLieuRecord } from '../types';
import Link from 'next/link';
import Head from 'next/head';

export default function Dashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestSalary, setLatestSalary] = useState<Salary | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<number | null>(null);
  const [leaveTaken, setLeaveTaken] = useState<number>(0);
  const [inLieuSummary, setInLieuSummary] = useState({ count: 0, daysAdded: 0 });

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

        // Calculate base leave balance based on years of service
        const baseLeave = employeeData.years_of_service >= 10 ? 24.67 : 18.67;
        
        // Add additional leave balance from in-lieu time
        const additionalLeave = Number(employeeData.annual_leave_balance || 0);
        
        // Fetch leave taken this year
        const currentYear = new Date().getFullYear();
        const { data: leaveData, error: leaveError } = await supabase
          .from('leaves')
          .select('*')
          .eq('employee_id', user.user.id)
          .eq('year', currentYear);

        if (!leaveError && leaveData) {
          const totalDaysTaken = leaveData.reduce((total, leave) => total + (leave.days_taken || 0), 0);
          setLeaveTaken(totalDaysTaken);
        }

        // Calculate final leave balance
        setLeaveBalance(baseLeave + additionalLeave - leaveTaken);

        // Fetch in-lieu records summary
        const { data: inLieuData, error: inLieuError } = await supabase
          .from('in_lieu_records')
          .select('*')
          .eq('employee_id', user.user.id)
          .order('created_at', { ascending: false });

        if (!inLieuError && inLieuData) {
          const totalDaysAdded = inLieuData.reduce((total, record) => 
            total + (record.status === 'approved' ? (record.leave_days_added || 0) : 0), 0);
          
          setInLieuSummary({
            count: inLieuData.length,
            daysAdded: totalDaysAdded
          });
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [leaveTaken]);

  // Format a number to 2 decimal places
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(2);
  };

  // Format salary with commas and fixed decimal places
  const formatSalary = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0.00';
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Dashboard - SalaryCursor</title>
        <meta name="description" content="View your salary and leave information" />
      </Head>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10">
                <svg className="animate-spin w-full h-full text-apple-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          ) : (
            <div>
              {/* Welcome section */}
              <section className="mb-10 text-center sm:text-left">
                <h1 className="text-3xl font-medium text-apple-gray-dark mb-2">
                  Welcome, {employee?.name || 'User'}
                </h1>
                <p className="text-apple-gray">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </section>

              {/* Dashboard cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Salary summary card */}
                <div className="bg-white rounded-apple shadow-apple-card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-medium text-apple-gray-dark">Salary Summary</h2>
                    <Link href="/salary" className="text-apple-blue text-sm font-medium hover:underline">
                      View Details &rarr;
                    </Link>
                  </div>
                  
                  {latestSalary ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-apple-gray text-sm">Latest Salary Period</p>
                        <p className="text-xl font-medium text-apple-gray-dark">
                          {new Date(latestSalary.month).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-apple-gray text-sm">Total Salary (USD)</p>
                        <p className="text-xl font-medium text-apple-gray-dark">
                          ${formatSalary(latestSalary.total_salary)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-apple-gray text-sm">Total Salary (EGP)</p>
                        <p className="text-xl font-medium text-apple-gray-dark">
                          EGP {formatSalary(latestSalary.total_salary * latestSalary.exchange_rate)}
                        </p>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between text-sm">
                          <span className="text-apple-gray">Basic Salary</span>
                          <span className="text-apple-gray-dark font-medium">
                            ${formatSalary(latestSalary.basic_salary)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-apple-gray">Exchange Rate</span>
                          <span className="text-apple-gray-dark font-medium">
                            {latestSalary.exchange_rate} EGP
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <p className="text-apple-gray text-center">No salary information available</p>
                    </div>
                  )}
                </div>

                {/* Leave balance card */}
                <div className="bg-white rounded-apple shadow-apple-card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-medium text-apple-gray-dark">Annual Leave</h2>
                    <Link href="/leave" className="text-apple-blue text-sm font-medium hover:underline">
                      Manage Leave &rarr;
                    </Link>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-apple-gray text-sm">Current Balance</p>
                      <p className="text-xl font-medium text-apple-gray-dark">
                        {formatNumber(leaveBalance)} days
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-apple-gray text-sm">Leave Taken (This Year)</p>
                      <p className="text-xl font-medium text-apple-gray-dark">
                        {leaveTaken} days
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-apple-gray">Entitled Annual Leave</span>
                        <span className="text-apple-gray-dark font-medium">
                          {employee && (employee.years_of_service >= 10 ? '24.67' : '18.67')} days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* In-lieu time summary card */}
                <div className="bg-white rounded-apple shadow-apple-card p-6 hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-medium text-apple-gray-dark">In-Lieu Time</h2>
                    <Link href="/leave" className="text-apple-blue text-sm font-medium hover:underline">
                      View Records &rarr;
                    </Link>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-apple-gray text-sm">Total Records</p>
                      <p className="text-xl font-medium text-apple-gray-dark">
                        {inLieuSummary.count} records
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-apple-gray text-sm">Days Added to Balance</p>
                      <p className="text-xl font-medium text-apple-gray-dark">
                        {inLieuSummary.daysAdded} days
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <button className="mt-2 w-full px-4 py-2 bg-apple-gray-light text-apple-gray-dark rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                        Request New In-Lieu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
} 