import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { SalaryCalculation, Employee } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer';
import { Font } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';
import { User } from '@supabase/supabase-js';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import { GetServerSidePropsContext } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

// Server-side authentication
export const getServerSideProps = async ({ req, res }: GetServerSidePropsContext) => {
  // Initialize Supabase with the cookies from the request
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set() { /* Not needed in getServerSideProps */ },
        remove() { /* Not needed in getServerSideProps */ },
      },
    }
  );

  const { data, error } = await supabaseServer.auth.getSession();
  
  // If no session or error, redirect to login
  if (!data.session || error) {
    console.log('Redirecting to login from getServerSideProps: No session found');
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }
  
  // Return authenticated props
  return {
    props: {
      initialSession: data.session,
    }
  };
};

export default function Salary() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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

  // Update the SalaryCalculation interface
  interface SalaryCalculation {
    basicSalary: number;
    costOfLiving: number;
    shiftAllowance: number;
    overtimeHours: number;
    overtimePay: number;
    variablePay: number;
    deduction: number;
    totalSalary: number;
    exchangeRate: number;
  }

  // Update default calculation values
  const defaultSalaryCalc: SalaryCalculation = {
    basicSalary: 0,
    costOfLiving: 0,
    shiftAllowance: 0,
    overtimeHours: 0,
    overtimePay: 0,
    variablePay: 0,
    deduction: 0,
    totalSalary: 0,
    exchangeRate: 0,
  };

  const [salaryCalc, setSalaryCalc] = useState<SalaryCalculation>(defaultSalaryCalc);

  // Enhanced localStorage functions with debugging
  const saveInputsToLocalStorage = (data: SalaryCalculation) => {
    if (typeof window !== 'undefined' && employee?.id) {
      const storageKey = `salary_inputs_${employee.id}`;
      try {
        // Store only user input fields, not calculated values
        const inputsToSave = {
          basicSalary: data.basicSalary,
          costOfLiving: data.costOfLiving,
          shiftAllowance: data.shiftAllowance,
          overtimeHours: data.overtimeHours,
          deduction: data.deduction,
        };
        localStorage.setItem(storageKey, JSON.stringify(inputsToSave));
        console.log('✅ Saved salary inputs to localStorage:', inputsToSave);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    } else {
      console.warn('Cannot save to localStorage: employee ID not available');
    }
  };

  // Enhanced loading function with better debugging
  const loadInputsFromLocalStorage = () => {
    if (typeof window !== 'undefined' && employee?.id) {
      try {
        const storageKey = `salary_inputs_${employee.id}`;
        console.log('Looking for localStorage data with key:', storageKey);
        
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log('✅ Found and loaded salary inputs from localStorage:', parsedData);
          return {
            ...parsedData,
            deduction: parsedData.deduction || 0,
          };
        } else {
          console.log('No saved inputs found in localStorage');
        }
      } catch (error) {
        console.error('Error loading saved inputs:', error);
      }
    } else {
      console.warn('Cannot load from localStorage: employee ID not available');
    }
    return null;
  };

  // Add a function to debounce localStorage saves to avoid excessive storage operations
  const useDebounce = (func: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    return (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };
  
  // Create a debounced version of the save function with 1 second delay
  const debouncedSaveToLocalStorage = useDebounce((data: SalaryCalculation) => {
    saveInputsToLocalStorage(data);
  }, 1000);

  const handleInputChange = (field: keyof SalaryCalculation, value: number) => {
    const newCalc = {
      ...salaryCalc,
      [field]: value,
    };
    
    setSalaryCalc(newCalc);
    
    // Save to localStorage with debounce as user types
    debouncedSaveToLocalStorage(newCalc);
  };

  // Function to calculate variable pay based on basic salary
  const calculateVariablePay = (basicSalary: number): number => {
    // Calculate variable pay: E = ((A+B+C+D)*((exchangeRate/31)-1)
    return (basicSalary + salaryCalc.costOfLiving + salaryCalc.shiftAllowance + salaryCalc.overtimePay) * 
      ((exchangeRate / 31) - 1);
  };

  const calculateSalary = async () => {
    setCalculationLoading(true);
    
    // Extract values from state
    const basicSalary = salaryCalc.basicSalary || 0;
    const costOfLiving = salaryCalc.costOfLiving || 0;
    const shiftAllowance = salaryCalc.shiftAllowance || 0;
    const overtimeHours = salaryCalc.overtimeHours || 0;
    const deduction = salaryCalc.deduction || 0;
    
    // Calculate overtime pay: (basic + cost of living) / 240 * 1.5 * overtime hours
    const overtimeRate = (basicSalary + costOfLiving) / 240 * 1.5;
    const overtimePay = overtimeRate * overtimeHours;
    
    // Calculate variable pay for each formula segment
    const variablePay = calculateVariablePay(basicSalary);
    
    // Calculate total salary with simplified deductions
    const totalSalary = 
      basicSalary + costOfLiving + shiftAllowance + overtimePay + variablePay - 
      deduction;
    
    const newCalc = {
      ...salaryCalc,
      overtimePay,
      variablePay,
      totalSalary,
      exchangeRate,
    };
    
    setSalaryCalc(newCalc);
    
    // Save inputs to localStorage whenever calculation happens
    saveInputsToLocalStorage(newCalc);
    
    // Don't save calculation automatically after calculating
    setCalculationLoading(false);
  };

  // Modify the clear function to provide better feedback
  const clearSavedInputs = () => {
    if (typeof window !== 'undefined' && employee?.id) {
      try {
        const storageKey = `salary_inputs_${employee.id}`;
        localStorage.removeItem(storageKey);
        setSalaryCalc(defaultSalaryCalc);
        alert('Form reset to default values. Your saved inputs have been cleared.');
        console.log('✅ Cleared localStorage data for key:', storageKey);
      } catch (error) {
        console.error('Error clearing localStorage:', error);
        alert('Error clearing saved data. Please try again.');
      }
    } else {
      alert('Cannot clear saved data: Employee information not available');
    }
  };

  // Add a function to apply localStorage data with priority
  const applyLocalStorageData = () => {
    if (employee?.id) {
      const savedInputs = loadInputsFromLocalStorage();
      if (savedInputs) {
        console.log('Applying localStorage data with priority');
        setSalaryCalc(prev => {
          const newState = { ...prev };
          
          // Apply each field individually with explicit checks
          if (savedInputs.basicSalary !== undefined) newState.basicSalary = savedInputs.basicSalary;
          if (savedInputs.costOfLiving !== undefined) newState.costOfLiving = savedInputs.costOfLiving;
          if (savedInputs.shiftAllowance !== undefined) newState.shiftAllowance = savedInputs.shiftAllowance;
          if (savedInputs.overtimeHours !== undefined) newState.overtimeHours = savedInputs.overtimeHours;
          if (savedInputs.deduction !== undefined) newState.deduction = savedInputs.deduction;
          
          return newState;
        });
        return true;
      }
    }
    return false;
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
        deduction: salaryCalc.deduction || 0,
        total_salary: salaryCalc.totalSalary || 0,
        exchange_rate: exchangeRate,
      };
      
      console.log('Saving salary data:', salaryData);
      
      // Always save to localStorage before sending to API
      saveInputsToLocalStorage(salaryCalc);
      
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
          const isProduction = errorText.includes('production environment') || 
                              window.location.hostname !== 'localhost';
          
          if (isProduction) {
            // Show instructions for production environments
            alert(`
DATABASE SCHEMA ERROR: Missing 'absences' column

This is a production environment where automated schema fixes aren't possible.
Please have your database administrator run the following SQL in your Supabase SQL Editor:

ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0;
SELECT refresh_schema_cache();

After running this SQL, refresh the page and try again.
            `);
          } else {
            // For development environments, offer automated fix
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
      
      // Update localStorage again after successful save
      saveInputsToLocalStorage(salaryCalc);
      
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

  // Update the fetchData function to apply localStorage data AFTER database loading
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

      // Set employee data first
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
          deduction: calcData.deduction,
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
            deduction: salaryData.deduction,
            totalSalary: salaryData.total_salary,
            exchangeRate: salaryData.exchange_rate,
          });
        }
      }

      // Fetch other data like history
      await fetchSalaryHistory();

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

  // Modified useEffects to guarantee localStorage priority
  useEffect(() => {
    fetchData();
  }, []);

  // This separate useEffect ensures localStorage values are applied AFTER 
  // the employee data has been set and database data has loaded
  useEffect(() => {
    if (employee?.id) {
      // After a small delay, apply localStorage data with priority
      const timer = setTimeout(() => {
        applyLocalStorageData();
        console.log('Applied localStorage data with delay for employee:', employee.id);
      }, 500);
      
      fetchSalaryHistory();
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]); // Only trigger when employee ID changes

  // Add another timer to recheck after a longer delay to ensure localStorage values are applied
  useEffect(() => {
    if (employee?.id) {
      const timer = setTimeout(() => {
        // Double-check localStorage values were applied properly
        applyLocalStorageData();
        console.log('Final verification of localStorage data for employee:', employee.id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]); // Only trigger when employee ID changes

  // Fetch saved salary data on component mount
  useEffect(() => {
    const fetchSalaryData = async () => {
      if (user) {
        try {
          const response = await axios.get('/api/salary');
          if (response.data) {
            setSalaryCalc(prevData => ({
              ...prevData,
              ...response.data
            }));
          }
        } catch (error) {
          console.error('Error fetching salary data:', error);
        }
      }
    };

    fetchSalaryData();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }

  if (!user) {
    return null;
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
                  <label className="block text-sm font-medium mb-1">Deduction (H)</label>
                  <input
                    type="number"
                    value={salaryCalc.deduction || ''}
                    onChange={(e) => handleInputChange('deduction', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter deduction"
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

                {/* Add Reset Form button */}
                <div className="mt-4 flex items-center space-x-4">
                  <button
                    onClick={clearSavedInputs}
                    className="p-2 text-sm text-red-500 border border-red-300 rounded hover:bg-red-50 transition-colors"
                    type="button"
                  >
                    Reset Form
                  </button>
                  <span className="text-sm text-gray-500">
                    Clears all saved inputs and resets to defaults
                  </span>
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
                  <p className="text-gray-600 text-sm font-medium">Deductions (H)</p>
                  <p className="text-lg font-medium mt-1 text-red-600">
                    {(salaryCalc?.deduction || 0).toFixed(2)} EGP
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg mt-4">
                  <p className="text-gray-600 text-sm font-medium">Total Salary</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{(salaryCalc?.totalSalary || 0).toFixed(2)} EGP</p>
                  <p className="text-xs text-gray-500 mt-1">A + B + C + D + E - H</p>
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
                                          deduction: salary?.deduction || 0,
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