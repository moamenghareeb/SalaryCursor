import React from 'react';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { SalaryCalculation, Employee } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer';
import { Font } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';
import { User } from '@supabase/supabase-js';

// Register fonts - use direct font import
Font.register({
  family: 'Roboto',
  format: "truetype",
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 'normal'
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 'bold'
    }
  ]
});

export default function Salary() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(31.50); // Default fallback
  const [rateLastUpdated, setRateLastUpdated] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const defaultSalaryCalc: SalaryCalculation = {
    basicSalary: 0,
    costOfLiving: 0,
    shiftAllowance: 0,
    overtimeHours: 0,
    overtimePay: 0,
    variablePay: 0,
    actAsPay: 0,
    pensionPlan: 0,
    retroactiveDeduction: 0,
    premiumCardDeduction: 0,
    mobileDeduction: 0,
    absences: 0,
    sickLeave: 0,
    totalSalary: 0,
    exchangeRate: exchangeRate,
  };

  const [salaryCalc, setSalaryCalc] = useState<SalaryCalculation>(defaultSalaryCalc);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setAuthError(null);
        
        // Fetch exchange rate from cached endpoint
        try {
          console.log("Fetching exchange rate...");
          const rateResponse = await fetch('/api/exchange-rate');
          
          if (rateResponse.ok) {
            const rateData = await rateResponse.json();
            if (rateData.rate) {
              setExchangeRate(rateData.rate);
              const lastUpdated = new Date(rateData.lastUpdated);
              setRateLastUpdated(lastUpdated.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }));
            }
          } else {
            console.warn("API failed, using fallback rate");
          }
        } catch (err) {
          console.warn("Exchange rate API error, using fallback", err);
        }

        // Fetch employee data
        const { data: userData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          setAuthError('Authentication failed. Please try logging in again.');
          return;
        }

        if (!userData?.user) {
          setAuthError('No user found. Please log in.');
          return;
        }

        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', userData.user.id)
          .single();

        if (employeeError) {
          if (employeeError.code === 'PGRST116') {
            setAuthError('Employee record not found. Please contact your administrator.');
          } else {
            setAuthError(`Error fetching employee data: ${employeeError.message}`);
          }
          return;
        }

        setEmployee(employeeData);

        // First try to get the latest calculation
        const { data: calcData, error: calcError } = await supabase
          .from('salary_calculations')
          .select('*')
          .eq('employee_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!calcError && calcData) {
          setSalaryCalc({
            basicSalary: calcData.basic_salary,
            costOfLiving: calcData.cost_of_living,
            shiftAllowance: calcData.shift_allowance,
            overtimeHours: calcData.overtime_hours,
            overtimePay: calcData.overtime_pay,
            variablePay: calcData.variable_pay,
            actAsPay: calcData.act_as_pay,
            pensionPlan: calcData.pension_plan,
            retroactiveDeduction: calcData.retroactive_deduction,
            premiumCardDeduction: calcData.premium_card_deduction,
            mobileDeduction: calcData.mobile_deduction,
            absences: calcData.absences,
            sickLeave: calcData.sick_leave,
            totalSalary: calcData.total_salary,
            exchangeRate: calcData.exchange_rate,
          });
        } else {
          // If no calculation found, try to get from salaries table
          const { data: salaryData, error: salaryError } = await supabase
            .from('salaries')
            .select('*')
            .eq('employee_id', userData.user.id)
            .order('month', { ascending: false })
            .limit(1)
            .single();

          if (!salaryError && salaryData) {
            setSalaryCalc({
              basicSalary: salaryData.basic_salary,
              costOfLiving: salaryData.cost_of_living,
              shiftAllowance: salaryData.shift_allowance,
              overtimeHours: salaryData.overtime_hours,
              overtimePay: salaryData.overtime_pay,
              variablePay: salaryData.variable_pay,
              actAsPay: salaryData.act_as_pay,
              pensionPlan: salaryData.pension_plan,
              retroactiveDeduction: salaryData.retroactive_deduction,
              premiumCardDeduction: salaryData.premium_card_deduction,
              mobileDeduction: salaryData.mobile_deduction,
              absences: salaryData.absences,
              sickLeave: salaryData.sick_leave,
              totalSalary: salaryData.total_salary,
              exchangeRate: salaryData.exchange_rate,
            });
          }
        }

        // Fetch salary history
        const { data: historyData, error: historyError } = await supabase
          .from('salaries')
          .select('*')
          .eq('employee_id', userData.user.id)
          .order('month', { ascending: false });

        if (historyError) {
          console.error('Error fetching salary history:', historyError);
        } else {
          setSalaryHistory(historyData || []);
        }

        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
          .from('employees')
          .select('is_admin')
          .eq('id', userData.user.id)
          .single();
        
        if (!adminError && adminData) {
          setIsAdmin(adminData.is_admin || false);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setAuthError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field: keyof SalaryCalculation, value: number) => {
    setSalaryCalc((prev) => ({ ...prev, [field]: value }));
  };

  // Function to calculate variable pay based on basic salary
  const calculateVariablePay = (basicSalary: number): number => {
    // Calculate variable pay: E = ((A+B+C+D)*((exchangeRate/31)-1)
    return (basicSalary + salaryCalc.costOfLiving + salaryCalc.shiftAllowance + salaryCalc.overtimePay) * 
      ((exchangeRate / 31) - 1);
  };

  const calculateSalary = async () => {
    if (!employee) return;
    
    // Process input values
    const basicSalary = salaryCalc.basicSalary || 0;
    const costOfLiving = salaryCalc.costOfLiving || 0;
    const shiftAllowance = salaryCalc.shiftAllowance || 0;
    const overtimeHours = salaryCalc.overtimeHours || 0;
    const actAsPay = salaryCalc.actAsPay || 0;
    const pensionPlan = salaryCalc.pensionPlan || 0;
    const retroactiveDeduction = salaryCalc.retroactiveDeduction || 0;
    const premiumCardDeduction = salaryCalc.premiumCardDeduction || 0;
    const mobileDeduction = salaryCalc.mobileDeduction || 0;
    const absences = salaryCalc.absences || 0;
    const sickLeave = salaryCalc.sickLeave || 0;
    
    // Calculate overtime pay: (basic + cost of living) / 240 * 1.5 * overtime hours
    const overtimeRate = (basicSalary + costOfLiving) / 240 * 1.5;
    const overtimePay = overtimeRate * overtimeHours;
    
    // Calculate variable pay for each formula segment
    const variablePay = calculateVariablePay(basicSalary);
    
    // Calculate total salary
    const totalSalary = 
      basicSalary + costOfLiving + shiftAllowance + overtimePay + variablePay +
      actAsPay - pensionPlan - retroactiveDeduction - premiumCardDeduction -
      mobileDeduction - absences - sickLeave;
    
    const newCalc = {
      ...salaryCalc,
      overtimePay,
      variablePay,
      totalSalary,
      exchangeRate,
    };
    
    setSalaryCalc(newCalc);

    // Don't save calculation automatically after calculating
    setCalculationLoading(false);
  };

  const saveSalary = async () => {
    if (!employee || !exchangeRate) {
      alert('Missing employee information or exchange rate');
      return;
    }
    
    setCalculationLoading(true);
    
    try {
      // Get the current session to extract the access token
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        throw new Error('Authentication error. Please sign in again.');
      }
      
      console.log('Saving salary for month:', month);
      
      const salaryData = {
        employee_id: employee.id,
        month: `${month}-01`,
        basic_salary: salaryCalc.basicSalary || 0,
        cost_of_living: salaryCalc.costOfLiving || 0,
        shift_allowance: salaryCalc.shiftAllowance || 0,
        overtime_hours: salaryCalc.overtimeHours || 0,
        overtime_pay: salaryCalc.overtimePay || 0,
        variable_pay: salaryCalc.variablePay || 0,
        act_as_pay: salaryCalc.actAsPay || 0,
        pension_plan: salaryCalc.pensionPlan || 0,
        retroactive_deduction: salaryCalc.retroactiveDeduction || 0,
        premium_card_deduction: salaryCalc.premiumCardDeduction || 0,
        mobile_deduction: salaryCalc.mobileDeduction || 0,
        absences: salaryCalc.absences || 0,
        sick_leave: salaryCalc.sickLeave || 0,
        total_salary: salaryCalc.totalSalary || 0,
        exchange_rate: exchangeRate,
      };
      
      console.log('Saving salary data:', salaryData);
      
      // Use the new unified API endpoint with explicit token
      const response = await fetch('/api/salary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(salaryData),
        credentials: 'include', // Still include cookies as a fallback
      });
      
      if (!response.ok) {
        let errorText = 'Failed to save salary';
        let errorDetails = '';
        let missingColumn = '';
        
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
          errorDetails = errorData.details || '';
          missingColumn = errorData.missingColumn || '';
        } catch (e) {
          // If we can't parse JSON, use the status text
          errorText = `${errorText}: ${response.statusText}`;
        }
        
        // Special handling for missing absences column
        if (missingColumn === 'absences' || errorText.includes('absences column')) {
          const fixIt = confirm(`
Database schema error: The 'absences' column is missing from your database.

Would you like to automatically apply a fix to add this column?
          `);
          
          if (fixIt) {
            // Try to apply the fix directly
            try {
              console.log('Attempting to fix absences column...');
              
              const fixResponse = await fetch('/api/admin/fix-schema', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                  fix: 'add_absences_column',
                  migration: '20240305_add_absences_column.sql' 
                })
              });
              
              if (fixResponse.ok) {
                alert('Schema fixed successfully! Retrying to save salary data...');
                
                // Wait a moment for schema to update
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Try saving again recursively (only once)
                await saveSalary();
                return;
              } else {
                const fixErrorData = await fixResponse.json();
                throw new Error(`Failed to fix schema: ${fixErrorData.error || 'Unknown error'}`);
              }
            } catch (fixError) {
              console.error('Error fixing schema:', fixError);
              alert(`
Could not automatically fix the database schema. Please:

1. Run the migration script "20240305_add_absences_column.sql" in your Supabase project
2. Refresh the page and try again

Technical details: ${fixError instanceof Error ? fixError.message : 'Unknown error'}
              `);
            }
          } else {
            alert(`
Please have your database administrator run the migration script "20240305_add_absences_column.sql"
to add the missing absences column to the salaries table.
            `);
          }
          
          throw new Error(errorText);
        }
        
        // For other errors, just show the error message
        if (errorDetails) {
          throw new Error(`${errorText}\n\n${errorDetails}`);
        } else {
          throw new Error(errorText);
        }
      }
      
      // Refresh salary history immediately using the new API
      await fetchSalaryHistory();
      
      alert('Salary saved successfully!');
    } catch (error) {
      console.error('Error in saveSalary:', error);
      alert(error instanceof Error ? error.message : 'Failed to save salary. Please try again.');
    } finally {
      setCalculationLoading(false);
    }
  };
  
  const fetchSalaryHistory = async () => {
    try {
      if (!employee) return;
      
      // Get the current session to extract the access token
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        throw new Error('Authentication error. Please sign in again.');
      }
      
      // Use the new unified API endpoint with explicit token
      const response = await fetch(`/api/salary?employee_id=${employee.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include', // Still include cookies as a fallback
      });
      
      if (!response.ok) {
        console.error('Error fetching salary history:', response.statusText);
        return;
      }
      
      const data = await response.json();
      setSalaryHistory(data || []);
    } catch (error) {
      console.error('Error fetching salary history:', error);
    }
  };

  const manuallyUpdateRate = async () => {
    try {
      console.log('Attempting to update rate...');
      
      // First check if user is still authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        alert('Authentication error. Please sign in again.');
        return;
      }
      
      const response = await fetch('/api/admin/update-exchange-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Update successful, new rate:', data.rate);
        
        // Update local state
        setExchangeRate(data.rate);
        const now = new Date();
        setRateLastUpdated(now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }));
        
        alert(`Rate updated successfully to: ${data.rate}`);
      } else {
        let errorMessage = 'Failed to update rate';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        console.error('Update failed:', errorMessage);
        alert(`Failed to update rate: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error in update function:', error);
      alert(`Error updating rate: ${error}`);
    }
  };

  // Add a test function for authentication
  const testAuth = async () => {
    try {
      // Get the current session to extract the access token
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Session error:', authError);
      }
      
      // Prepare headers based on session availability
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('Using access_token in Authorization header');
      } else {
        console.log('No access_token available');
      }
      
      const response = await fetch('/api/auth-test', {
        headers,
        credentials: 'include', // Include cookies as fallback
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        alert(`Auth test failed: ${data.message || data.error || 'Unknown error'}`);
        console.error('Auth test failed:', data);
      } else {
        alert(`Auth test successful! User: ${data.user.email} (Method: ${data.authMethod})`);
        console.log('Auth test successful:', data);
      }
    } catch (error) {
      alert(`Auth test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Auth test error:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }

  if (authError) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {authError}
          </div>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with auth test button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={testAuth}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300"
          >
            Test Auth
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Salary Calculator</h1>
          
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Current Exchange Rate</h2>
              <p className="text-xl sm:text-lg">
                1 USD = <span className="font-bold text-green-600">{exchangeRate.toFixed(2)} EGP</span>
              </p>
              {rateLastUpdated && <p className="text-xs text-gray-500 mt-1">Last updated: {rateLastUpdated}</p>}
              <p className="text-xs text-gray-500 mt-1">* 30-day average, updated daily at 18:00 Cairo time</p>
              {isAdmin && (
                <button 
                  onClick={manuallyUpdateRate}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                >
                  Update Now (Admin Only)
                </button>
              )}
            </div>
            
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Calculate Salary</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Month</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full p-3 border rounded text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Basic Salary (A)</label>
                  <input
                    type="number"
                    value={salaryCalc.basicSalary || ''}
                    onChange={(e) => handleInputChange('basicSalary', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter basic salary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Cost of Living (B)</label>
                  <input
                    type="number"
                    value={salaryCalc.costOfLiving || ''}
                    onChange={(e) => handleInputChange('costOfLiving', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter cost of living"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Shift Allowance (C)</label>
                  <input
                    type="number"
                    value={salaryCalc.shiftAllowance || ''}
                    onChange={(e) => handleInputChange('shiftAllowance', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter shift allowance"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    value={salaryCalc.overtimeHours || ''}
                    onChange={(e) => handleInputChange('overtimeHours', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter overtime hours"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Act As Pay (F)</label>
                  <input
                    type="number"
                    value={salaryCalc.actAsPay || ''}
                    onChange={(e) => handleInputChange('actAsPay', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter act as pay"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Pension Plan Employee Contribution (G)</label>
                  <input
                    type="number"
                    value={salaryCalc.pensionPlan || ''}
                    onChange={(e) => handleInputChange('pensionPlan', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter pension plan contribution"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Retroactive Deduction (H)</label>
                  <input
                    type="number"
                    value={salaryCalc.retroactiveDeduction || ''}
                    onChange={(e) => handleInputChange('retroactiveDeduction', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter retroactive deduction"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Premium Card Deduction (I)</label>
                  <input
                    type="number"
                    value={salaryCalc.premiumCardDeduction || ''}
                    onChange={(e) => handleInputChange('premiumCardDeduction', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter premium card deduction"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile Deduction (J)</label>
                  <input
                    type="number"
                    value={salaryCalc.mobileDeduction || ''}
                    onChange={(e) => handleInputChange('mobileDeduction', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter mobile deduction"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Absences (K)</label>
                  <input
                    type="number"
                    value={salaryCalc.absences || ''}
                    onChange={(e) => handleInputChange('absences', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter absences"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Sick Leave (L)</label>
                  <input
                    type="number"
                    value={salaryCalc.sickLeave || ''}
                    onChange={(e) => handleInputChange('sickLeave', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded text-base"
                    placeholder="Enter sick leave"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2">
                  <button 
                    onClick={calculateSalary}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-3"
                    disabled={calculationLoading}
                  >
                    {calculationLoading ? 'Calculating...' : 'Calculate'}
                  </button>
                  <button 
                    onClick={saveSalary}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    disabled={calculationLoading || !salaryCalc.totalSalary}
                  >
                    {calculationLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Salary Results</h2>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm font-medium">Overtime Pay (D)</p>
                  <p className="text-lg font-medium mt-1">{(salaryCalc?.overtimePay || 0).toFixed(2)} EGP</p>
                  <p className="text-xs text-gray-500 mt-1">((A+B)/210) * Overtime Hours</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm font-medium">Variable Pay (E)</p>
                  <p className="text-lg font-medium mt-1">{(salaryCalc?.variablePay || 0).toFixed(2)} EGP</p>
                  <p className="text-xs text-gray-500 mt-1">((A+B+C+D) * ((exchange rate/31) - 1))</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm font-medium">Act As Pay (F)</p>
                  <p className="text-lg font-medium mt-1">{(salaryCalc?.actAsPay || 0).toFixed(2)} EGP</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm font-medium">Deductions (G+H+I+J+K+L)</p>
                  <p className="text-lg font-medium mt-1 text-red-600">
                    {(
                      (salaryCalc?.pensionPlan || 0) +
                      (salaryCalc?.retroactiveDeduction || 0) +
                      (salaryCalc?.premiumCardDeduction || 0) +
                      (salaryCalc?.mobileDeduction || 0) +
                      (salaryCalc?.absences || 0) +
                      (salaryCalc?.sickLeave || 0)
                    ).toFixed(2)} EGP
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg mt-4">
                  <p className="text-gray-600 text-sm font-medium">Total Salary</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{(salaryCalc?.totalSalary || 0).toFixed(2)} EGP</p>
                  <p className="text-xs text-gray-500 mt-1">A + B + C + D + E + F - (G + H + I + J + K + L)</p>
                </div>
              </div>
              
              {calculationLoading ? (
                <div className="mt-4 flex flex-col items-center">
                  <p>Generating PDF...</p>
                  <div className="mt-2 w-8 h-8 border-t-2 border-primary border-solid rounded-full animate-spin"></div>
                </div>
              ) : (
                salaryCalc.totalSalary > 0 && (
                  <div className="mt-8 p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Results</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Overtime Pay</p>
                        <p className="text-lg">{salaryCalc.overtimePay?.toFixed(2)} EGP</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Variable Pay</p>
                        <p className="text-lg">{salaryCalc.variablePay?.toFixed(2)} EGP</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Total Salary</p>
                        <p className="text-xl font-bold text-green-600">{salaryCalc.totalSalary?.toFixed(2)} EGP</p>
                        <p className="text-sm text-gray-500">≈ ${(salaryCalc.totalSalary / exchangeRate).toFixed(2)} USD</p>
                      </div>
                    </div>
                    
                    <div 
                      className="mt-4 text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center"
                      onClick={() => {
                        try {
                          setPdfLoading(true);
                          
                          const MyDocument = () => (
                            <Document>
                              <SalaryPDF 
                                salary={salaryCalc}
                                employee={employee as Employee} 
                                month={month} 
                              />
                            </Document>
                          );
                          
                          const pdfBlob = pdf(<MyDocument />).toBlob();
                          pdfBlob.then(blob => {
                            setPdfLoading(false);
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${employee?.name}_salary_${month}.pdf`;
                            link.click();
                            // Clean up the URL object after download
                            setTimeout(() => URL.revokeObjectURL(url), 100);
                          }).catch(error => {
                            setPdfLoading(false);
                            console.error('PDF generation error:', error);
                            alert(`Error generating PDF: ${error.message || 'Unknown error'}`);
                          });
                        } catch (error) {
                          setPdfLoading(false);
                          console.error('PDF generation error:', error);
                          alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }}
                    >
                      {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          
          <div className="mt-6 sm:mt-8 bg-white shadow rounded-lg p-4 sm:p-6 overflow-hidden">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Salary History</h2>
            
            {salaryHistory.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CoL</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Var</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {salaryHistory.map((salary) => (
                        <tr key={salary.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm">
                            {new Date(salary.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-3 py-3 text-sm">{(salary.basic_salary || 0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-sm">{(salary.cost_of_living || 0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-sm">{(salary.shift_allowance || 0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-sm">{(salary.overtime_pay || 0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-sm">{(salary.variable_pay || 0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-sm font-medium">{(salary.total_salary || 0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-sm">
                            <button 
                              className="text-red-600 hover:text-red-800"
                              onClick={() => {
                                try {
                                  const MyDocument = () => (
                                    <Document>
                                      <SalaryPDF 
                                        salary={{
                                          basicSalary: salary?.basic_salary || 0,
                                          costOfLiving: salary?.cost_of_living || 0,
                                          shiftAllowance: salary?.shift_allowance || 0,
                                          overtimeHours: salary?.overtime_hours || 0,
                                          overtimePay: salary?.overtime_pay || 0,
                                          variablePay: salary?.variable_pay || 0,
                                          actAsPay: salary?.act_as_pay || 0,
                                          pensionPlan: salary?.pension_plan || 0,
                                          retroactiveDeduction: salary?.retroactive_deduction || 0,
                                          premiumCardDeduction: salary?.premium_card_deduction || 0,
                                          mobileDeduction: salary?.mobile_deduction || 0,
                                          absences: salary?.absences || 0,
                                          sickLeave: salary?.sick_leave || 0,
                                          totalSalary: salary?.total_salary || 0,
                                          exchangeRate: salary?.exchange_rate || exchangeRate || 31.50,
                                        }}
                                        employee={employee as Employee} 
                                        month={new Date(salary.month).toISOString().substring(0, 7)} 
                                      />
                                    </Document>
                                  );
                                  
                                  const pdfBlob = pdf(<MyDocument />).toBlob();
                                  pdfBlob.then(blob => {
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `${employee?.name}_salary_${new Date(salary.month).toISOString().substring(0, 7)}.pdf`;
                                    link.click();
                                    // Clean up the URL object after download
                                    setTimeout(() => URL.revokeObjectURL(url), 100);
                                  }).catch(error => {
                                    console.error('PDF generation error:', error);
                                    alert(`Error generating PDF: ${error.message || 'Unknown error'}`);
                                  });
                                } catch (error) {
                                  console.error('PDF generation error:', error);
                                  alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                }
                              }}
                            >
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No salary history available.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 