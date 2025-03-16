import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { Employee } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer';
import { Font } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';
import { User } from '@supabase/supabase-js';
import Head from 'next/head';
import { useTheme } from '../lib/themeContext';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiCalendar } from 'react-icons/fi';
import { useAuth } from '@/lib/hooks/useAuth';
import { SalaryForm } from '@/components/salary/SalaryForm';
import { SalarySummary } from '@/components/salary/SalarySummary';
import { SalaryCalculation as SalaryCalculator } from '@/lib/calculations/salary';

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
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(31.50); // Default fallback
  const [rateLastUpdated, setRateLastUpdated] = useState('');
  
  // Date selection state
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12 format
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [month, setMonth] = useState(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
  
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

  // Add state for overtime data
  const [overtimeHours, setOvertimeHours] = useState(0);

  // Function to fetch overtime hours for the selected month
  const fetchOvertimeHours = async () => {
    if (!user) return;

    try {
      const monthDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      
      // Get overtime hours from salaries table
      const { data, error } = await supabase
        .from('salaries')
        .select('overtime_hours')
        .eq('employee_id', user.id)
        .eq('month', monthDate)
        .maybeSingle();

      if (error) throw error;

      // Set overtime hours and update salary calculation
      const hours = data?.overtime_hours || 0;
      setOvertimeHours(hours);
      
      // Update salary calculation with overtime hours
      setSalaryCalc(prev => {
        const basicSalary = prev.basicSalary || 0;
        const costOfLiving = prev.costOfLiving || 0;
        
        // Calculate overtime pay: (basic + cost of living) / 240 * 1.5 * overtime hours
        const hourlyRate = (basicSalary + costOfLiving) / 240;
        const overtimePay = hourlyRate * 1.5 * hours;
        
        // Calculate total salary
        const totalSalary = 
          basicSalary + 
          costOfLiving + 
          (prev.shiftAllowance || 0) + 
          overtimePay + 
          (prev.variablePay || 0) - 
          (prev.deduction || 0);
        
        return {
          ...prev,
          overtimeHours: hours,
          overtimePay,
          totalSalary
        };
      });
    } catch (error) {
      console.error('Error fetching overtime hours:', error);
      toast.error('Failed to fetch overtime data');
    }
  };

  // Update the handleDateChange function to fetch overtime data
  const handleDateChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setMonth(`${year}-${String(month).padStart(2, '0')}`);
    
    // Look for existing salary record for this month/year
    if (salaryHistory && salaryHistory.length > 0) {
      const formattedMonth = `${year}-${String(month).padStart(2, '0')}`;
      const existingRecord = salaryHistory.find(salary => {
        const salaryDate = new Date(salary.month);
        const salaryYear = salaryDate.getFullYear();
        const salaryMonth = salaryDate.getMonth() + 1;
        return salaryYear === year && salaryMonth === month;
      });
      
      if (existingRecord) {
        // Use existing record
        setSalaryCalc({
          basicSalary: existingRecord.basic_salary,
          costOfLiving: existingRecord.cost_of_living,
          shiftAllowance: existingRecord.shift_allowance,
          overtimeHours: existingRecord.overtime_hours,
          overtimePay: existingRecord.overtime_pay,
          variablePay: existingRecord.variable_pay,
          deduction: existingRecord.deduction,
          totalSalary: existingRecord.total_salary,
          exchangeRate: existingRecord.exchange_rate,
        });
        toast.success(`Loaded existing salary record for ${new Date(existingRecord.month).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`);
      } else {
        // Keep current form values for a new record
        toast(`No existing record for ${new Date(year, month-1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}. You can create a new one.`);
      }
    }

    // Fetch overtime hours for the new month
    fetchOvertimeHours();
  };

  // Update the handleInputChange function to handle overtime calculations
  const handleInputChange = (field: keyof SalaryCalculation, value: number) => {
    // Create the updated calculation object
    const newCalc = {
      ...salaryCalc,
      [field]: value,
    };
    
    // Automatically calculate overtime pay when overtime hours or related fields change
    if (field === 'overtimeHours' || field === 'basicSalary' || field === 'costOfLiving') {
      // Calculate overtime pay: (basic + cost of living) / 240 * 1.5 * overtime hours
      const basicSalary = field === 'basicSalary' ? value : newCalc.basicSalary || 0;
      const costOfLiving = field === 'costOfLiving' ? value : newCalc.costOfLiving || 0;
      const overtimeHours = field === 'overtimeHours' ? value : newCalc.overtimeHours || 0;
      
      // Calculate hourly rate based on 240 working hours per month
      const hourlyRate = (basicSalary + costOfLiving) / 240;
      // Calculate overtime pay at 1.5x rate
      const overtimePay = hourlyRate * 1.5 * overtimeHours;
      
      // Update overtime pay
      newCalc.overtimePay = overtimePay;
      
      // Calculate variable pay
      const variablePay = calculateVariablePay(basicSalary);
      newCalc.variablePay = variablePay;
      
      // Recalculate total salary
      newCalc.totalSalary = 
        basicSalary + costOfLiving + (newCalc.shiftAllowance || 0) + overtimePay + variablePay - 
        (newCalc.deduction || 0);
    }
    
    setSalaryCalc(newCalc);
    // Save to localStorage with debounce
    debouncedSaveToLocalStorage(newCalc);
  };

  // Add useEffect to fetch overtime hours when component mounts
  useEffect(() => {
    if (user) {
      fetchOvertimeHours();
    }
  }, [user, selectedYear, selectedMonth]);

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

  // Function to calculate variable pay based on basic salary
  const calculateVariablePay = (basicSalary: number): number => {
    // Calculate variable pay: E = ((A+B+C+D)*((exchangeRate/31)-1)
    // All values are already in EGP
    return (basicSalary + salaryCalc.costOfLiving + salaryCalc.shiftAllowance + salaryCalc.overtimePay) * 
      ((exchangeRate / 31) - 1);
  };

  const calculateSalary = async () => {
    setCalculationLoading(true);
    
    // Extract values from state - all in EGP
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
      
      // Check if a record for this month already exists
      const { data: existingData, error: existingError } = await supabase
        .from('salaries')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('month', `${month}-01`)
        .limit(1);
      
      let result;
      
      if (existingError) {
        throw new Error(`Error checking for existing records: ${existingError.message}`);
      }
      
      if (existingData && existingData.length > 0) {
        // Update existing record
        const { data, error } = await supabase
          .from('salaries')
          .update(salaryData)
          .eq('id', existingData[0].id)
          .select();
          
        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('salaries')
          .insert(salaryData)
          .select();
          
        if (error) throw error;
        result = data;
      }
      
      // Also save a history record in the calculation table
      const { error: calcError } = await supabase
        .from('salary_calculations')
        .insert({
          ...salaryData,
        });
        
      if (calcError) {
        console.error('Error saving calculation history:', calcError);
      }
      
      toast.success('Salary saved successfully!');
      
      // Refresh salary history
      await fetchSalaryHistory();
      
    } catch (error: any) {
      console.error('Error saving salary:', error);
      toast.error(`Error saving salary: ${error.message}`);
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
      
      console.log(`Fetching salary history for employee ${employee.id}`);
      
      // Fetch from Supabase directly to improve reliability
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', employee.id)
        .order('month', { ascending: false });
      
      if (error) {
        console.error('Error fetching salary history from Supabase:', error);
        toast.error(`Error fetching salary history: ${error.message}`);
        return;
      }
      
      console.log(`Found ${data?.length || 0} salary records`);
      setSalaryHistory(data || []);
      
      // Check if we need to auto-load the currently selected month/year
      if (data && data.length > 0 && selectedMonth && selectedYear) {
        const existingRecord = data.find(salary => {
          const salaryDate = new Date(salary.month);
          const salaryYear = salaryDate.getFullYear();
          const salaryMonth = salaryDate.getMonth() + 1;
          return salaryYear === selectedYear && salaryMonth === selectedMonth;
        });
        
        if (existingRecord) {
          console.log(`Auto-loading record for ${selectedYear}-${selectedMonth}`);
          // Auto-load the record for the selected month
          setSalaryCalc({
            basicSalary: existingRecord.basic_salary,
            costOfLiving: existingRecord.cost_of_living,
            shiftAllowance: existingRecord.shift_allowance,
            overtimeHours: existingRecord.overtime_hours,
            overtimePay: existingRecord.overtime_pay,
            variablePay: existingRecord.variable_pay,
            deduction: existingRecord.deduction,
            totalSalary: existingRecord.total_salary,
            exchangeRate: existingRecord.exchange_rate,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching salary history:', error);
      // More detailed error reporting
      if (error instanceof Error) {
        toast.error(`Error fetching salary history: ${error.message}`);
      } else {
        toast.error('Error fetching salary history: Unknown error');
      }
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

  // Add near the other functions in the component
  const downloadPDF = (salary: any) => {
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
        toast.error(`Error generating PDF: ${error.message || 'Unknown error'}`);
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          <div className="flex justify-center py-12">
            <div className="w-10 h-10">
              <svg className="animate-spin w-full h-full text-apple-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Salary Management - SalaryCursor</title>
        <meta name="description" content="Manage and calculate salary information" />
      </Head>

      <div className="px-4 sm:px-6 lg:px-8">
        {authError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-6">
            <p>{authError}</p>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Header section */}
        <section className="mb-8">
          <h1 className="text-3xl font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">Salary Management</h1>
          <p className="text-apple-gray dark:text-dark-text-secondary">Calculate and manage salary information for {employee?.name}</p>
        </section>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Salary Calculator Card */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Salary Calculator</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearSavedInputs}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-dark-bg text-dark-text-primary hover:bg-dark-surface-light border border-gray-700'
                      : 'bg-white text-apple-gray-dark hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Month/Year Picker */}
            <div className="mb-6 p-4 bg-apple-gray-light dark:bg-gray-800 rounded-lg">
              <div className="flex items-center mb-3">
                <FiCalendar className="w-5 h-5 mr-2 text-apple-blue dark:text-blue-400" />
                <h3 className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary">
                  Select Month & Year
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-secondary mb-1">
                    Month
                  </label>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => handleDateChange(selectedYear, parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 focus:border-apple-blue dark:focus:border-blue-600 outline-none"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-secondary mb-1">
                    Year
                  </label>
                  <select 
                    value={selectedYear}
                    onChange={(e) => handleDateChange(parseInt(e.target.value), selectedMonth)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 focus:border-apple-blue dark:focus:border-blue-600 outline-none"
                  >
                    {/* Generate years from 2020 to current year + 1 */}
                    {Array.from({ length: currentYear - 2020 + 2 }, (_, i) => (
                      <option key={2020 + i} value={2020 + i}>
                        {2020 + i}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => handleDateChange(currentYear, currentMonth)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors w-full ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-apple-blue hover:bg-apple-blue-hover text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                      Current Month
                    </div>
                  </button>
                </div>
              </div>
              
              {salaryHistory && salaryHistory.length > 0 && (
                <div className="mt-3 text-sm text-apple-gray dark:text-dark-text-secondary">
                  {salaryHistory.find(salary => {
                    const salaryDate = new Date(salary.month);
                    const salaryYear = salaryDate.getFullYear();
                    const salaryMonth = salaryDate.getMonth() + 1;
                    return salaryYear === selectedYear && salaryMonth === selectedMonth;
                  }) 
                    ? <span className="text-green-600 dark:text-green-400">✓ Saved record exists for this month</span>
                    : <span className="text-amber-600 dark:text-amber-400">No saved record for this month yet</span>
                  }
                </div>
              )}
            </div>

            {/* Calculator form */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">
                    Basic Salary (EGP)
                  </label>
                  <input
                    type="number"
                    value={salaryCalc.basicSalary || ''}
                    onChange={(e) => handleInputChange('basicSalary', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-apple-blue dark:focus:border-blue-600 focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">
                    Cost of Living (EGP)
                  </label>
                  <input
                    type="number"
                    value={salaryCalc.costOfLiving || ''}
                    onChange={(e) => handleInputChange('costOfLiving', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-apple-blue dark:focus:border-blue-600 focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">
                    Shift Allowance (EGP)
                  </label>
                  <input
                    type="number"
                    value={salaryCalc.shiftAllowance || ''}
                    onChange={(e) => handleInputChange('shiftAllowance', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-apple-blue dark:focus:border-blue-600 focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    value={salaryCalc.overtimeHours || ''}
                    onChange={(e) => handleInputChange('overtimeHours', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-apple-blue dark:focus:border-blue-600 focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">
                    Variable Pay (EGP)
                  </label>
                  <input
                    type="number"
                    value={salaryCalc.variablePay || ''}
                    onChange={(e) => handleInputChange('variablePay', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-apple-blue dark:focus:border-blue-600 focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">
                    Deductions (EGP)
                  </label>
                  <input
                    type="number"
                    value={salaryCalc.deduction || ''}
                    onChange={(e) => handleInputChange('deduction', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-apple-blue dark:focus:border-blue-600 focus:ring-1 focus:ring-apple-blue dark:focus:ring-blue-600 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Exchange Rate Section */}
            <div className="mt-6 p-4 bg-apple-gray-light dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary">Exchange Rate</h3>
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary">
                    Last updated: {rateLastUpdated || 'Not available'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">
                    1 USD = {exchangeRate} EGP
                  </span>
                  <button
                    onClick={manuallyUpdateRate}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-apple-blue hover:bg-apple-blue-hover text-white'
                    }`}
                    aria-label="Refresh exchange rate"
                  >
                    <FiRefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
            <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-6">Calculation Results</h2>
            
            {salaryCalc.totalSalary > 0 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary">Total Salary (EGP)</p>
                  <p className="text-2xl font-medium text-apple-gray-dark dark:text-dark-text-primary">
                    EGP {salaryCalc.totalSalary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={calculateSalary}
                    disabled={calculationLoading}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors mb-2 ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-apple-blue hover:bg-apple-blue-hover text-white'
                    } disabled:opacity-50`}
                  >
                    {calculationLoading ? 'Calculating...' : 'Calculate'}
                  </button>
                  
                  <button
                    onClick={saveSalary}
                    disabled={calculationLoading || !salaryCalc.totalSalary}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-apple-blue hover:bg-apple-blue-hover text-white'
                    } disabled:opacity-50`}
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
                            toast.error(`Error generating PDF: ${error.message || 'Unknown error'}`);
                          });
                        } catch (error) {
                          setPdfLoading(false);
                          console.error('PDF generation error:', error);
                          toast.error(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }}
                      className={`w-full mt-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-dark-bg text-dark-text-primary hover:bg-dark-surface-light border border-gray-700'
                          : 'bg-white text-apple-gray-dark hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Generate PDF
                    </button>
                  )}
                </div>
              </div>
            )}

            {!salaryCalc.totalSalary && (
              <div className="text-center py-8">
                <p className="text-apple-gray dark:text-dark-text-secondary">No calculations yet</p>
                <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">Enter values and click Calculate</p>
              </div>
            )}
          </div>
        </div>

        {/* Salary History Section */}
        <div className="mt-8 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Salary History</h2>
            <button
              onClick={fetchSalaryHistory}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-apple-blue hover:bg-apple-blue-hover text-white'
              }`}
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-apple-gray dark:text-dark-text-secondary">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-apple-gray dark:text-dark-text-secondary">Basic Salary (EGP)</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-apple-gray dark:text-dark-text-secondary">Total (EGP)</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-apple-gray dark:text-dark-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory && salaryHistory.length > 0 ? (
                  salaryHistory.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()).map((salary) => {
                    const salaryDate = new Date(salary.month);
                    const salaryYear = salaryDate.getFullYear();
                    const salaryMonth = salaryDate.getMonth() + 1;
                    const isCurrentSelection = salaryYear === selectedYear && salaryMonth === selectedMonth;
                    
                    return (
                      <tr 
                        key={salary.id} 
                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          isCurrentSelection ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {isCurrentSelection && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            )}
                            <span className={isCurrentSelection ? 'font-medium text-blue-600 dark:text-blue-400' : ''}>
                              {new Date(salary.month).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          {salary.basic_salary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          {salary.total_salary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-2 px-4">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleDateChange(salaryYear, salaryMonth)}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                isDarkMode
                                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              Load
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  // Generate PDF for historical salary
                                  setPdfLoading(true);
                                  
                                  const historicalSalaryData: SalaryCalculation = {
                                    basicSalary: salary.basic_salary,
                                    costOfLiving: salary.cost_of_living,
                                    shiftAllowance: salary.shift_allowance,
                                    overtimeHours: salary.overtime_hours,
                                    overtimePay: salary.overtime_pay,
                                    variablePay: salary.variable_pay,
                                    deduction: salary.deduction,
                                    totalSalary: salary.total_salary,
                                    exchangeRate: salary.exchange_rate,
                                  };
                                  
                                  const formattedMonth = new Date(salary.month).toISOString().substring(0, 7);
                                  
                                  const MyDocument = () => (
                                    <Document>
                                      <SalaryPDF 
                                        salary={historicalSalaryData}
                                        employee={employee as Employee} 
                                        month={formattedMonth}
                                        exchangeRate={salary.exchange_rate}
                                      />
                                    </Document>
                                  );
                                  
                                  const pdfBlob = pdf(<MyDocument />).toBlob();
                                  pdfBlob.then(blob => {
                                    setPdfLoading(false);
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `${employee?.name}_salary_${formattedMonth}.pdf`;
                                    link.click();
                                    // Clean up the URL object after download
                                    setTimeout(() => URL.revokeObjectURL(url), 100);
                                  }).catch(error => {
                                    setPdfLoading(false);
                                    console.error('PDF generation error:', error);
                                    toast.error(`Error generating PDF: ${error.message || 'Unknown error'}`);
                                  });
                                } catch (error) {
                                  setPdfLoading(false);
                                  console.error('PDF generation error:', error);
                                  toast.error(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                }
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                isDarkMode
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-apple-blue hover:bg-apple-blue-hover text-white'
                              }`}
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-apple-gray dark:text-dark-text-secondary">
                      No salary history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {pdfModalOpen && employee && calculationResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-dark-surface rounded-apple w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Salary PDF Preview</h3>
              <button
                onClick={() => setPdfModalOpen(false)}
                className="text-apple-gray dark:text-gray-300 hover:text-apple-gray-dark"
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