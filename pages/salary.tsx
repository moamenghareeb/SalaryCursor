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
    manualOvertimeHours: number;
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
    manualOvertimeHours: 0,
    overtimePay: 0,
    variablePay: 0,
    deduction: 0,
    totalSalary: 0,
    exchangeRate: 0,
  };

  const [salaryCalc, setSalaryCalc] = useState<SalaryCalculation>(defaultSalaryCalc);

  // Add state for overtime data
  const [scheduleOvertimeHours, setScheduleOvertimeHours] = useState(0);
  const [manualOvertimeHours, setManualOvertimeHours] = useState(0);

  // Function to fetch overtime hours for the selected month
  const fetchOvertimeHours = async () => {
    if (!user) {
      console.log('No user found, skipping overtime fetch');
      return;
    }

    try {
      // Calculate start and end dates for the selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0); // Last day of the selected month
      
      console.log('Fetching overtime hours for period:', {
        year: selectedYear,
        month: selectedMonth,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        employeeId: user.id
      });
      
      // First, let's check all shifts for debugging
      const { data: allShifts, error: allShiftsError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
        
      console.log('All shifts found:', allShifts?.length || 0);
      console.log('All shifts:', allShifts?.map(s => ({
        date: s.date,
        type: s.shift_type
      })));
      console.log('Shift types found:', Array.from(new Set(allShifts?.map(s => s.shift_type) || [])));
      
      // Now get overtime shifts with case-insensitive comparison
      const { data: shifts, error: shiftsError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', user.id)
        .or('shift_type.eq.Overtime,shift_type.eq.OVERTIME,shift_type.eq.overtime')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (shiftsError) {
        console.error('Error fetching overtime shifts:', shiftsError);
        throw shiftsError;
      }

      // Calculate total overtime hours (24 hours per overtime shift)
      const scheduleHours = (shifts?.length || 0) * 24;
      console.log('Overtime shifts details:', shifts?.map(s => ({
        date: s.date,
        type: s.shift_type,
        id: s.id
      })));
      console.log('Total overtime shifts found:', shifts?.length || 0);
      console.log('Calculated schedule overtime hours:', scheduleHours);
      setScheduleOvertimeHours(scheduleHours);
      
      // Update salary calculation with total overtime hours
      setSalaryCalc(prev => {
        const basicSalary = prev.basicSalary || 0;
        const costOfLiving = prev.costOfLiving || 0;
        const manualHours = prev.manualOvertimeHours || 0;
        const totalOvertimeHours = scheduleHours + manualHours;
        
        console.log('Updating salary calc with:', {
          scheduleHours,
          manualHours,
          totalOvertimeHours,
          basicSalary,
          costOfLiving
        });
        
        // Calculate overtime pay: ((basic + cost of living) / 210) * overtime hours
        const overtimePay = ((basicSalary + costOfLiving) / 210) * totalOvertimeHours;
        
        // Calculate variable pay
        const shiftAllowance = prev.shiftAllowance || 0;
        const variablePay = (basicSalary + costOfLiving + shiftAllowance + overtimePay) * ((exchangeRate / 31) - 1);
        
        // Calculate total salary
        const totalSalary = 
          basicSalary + 
          costOfLiving + 
          shiftAllowance + 
          overtimePay + 
          variablePay - 
          (prev.deduction || 0);
        
        return {
          ...prev,
          overtimeHours: totalOvertimeHours,
          overtimePay,
          variablePay,
          totalSalary
        };
      });

      // Update the salaries table with the new overtime hours
      const salaryRecord = {
        employee_id: user.id,
        month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
        basic_salary: salaryCalc.basicSalary || 0,
        cost_of_living: salaryCalc.costOfLiving || 0,
        shift_allowance: salaryCalc.shiftAllowance || 0,
        overtime_hours: scheduleHours + (manualOvertimeHours || 0), // Combine both into single field
        overtime_pay: salaryCalc.overtimePay || 0,
        variable_pay: salaryCalc.variablePay || 0,
        deduction: salaryCalc.deduction || 0,
        total_salary: salaryCalc.totalSalary || 0,
        exchange_rate: exchangeRate,
        created_at: new Date().toISOString()
      };

      console.log('Upserting salary record:', salaryRecord);

      // First try to get existing record
      const { data: existingRecord, error: existingError } = await supabase
        .from('salaries')
        .select('id')
        .eq('employee_id', user.id)
        .eq('month', salaryRecord.month)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing record:', existingError);
        toast.error('Failed to check existing salary record');
        return;
      }

      // Update or insert based on existence
      const { error: updateError } = await supabase
        .from('salaries')
        .upsert(salaryRecord, {
          onConflict: 'employee_id,month'
        });

      if (updateError) {
        console.error('Error updating salary record:', updateError);
        toast.error('Failed to update salary record');
      } else {
        console.log('Successfully updated salary record');
        toast.success('Salary record updated successfully');
      }

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
        const scheduleHours = existingRecord.overtime_hours || 0;
        const manualHours = 0; // Reset manual hours when loading a new record
        
        setScheduleOvertimeHours(scheduleHours);
        setManualOvertimeHours(manualHours);
        
        setSalaryCalc({
          basicSalary: existingRecord.basic_salary,
          costOfLiving: existingRecord.cost_of_living,
          shiftAllowance: existingRecord.shift_allowance,
          overtimeHours: scheduleHours + manualHours, // Total overtime is sum of both
          manualOvertimeHours: manualHours,
          overtimePay: existingRecord.overtime_pay,
          variablePay: existingRecord.variable_pay,
          deduction: existingRecord.deduction,
          totalSalary: existingRecord.total_salary,
          exchangeRate: existingRecord.exchange_rate,
        });
        toast.success(`Loaded existing salary record for ${new Date(existingRecord.month).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`);
      } else {
        // Reset all overtime values for a new record
        setScheduleOvertimeHours(0);
        setManualOvertimeHours(0);
        setSalaryCalc(prev => ({
          ...prev,
          overtimeHours: 0,
          manualOvertimeHours: 0,
          overtimePay: 0
        }));
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
    
    // Handle manual overtime input
    if (field === 'manualOvertimeHours') {
      setManualOvertimeHours(value);
      const totalOvertimeHours = scheduleOvertimeHours + value;
      newCalc.overtimeHours = totalOvertimeHours;
      
      // Calculate overtime pay
      const basicSalary = newCalc.basicSalary || 0;
      const costOfLiving = newCalc.costOfLiving || 0;
      const overtimePay = ((basicSalary + costOfLiving) / 210) * totalOvertimeHours;
      newCalc.overtimePay = overtimePay;
      
      // Calculate variable pay
      const shiftAllowance = newCalc.shiftAllowance || 0;
      const variablePay = (basicSalary + costOfLiving + shiftAllowance + overtimePay) * ((exchangeRate / 31) - 1);
      newCalc.variablePay = variablePay;
      
      // Recalculate total salary
      newCalc.totalSalary = 
        basicSalary + 
        costOfLiving + 
        shiftAllowance + 
        overtimePay + 
        variablePay - 
        (newCalc.deduction || 0);
    }
    
    // Automatically calculate overtime pay when basic salary or cost of living changes
    if (field === 'basicSalary' || field === 'costOfLiving') {
      const basicSalary = field === 'basicSalary' ? value : newCalc.basicSalary || 0;
      const costOfLiving = field === 'costOfLiving' ? value : newCalc.costOfLiving || 0;
      const totalOvertimeHours = scheduleOvertimeHours + manualOvertimeHours;
      
      // Calculate overtime pay based on 210 working hours per month
      const overtimePay = ((basicSalary + costOfLiving) / 210) * totalOvertimeHours;
      newCalc.overtimePay = overtimePay;
      
      // Calculate variable pay
      const shiftAllowance = newCalc.shiftAllowance || 0;
      const variablePay = (basicSalary + costOfLiving + shiftAllowance + overtimePay) * ((exchangeRate / 31) - 1);
      newCalc.variablePay = variablePay;
      
      // Recalculate total salary
      newCalc.totalSalary = 
        basicSalary + 
        costOfLiving + 
        shiftAllowance + 
        overtimePay + 
        variablePay - 
        (newCalc.deduction || 0);
    }
    
    setSalaryCalc(newCalc);
    // Save to localStorage with debounce
    debouncedSaveToLocalStorage(newCalc);
  };

  // Modified useEffects to guarantee localStorage priority
  useEffect(() => {
    fetchData();
    // Fetch overtime hours when component mounts
    if (user) {
      fetchOvertimeHours();
    }
  }, []);

  // This separate useEffect ensures localStorage values are applied AFTER 
  // the employee data has been set and database data has loaded
  useEffect(() => {
    if (employee?.id) {
      // After a small delay, apply localStorage data with priority
      const timer = setTimeout(() => {
        applyLocalStorageData();
        // Fetch overtime hours after localStorage data is applied
        fetchOvertimeHours();
        console.log('Applied localStorage data with delay for employee:', employee.id);
      }, 500);
      
      fetchSalaryHistory();
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id, selectedYear, selectedMonth]); // Add selectedYear and selectedMonth as dependencies

  // Add another timer to recheck after a longer delay to ensure localStorage values are applied
  useEffect(() => {
    if (employee?.id) {
      const timer = setTimeout(() => {
        // Double-check localStorage values were applied properly
        applyLocalStorageData();
        // Fetch overtime hours one final time
        fetchOvertimeHours();
        console.log('Final verification of localStorage data for employee:', employee.id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id, selectedYear, selectedMonth]); // Add selectedYear and selectedMonth as dependencies

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
    
    // Calculate overtime pay: ((basic + cost of living) / 210) * overtime hours
    const overtimePay = ((basicSalary + costOfLiving) / 210) * overtimeHours;
    
    // Calculate variable pay
    const variablePay = (basicSalary + costOfLiving + shiftAllowance + overtimePay) * ((exchangeRate / 31) - 1);
    
    // Calculate total salary
    const totalSalary = 
      basicSalary + 
      costOfLiving + 
      shiftAllowance + 
      overtimePay + 
      variablePay - 
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
        overtime_hours: (scheduleOvertimeHours || 0) + (manualOvertimeHours || 0),
        overtime_pay: salaryCalc.overtimePay || 0,
        variable_pay: salaryCalc.variablePay || 0,
        deduction: salaryCalc.deduction || 0,
        total_salary: salaryCalc.totalSalary || 0,
        exchange_rate: exchangeRate,
        created_at: new Date().toISOString()
      };
      
      console.log('Saving salary record:', salaryData);
      
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
            manualOvertimeHours: 0,
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
          manualOvertimeHours: calcData.manual_overtime_hours,
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
            manualOvertimeHours: 0,
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

  // Add test calculation function
  const testCalculation = () => {
    const basicSalary = 23517;
    const costOfLiving = 6300;
    const shiftAllowance = 2200;
    const overtimeHours = 96;
    const deductions = 98.35;
    const exchangeRate = 50.6;

    // Calculate overtime pay
    const overtimePay = ((basicSalary + costOfLiving) / 210) * overtimeHours;
    console.log('Overtime Pay:', overtimePay);

    // Calculate variable pay
    const variablePay = (basicSalary + costOfLiving + shiftAllowance + overtimePay) * ((exchangeRate / 31) - 1);
    console.log('Variable Pay:', variablePay);

    // Calculate total salary
    const totalSalary = basicSalary + costOfLiving + shiftAllowance + overtimePay + variablePay - deductions;
    console.log('Total Salary:', totalSalary);

    return {
      overtimePay,
      variablePay,
      totalSalary
    };
  };

  // Call test calculation
  useEffect(() => {
    const results = testCalculation();
    console.log('Test Calculation Results:', results);
  }, []);

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

      <div className="px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
        {authError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 sm:p-4 rounded-md mb-4 sm:mb-6">
            <p className="text-sm sm:text-base">{authError}</p>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Header section */}
        <section className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1 sm:mb-2">Salary Management</h1>
          <p className="text-sm sm:text-base text-apple-gray dark:text-dark-text-secondary">Calculate and manage salary information for {employee?.name}</p>
        </section>

        {/* Main content grid */}
        <div className="grid gap-4 sm:gap-8 lg:grid-cols-3">
          {/* Salary Calculator Card */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Salary Calculator</h2>
                <button
                  onClick={clearSavedInputs}
                  className="w-full sm:w-auto px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Month/Year Picker */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center mb-4">
                <FiCalendar className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  Select Month & Year
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Month
                  </label>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => handleDateChange(selectedYear, parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year
                  </label>
                  <select 
                    value={selectedYear}
                    onChange={(e) => handleDateChange(parseInt(e.target.value), selectedMonth)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
                    className="w-full px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                  >
                    <div className="flex items-center justify-center">
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                      Current Month
                    </div>
                  </button>
                </div>
              </div>
              
              {salaryHistory && salaryHistory.length > 0 && (
                <div className="mt-3 flex items-center">
                  {salaryHistory.find(salary => {
                    const salaryDate = new Date(salary.month);
                    return salaryDate.getFullYear() === selectedYear && salaryDate.getMonth() + 1 === selectedMonth;
                  }) 
                    ? <div className="flex items-center text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Saved record exists for this month</span>
                      </div>
                    : <div className="flex items-center text-amber-600 dark:text-amber-400">
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">No saved record for this month yet</span>
                      </div>
                  }
                </div>
              )}
            </div>

            {/* Salary Form */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Basic Information */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Basic Salary (EGP)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={salaryCalc.basicSalary || ''}
                        onChange={(e) => handleInputChange('basicSalary', parseFloat(e.target.value) || 0)}
                        className="block w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cost of Living (EGP)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={salaryCalc.costOfLiving || ''}
                        onChange={(e) => handleInputChange('costOfLiving', parseFloat(e.target.value) || 0)}
                        className="block w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Shift Allowance (EGP)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={salaryCalc.shiftAllowance || ''}
                        onChange={(e) => handleInputChange('shiftAllowance', parseFloat(e.target.value) || 0)}
                        className="block w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Overtime and Additional Info */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Overtime Hours
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={scheduleOvertimeHours}
                          className="block w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          readOnly
                        />
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          From Schedule
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={manualOvertimeHours}
                          onChange={(e) => handleInputChange('manualOvertimeHours', Number(e.target.value))}
                          className="block w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                        />
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          Additional
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={salaryCalc.overtimeHours}
                          className="block w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-white"
                          readOnly
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          Total
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Deductions (EGP)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={salaryCalc.deduction || ''}
                        onChange={(e) => handleInputChange('deduction', parseFloat(e.target.value) || 0)}
                        className="block w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Rate Section */}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Exchange Rate</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Last updated: {rateLastUpdated || 'Not available'}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:space-x-3">
                  <span className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                    1 USD = {exchangeRate} EGP
                  </span>
                  <button
                    onClick={manuallyUpdateRate}
                    className="p-2 rounded-md text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <FiRefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-fit">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Calculation Results</h2>
            </div>

            <div className="p-4 sm:p-6">
              {salaryCalc.totalSalary > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Salary</p>
                    <p className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
                      EGP {salaryCalc.totalSalary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <button
                      onClick={calculateSalary}
                      disabled={calculationLoading}
                      className="w-full px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50"
                    >
                      {calculationLoading ? 'Calculating...' : 'Calculate'}
                    </button>

                    <button
                      onClick={saveSalary}
                      disabled={calculationLoading || !salaryCalc.totalSalary}
                      className="w-full px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 disabled:opacity-50"
                    >
                      {calculationLoading ? 'Saving...' : 'Save Salary'}
                    </button>

                    <button
                      onClick={() => {/* PDF generation logic */}}
                      className="w-full px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900"
                    >
                      Generate PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No calculations yet</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter values and click Calculate</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Salary History Section */}
        <div className="mt-4 sm:mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Salary History</h2>
              <button
                onClick={fetchSalaryHistory}
                className="flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiRefreshCw className="w-4 h-4 mr-1.5" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Basic Salary</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {salaryHistory && salaryHistory.length > 0 ? (
                      salaryHistory.map((salary) => {
                        const salaryDate = new Date(salary.month);
                        const isCurrentSelection = 
                          salaryDate.getFullYear() === selectedYear && 
                          salaryDate.getMonth() + 1 === selectedMonth;
                        
                        return (
                          <tr 
                            key={salary.id}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              isCurrentSelection ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                            }`}
                          >
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {isCurrentSelection && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                )}
                                <span className={`text-xs sm:text-sm ${
                                  isCurrentSelection 
                                    ? 'font-medium text-blue-600 dark:text-blue-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {new Date(salary.month).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long'
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {salary.basic_salary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                              {salary.total_salary.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleDateChange(salaryDate.getFullYear(), salaryDate.getMonth() + 1)}
                                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => {/* PDF generation logic */}}
                                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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
                        <td colSpan={4} className="px-3 sm:px-6 py-8 sm:py-10 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          No salary history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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