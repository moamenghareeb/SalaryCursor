import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { SalaryCalculation, Employee } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer';
import { Font } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';
import { User } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { FaDownload, FaSpinner } from 'react-icons/fa';

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
  const [isSaving, setIsSaving] = useState(false);

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
        console.log('Checking if localStorage data should be applied');
        
        // Only apply localStorage data if:
        // 1. There's no salary data yet (basicSalary is 0 or undefined)
        // 2. User specifically wants to restore saved inputs but not calculated values
        if (!salaryCalc.basicSalary) {
          console.log('Applying localStorage data - no existing salary data found');
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
        } else {
          console.log('Not applying localStorage data - salary data already exists');
        }
      }
    }
    return false;
  };

  const manuallyRestoreLocalStorage = () => {
    if (employee?.id) {
      const savedInputs = loadInputsFromLocalStorage();
      if (savedInputs) {
        console.log('Manually restoring localStorage data');
        
        // Create confirmation message with details of what will be restored
        const confirmMsg = `
Restore these saved inputs?

Basic Salary: ${savedInputs.basicSalary || 0}
Cost of Living: ${savedInputs.costOfLiving || 0}
Shift Allowance: ${savedInputs.shiftAllowance || 0}
Overtime Hours: ${savedInputs.overtimeHours || 0}
Deduction: ${savedInputs.deduction || 0}
        `;
        
        if (confirm(confirmMsg)) {
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
          
          // After manual restore, recalculate to update derived values
          setTimeout(() => {
            calculateSalary();
          }, 100);
          
          return true;
        }
      } else {
        alert('No saved inputs found to restore');
      }
    }
    return false;
  };

  const saveSalary = async () => {
    try {
      setIsSaving(true);
      
      // Format month to ensure it's in YYYY-MM-01 format
      const formattedMonth = `${month.substring(0, 7)}-01`;
      console.log(`Saving salary data for employee ID: ${employee?.id}, month: ${formattedMonth}`);
      
      if (!employee?.id) {
        console.error('Cannot save salary: No employee ID available');
        toast.error('Cannot save salary: No employee ID available');
        setIsSaving(false);
        return;
      }

      // Prepare the salary data with all required fields
      const salaryData = {
        employee_id: employee.id,
        month: formattedMonth,
        basic_salary: salaryCalc.basicSalary,
        cost_of_living: salaryCalc.costOfLiving,
        shift_allowance: salaryCalc.shiftAllowance,
        overtime_hours: salaryCalc.overtimeHours,
        overtime_pay: salaryCalc.overtimePay,
        variable_pay: salaryCalc.variablePay,
        deduction: salaryCalc.deduction,
        total_salary: salaryCalc.totalSalary,
        exchange_rate: exchangeRate,
      };
      
      console.log('Saving salary data:', salaryData);
      
      // Save to localStorage for backup/offline use
      if (typeof window !== 'undefined') {
        const localStorageKey = `salary_${employee.id}_${formattedMonth}`;
        localStorage.setItem(localStorageKey, JSON.stringify({
          basicSalary: salaryCalc.basicSalary,
          costOfLiving: salaryCalc.costOfLiving,
          shiftAllowance: salaryCalc.shiftAllowance,
          overtimeHours: salaryCalc.overtimeHours,
          variablePay: salaryCalc.variablePay,
          deduction: salaryCalc.deduction,
          timestamp: new Date().toISOString()
        }));
        console.log(`Saved to localStorage with key: ${localStorageKey}`);
      }

      // Save to database
      const response = await fetch('/api/salary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salaryData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Error saving salary data:', result);
        toast.error(`Failed to save: ${result.error || 'Unknown error'}`);
        setIsSaving(false);
        return;
      }
      
      console.log('Salary data saved successfully:', result);
      toast.success('Salary data saved successfully!');
      
      // Refresh data to ensure we have the latest
      await fetchData();
      
    } catch (error) {
      console.error('Exception during salary save:', error);
      toast.error(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
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
      setLoading(true);
      console.log('Fetching data for salary calculator...');
      
      // Fetch exchange rates
      try {
        const exchangeRateResponse = await fetch('/api/exchange-rates');
        if (exchangeRateResponse.ok) {
          const rates = await exchangeRateResponse.json();
          setExchangeRate(rates.USD_to_EGP || 30.9);
          console.log('Exchange rate loaded:', rates.USD_to_EGP || 30.9);
        } else {
          console.warn('Failed to fetch exchange rates, using default value');
          setExchangeRate(30.9);
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
        setExchangeRate(30.9);
      }
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session, user not authenticated');
        setLoading(false);
        return;
      }
      
      const userId = session.user.id;
      console.log('User authenticated, ID:', userId);
      
      // Fetch employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        toast.error('Failed to load employee data');
        setLoading(false);
        return;
      }
      
      if (!employeeData) {
        console.error('No employee record found for user');
        toast.error('No employee record found');
        setLoading(false);
        return;
      }
      
      console.log('Employee data loaded:', employeeData.id);
      setEmployee(employeeData);
      
      // Get current month in YYYY-MM-01 format
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
      setMonth(currentMonth);
      
      console.log(`Fetching salary data for employee ${employeeData.id}, month ${currentMonth}`);
      
      const { data: salaryData, error: salaryError } = await supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!salaryError && salaryData) {
        console.log('Found latest salary data:', salaryData);
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
      } else {
        console.log('No salary data found or error:', salaryError);
        
        // If no salary data, try to get from salary_calculations table as fallback
        const { data: calcData, error: calcError } = await supabase
          .from('salary_calculations')
          .select('*')
          .eq('employee_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!calcError && calcData) {
          console.log('Found salary calculation data:', calcData);
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
          console.log('No salary calculation data found or error:', calcError);
        }
      }

      // Fetch other data like history
      await fetchSalaryHistory();

      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('employees')
        .select('is_admin')
        .eq('id', userId)
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

  // Update this function to have proper TypeScript types
  const checkAndApplyLocalStorage = (empId: string, month: string) => {
    if (typeof window === 'undefined') return;
    
    const localStorageKey = `salary_${empId}_${month}`;
    const savedData = localStorage.getItem(localStorageKey);
    
    if (!savedData) {
      console.log('No localStorage data found for current month');
      return;
    }
    
    try {
      const parsedData = JSON.parse(savedData);
      const savedTimestamp = new Date(parsedData.timestamp);
      console.log(`Found localStorage data from ${savedTimestamp.toLocaleString()}`);
      
      // Only apply localStorage data if we have no database data (all values are 0)
      const hasExistingData = salaryCalc.basicSalary > 0 || salaryCalc.costOfLiving > 0 || salaryCalc.shiftAllowance > 0;
      
      if (!hasExistingData) {
        console.log('No existing salary data found, applying localStorage data');
        setSalaryCalc(prev => ({
          ...prev,
          basicSalary: parsedData.basicSalary || 0,
          costOfLiving: parsedData.costOfLiving || 0,
          shiftAllowance: parsedData.shiftAllowance || 0,
          overtimeHours: parsedData.overtimeHours || 0,
          overtimePay: parsedData.overtimePay || 0,
          variablePay: parsedData.variablePay || 0,
          deduction: parsedData.deduction || 0,
          totalSalary: parsedData.totalSalary || 0,
          exchangeRate: parsedData.exchangeRate || exchangeRate || 31.50,
        }));
      } else {
        console.log('Existing salary data found, not applying localStorage data automatically');
      }
    } catch (error) {
      console.error('Error parsing localStorage data:', error);
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

                {/* Find the Reset Form button and add the Restore Saved Inputs button next to it */}
                <div className="flex space-x-2 mt-4">
                  <button
                    type="button"
                    onClick={clearSavedInputs}
                  >
                    Reset Form
                  </button>
                  <button
                    onClick={manuallyRestoreLocalStorage}
                    className="p-2 text-sm text-blue-500 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                    type="button"
                  >
                    Restore Saved Inputs
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