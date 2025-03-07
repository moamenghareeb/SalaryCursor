import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { SalaryCalculation, Employee } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer';
import { Font } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';
import { User } from '@supabase/supabase-js';
import Head from 'next/head';

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
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [calculationResults, setCalculationResults] = useState<SalaryCalculation | null>(null);

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

  // Modified useEffects to guarantee localStorage priority
  useEffect(() => {
    fetchData();
  }, []);

  // This separate useEffect ensures localStorage values are applied AFTER 
  // the employee data has been set and database data has loaded
  useEffect(() => {
    if (employee?.id && !loading) {
      // After a small delay to ensure database data is loaded
      const timer = setTimeout(() => {
        const savedInputs = loadInputsFromLocalStorage();
        if (savedInputs) {
          setSalaryCalc(prev => ({
            ...prev,
            basicSalary: savedInputs.basicSalary || prev.basicSalary,
            costOfLiving: savedInputs.costOfLiving || prev.costOfLiving,
            shiftAllowance: savedInputs.shiftAllowance || prev.shiftAllowance,
            overtimeHours: savedInputs.overtimeHours || prev.overtimeHours,
            deduction: savedInputs.deduction || prev.deduction,
          }));
          console.log('Applied localStorage data with delay for employee:', employee.id);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [employee?.id, loading]);

  // Enhanced localStorage functions with debugging
  const saveInputsToLocalStorage = (data: SalaryCalculation) => {
    if (typeof window !== 'undefined' && employee?.id) {
      const storageKey = `salary_inputs_${employee.id}`;
      try {
        // Store only user input fields, not calculated values
        const inputsToSave = {
          basicSalary: data.basicSalary || 0,
          costOfLiving: data.costOfLiving || 0,
          shiftAllowance: data.shiftAllowance || 0,
          overtimeHours: data.overtimeHours || 0,
          deduction: data.deduction || 0,
        };
        localStorage.setItem(storageKey, JSON.stringify(inputsToSave));
        console.log('✅ Saved salary inputs to localStorage:', inputsToSave);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
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
            basicSalary: parsedData.basicSalary || 0,
            costOfLiving: parsedData.costOfLiving || 0,
            shiftAllowance: parsedData.shiftAllowance || 0,
            overtimeHours: parsedData.overtimeHours || 0,
            deduction: parsedData.deduction || 0,
          };
        } else {
          console.log('No saved inputs found in localStorage');
        }
      } catch (error) {
        console.error('Error loading saved inputs:', error);
      }
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
      
      // First get user and employee data
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

      // Set employee data
      setEmployee(employeeData);

      // Fetch exchange rate
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
          console.warn("Exchange rate API failed, using fallback rate");
        }
      } catch (err) {
        console.warn("Exchange rate API error, using fallback rate:", err);
      }

      // First try to get the latest calculation
      const { data: calcData, error: calcError } = await supabase
        .from('salary_calculations')
        .select('*')
        .eq('employee_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!calcError && calcData) {
        const newCalc = {
          basicSalary: calcData.basic_salary || 0,
          costOfLiving: calcData.cost_of_living || 0,
          shiftAllowance: calcData.shift_allowance || 0,
          overtimeHours: calcData.overtime_hours || 0,
          overtimePay: calcData.overtime_pay || 0,
          variablePay: calcData.variable_pay || 0,
          deduction: calcData.deduction || 0,
          totalSalary: calcData.total_salary || 0,
          exchangeRate: calcData.exchange_rate || exchangeRate,
        };
        setSalaryCalc(newCalc);
        // Save to localStorage after setting from DB
        saveInputsToLocalStorage(newCalc);
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
          const newCalc = {
            basicSalary: salaryData.basic_salary || 0,
            costOfLiving: salaryData.cost_of_living || 0,
            shiftAllowance: salaryData.shift_allowance || 0,
            overtimeHours: salaryData.overtime_hours || 0,
            overtimePay: salaryData.overtime_pay || 0,
            variablePay: salaryData.variable_pay || 0,
            deduction: salaryData.deduction || 0,
            totalSalary: salaryData.total_salary || 0,
            exchangeRate: salaryData.exchange_rate || exchangeRate,
          };
          setSalaryCalc(newCalc);
          // Save to localStorage after setting from DB
          saveInputsToLocalStorage(newCalc);
        }
      }

      // Fetch salary history
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

  if (loading) {
    return (
      <Layout>
        <Head>
          <title>Salary Management - SalaryCursor</title>
          <meta name="description" content="Manage and calculate salary information" />
        </Head>

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
              {/* Header section */}
              <section className="mb-8">
                <h1 className="text-3xl font-medium text-apple-gray-dark mb-2">Salary Management</h1>
                <p className="text-apple-gray">Calculate and manage salary information for {employee?.name}</p>
              </section>

              {/* Main content grid */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Salary Calculator Card */}
                <div className="lg:col-span-2 bg-white rounded-apple shadow-apple-card p-6">
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-lg font-medium text-apple-gray-dark">Salary Calculator</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={clearSavedInputs}
                        className="px-4 py-2 text-sm text-apple-gray-dark bg-apple-gray-light rounded-full hover:bg-gray-200 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={calculateSalary}
                        disabled={calculationLoading}
                        className="px-4 py-2 text-sm text-white bg-apple-blue rounded-full hover:bg-apple-blue-hover transition-colors disabled:opacity-50"
                      >
                        {calculationLoading ? 'Calculating...' : 'Calculate'}
                      </button>
                    </div>
                  </div>

                  {/* Calculator form */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-dark mb-1">
                          Basic Salary (USD)
                        </label>
                        <input
                          type="number"
                          value={salaryCalc.basicSalary || ''}
                          onChange={(e) => handleInputChange('basicSalary', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-dark mb-1">
                          Cost of Living (USD)
                        </label>
                        <input
                          type="number"
                          value={salaryCalc.costOfLiving || ''}
                          onChange={(e) => handleInputChange('costOfLiving', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-dark mb-1">
                          Shift Allowance (USD)
                        </label>
                        <input
                          type="number"
                          value={salaryCalc.shiftAllowance || ''}
                          onChange={(e) => handleInputChange('shiftAllowance', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-dark mb-1">
                          Overtime Hours
                        </label>
                        <input
                          type="number"
                          value={salaryCalc.overtimeHours || ''}
                          onChange={(e) => handleInputChange('overtimeHours', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-dark mb-1">
                          Variable Pay (USD)
                        </label>
                        <input
                          type="number"
                          value={salaryCalc.variablePay || ''}
                          onChange={(e) => handleInputChange('variablePay', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-dark mb-1">
                          Deductions (USD)
                        </label>
                        <input
                          type="number"
                          value={salaryCalc.deduction || ''}
                          onChange={(e) => handleInputChange('deduction', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate Section */}
                  <div className="mt-6 p-4 bg-apple-gray-light rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-medium text-apple-gray-dark">Exchange Rate</h3>
                        <p className="text-sm text-apple-gray">
                          Last updated: {rateLastUpdated || 'Not available'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-medium text-apple-gray-dark">
                          1 USD = {exchangeRate} EGP
                        </span>
                        <button
                          onClick={manuallyUpdateRate}
                          className="p-2 text-apple-blue hover:text-apple-blue-hover"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results Card */}
                <div className="bg-white rounded-apple shadow-apple-card p-6">
                  <h2 className="text-lg font-medium text-apple-gray-dark mb-6">Calculation Results</h2>
                  
                  {salaryCalc.totalSalary > 0 && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-apple-gray">Total Salary (USD)</p>
                        <p className="text-2xl font-medium text-apple-gray-dark">
                          ${salaryCalc.totalSalary.toFixed(2)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-apple-gray">Total Salary (EGP)</p>
                        <p className="text-2xl font-medium text-apple-gray-dark">
                          EGP {(salaryCalc.totalSalary * exchangeRate).toFixed(2)}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <button
                          onClick={saveSalary}
                          disabled={calculationLoading || !salaryCalc.totalSalary}
                          className="w-full px-4 py-2 bg-apple-blue text-white rounded-full hover:bg-apple-blue-hover transition-colors disabled:opacity-50"
                        >
                          {calculationLoading ? 'Saving...' : 'Save Salary'}
                        </button>
                        
                        {salaryCalc.totalSalary > 0 && (
                          <button
                            onClick={() => {
                              try {
                                setPdfLoading(true);
                                
                                const MyDocument = () => (
                                  <Document>
                                    <SalaryPDF 
                                      salary={salaryCalc}
                                      employee={employee as Employee} 
                                      month={month}
                                      exchangeRate={exchangeRate}
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
                            className="w-full mt-2 px-4 py-2 bg-apple-gray-light text-apple-gray-dark rounded-full hover:bg-gray-200 transition-colors"
                          >
                            Generate PDF
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!salaryCalc.totalSalary && (
                    <div className="text-center py-8">
                      <p className="text-apple-gray">No calculations yet</p>
                      <p className="text-sm text-apple-gray mt-1">Enter values and click Calculate</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Salary History Section */}
              <div className="mt-8 bg-white rounded-apple shadow-apple-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-apple-gray-dark">Salary History</h2>
                  <button
                    onClick={fetchSalaryHistory}
                    className="px-4 py-2 text-sm text-apple-gray-dark bg-apple-gray-light rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-sm font-medium text-apple-gray">Month</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-apple-gray">Basic Salary</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-apple-gray">Total (USD)</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-apple-gray">Total (EGP)</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-apple-gray">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryHistory.map((salary, index) => (
                        <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-apple-gray-dark">
                            {new Date(salary.month).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long'
                            })}
                          </td>
                          <td className="text-right py-3 px-4 text-apple-gray-dark">
                            ${salary.basic_salary.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 text-apple-gray-dark">
                            ${salary.total_salary.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 text-apple-gray-dark">
                            EGP {(salary.total_salary * salary.exchange_rate).toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <button
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
                                          exchangeRate: salary?.exchange_rate || exchangeRate
                                        }}
                                        employee={employee as Employee}
                                        month={salary.month}
                                        exchangeRate={salary.exchange_rate || exchangeRate}
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
                              className="text-apple-blue hover:text-apple-blue-hover"
                            >
                              View PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {salaryHistory.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-apple-gray">No salary history available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PDF Modal */}
        {pdfModalOpen && employee && calculationResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-apple w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="text-lg font-medium text-apple-gray-dark">Salary PDF Preview</h3>
                <button
                  onClick={() => setPdfModalOpen(false)}
                  className="text-apple-gray hover:text-apple-gray-dark"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 h-[calc(90vh-80px)] overflow-auto">
                <PDFViewer width="100%" height="100%">
                  <SalaryPDF
                    employee={employee}
                    salary={calculationResults}
                    month={month}
                    exchangeRate={exchangeRate}
                  />
                </PDFViewer>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }
} 