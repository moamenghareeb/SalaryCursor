import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { Employee } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer';
import { Font } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';
import { toSimplifiedEmployee } from '@/lib/utils/employeeUtils';
import { User } from '@supabase/supabase-js';
import Head from 'next/head';
import { useTheme } from '../lib/themeContext';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiCalendar } from 'react-icons/fi';
import { useAuth } from '@/lib/hooks/useAuth';
import { SalaryForm } from '@/components/salary/SalaryForm';
import { SalarySummary } from '@/components/salary/SalarySummary';
import {
  BasicSalaryCalculation,
  defaultSalaryCalc,
  calculateOvertimePay,
  calculateTotalSalary,
  calculateEffectiveOvertimeHours,
  testCalculation
} from '@/lib/calculations/salary';
import { getOvertimeSummary, OvertimeType } from '@/lib/services/overtimeService';
import { getMonthlyExchangeRate, getCurrentMonthExchangeRate } from '@/lib/services/exchangeRates';
import {
  saveInputsToLocalStorage,
  loadInputsFromLocalStorage,
  clearSavedInputs
} from '@/lib/storage/salary';

// Register fonts - use system fonts
Font.register({
  family: 'Helvetica',
  format: "truetype",
  src: 'Helvetica'
});

// Register bold font
Font.register({
  family: 'Helvetica-Bold',
  format: "truetype",
  src: 'Helvetica-Bold'
});

// Add the debounce hook
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

// Helper function to get the date range for a month
const getDateRangeForMonth = (year: number, month: number) => {
  // Create start date (first day of month)
  const startDate = new Date(year, month, 1);
  startDate.setHours(0, 0, 0, 0);
  
  // Create end date (last day of month)
  const endDate = new Date(year, month + 1, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

export default function Salary() {
  const { isDarkMode } = useTheme();
  const auth = useAuth();
  const user = auth.data?.user;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(31.50); // Default fallback
  const [rateRatio, setRateRatio] = useState(0); // Rate/30.8 ratio
  const [rateLastUpdated, setRateLastUpdated] = useState('');
  const [lastRateUpdate, setLastRateUpdate] = useState<string>('');

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
  const [calculationResults, setCalculationResults] = useState<BasicSalaryCalculation | null>(null);
  const [showSalarySummary, setShowSalarySummary] = useState(false);

  const [salaryCalc, setSalaryCalc] = useState<BasicSalaryCalculation>(defaultSalaryCalc);

  // Add state for overtime data
  const [scheduleOvertimeHours, setScheduleOvertimeHours] = useState(0);
  const [manualOvertimeHours, setManualOvertimeHours] = useState(0);
  const [overtimeSummary, setOvertimeSummary] = useState<{ 
    dayHours: number; 
    nightHours: number; 
    holidayHours: number; 
    effectiveHours: number;
    totalHours: number;
  }>({ 
    dayHours: 0, 
    nightHours: 0, 
    holidayHours: 0, 
    effectiveHours: 0,
    totalHours: 0
  });

  // Add state for storing monthly salary calculations
  const [monthlyCalculations, setMonthlyCalculations] = useState<Array<{
    month: string;
    totalSalary?: number;
    rate?: number;
    error?: string;
  }>>([]);

  // Create a debounced version of the save function with 1 second delay
  const debouncedSaveToLocalStorage = useDebounce((data: BasicSalaryCalculation) => {
    if (employee?.id) {
      saveInputsToLocalStorage(data, employee.id);
    }
  }, 1000);

  // Fetch overtime hours for the selected month
  const fetchOvertimeHours = async () => {
    try {
      if (!employee) {
        console.log('No employee data, skipping overtime fetch');
        return;
      }
      
      // Format date range for the month
      const today = new Date();
      const year = selectedYear || today.getFullYear();
      const month = selectedMonth ? selectedMonth - 1 : today.getMonth();
      
      // Start date is first day of month, end date is last day of month
      const { startDate, endDate } = getDateRangeForMonth(year, month);
      console.log('Date range calculation (with time):', { startDate, endDate, startDateString: startDate.substring(0, 10), endDateString: endDate.substring(0, 10), year, month: month + 1 });
      
      // Query the overtime table for entries in this month
      const { data: overtimeEntries, error: overtimeError } = await supabase
        .from('overtime')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', startDate.substring(0, 10))
        .lte('date', endDate.substring(0, 10));
        
      if (overtimeError) {
        console.error('Error fetching overtime entries:', overtimeError);
      } else {
        console.log('Overtime entries found from overtime table:', overtimeEntries?.length || 0);
        console.log('Overtime details:', overtimeEntries);
        
        // Calculate total overtime hours from the overtime table
        const totalHours = overtimeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;
        console.log('Total overtime hours from overtime table:', totalHours);
        
        // Update the schedule overtime hours
        setScheduleOvertimeHours(totalHours);
        
        // Update the salary calculation with new overtime hours
        setSalaryCalc(prev => {
          const totalOvertimeHours = totalHours + (manualOvertimeHours || 0);
          const basicSalary = prev.basicSalary || 0;
          const costOfLiving = prev.costOfLiving || 0;
          const shiftAllowance = prev.shiftAllowance || 0;
          const exchangeRate = prev.exchangeRate || 31.50;
          const deduction = prev.deduction || 0;

          // Calculate overtime pay using the formula: ((Basic Salary + Cost of living)/210) * overtime total hrs
          const hourlyRate = (basicSalary + costOfLiving) / 210;
          const overtimePay = hourlyRate * totalOvertimeHours;

          // Calculate the rate ratio (Exchange Rate/30.8)
          const currentRateRatio = exchangeRate / 30.8;

          // Get other earnings value (or default to 0)
          const otherEarnings = prev.otherEarnings || 0;

          // Calculate total salary using the new formula: [(X+Y+Z+E+O)*(Rate/30.8)]-F
          const totalSalary = calculateTotalSalary(
            basicSalary,
            costOfLiving,
            shiftAllowance,
            otherEarnings,
            overtimePay,
            exchangeRate,
            deduction
          );

          return {
            ...prev,
            overtimeHours: totalOvertimeHours,
            overtimePay,
            totalSalary,
            rateRatio: currentRateRatio
          };
        });
      }
    } catch (error) {
      console.error('Error in fetchOvertimeHours:', error);
      setScheduleOvertimeHours(0); // Set to 0 on error to avoid stale data
    }
  };

  // Update the handleDateChange function to fetch overtime data and exchange rates
  const handleDateChange = async (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    
    // Format month string for database queries
    const formattedMonth = `${year}-${String(month).padStart(2, '0')}`;
    const fullDateStr = `${formattedMonth}-01`; // YYYY-MM-DD format required by database
    setMonth(formattedMonth);
    
    try {
      // Show loading indicator
      setCalculationLoading(true);
      
      // Fetch the exchange rate for this specific month from the database
      const { data: rateData, error: rateError } = await supabase
        .from('monthly_exchange_rates')
        .select('average_rate, updated_at')
        .eq('month', fullDateStr)
        .single();
      
      if (rateError && rateError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching exchange rate:', rateError);
        toast.error(`Failed to fetch exchange rate for ${formattedMonth}`);
      } else if (rateData) {
        // Update the exchange rate in the UI
        const monthRate = rateData.average_rate;
        setExchangeRate(monthRate);
        setRateRatio(monthRate / 30.8);
        setRateLastUpdated(new Date(rateData.updated_at).toLocaleString());
        console.log(`Loaded exchange rate for ${formattedMonth}: ${monthRate.toFixed(4)}`);
      } else {
        // No rate found for this month, use default
        console.warn(`No exchange rate found for ${formattedMonth}, using default rate`);
        toast(`Using default exchange rate (31.50) for ${formattedMonth}`);
        setExchangeRate(31.50);
        setRateRatio(31.50 / 30.8);
      }
    } catch (err) {
      console.error('Error in exchange rate fetch:', err);
    } finally {
      setCalculationLoading(false);
    }
    
    // Reset overtime hours immediately to avoid showing stale data
    setScheduleOvertimeHours(0);
    
    // Look for existing salary record for this month/year
    if (salaryHistory && salaryHistory.length > 0) {
      const existingRecord = salaryHistory.find(salary => {
        const salaryDate = new Date(salary.month);
        const salaryYear = salaryDate.getFullYear();
        const salaryMonth = salaryDate.getMonth() + 1;
        return salaryYear === year && salaryMonth === month;
      });
      
      if (existingRecord) {
        // Use existing record
        const scheduleHours = existingRecord.overtime_hours || 0;
        const manualHours = existingRecord.manual_overtime_hours || 0; // Keep manual hours from record
        
        setScheduleOvertimeHours(scheduleHours);
        setManualOvertimeHours(manualHours);
        
        // Use the newly fetched exchange rate instead of the record's rate
        setSalaryCalc({
          basicSalary: existingRecord.basic_salary,
          costOfLiving: existingRecord.cost_of_living,
          shiftAllowance: existingRecord.shift_allowance,
          otherEarnings: existingRecord.other_earnings || 0, // Added other earnings with fallback
          overtimeHours: existingRecord.overtime_hours,
          manualOvertimeHours: 0,
          dayOvertimeHours: 0, // Use default value instead of reading from DB
          nightOvertimeHours: 0, // Use default value instead of reading from DB
          holidayOvertimeHours: 0, // Use default value instead of reading from DB
          effectiveOvertimeHours: existingRecord.overtime_hours || 0, // Use overtime_hours directly
          overtimePay: existingRecord.overtime_pay,
          variablePay: existingRecord.variable_pay || 0,
          deduction: existingRecord.deduction,
          totalSalary: existingRecord.total_salary,
          exchangeRate: existingRecord.exchange_rate || 31.50,
          rateRatio: existingRecord.exchange_rate ? existingRecord.exchange_rate / 30.8 : 0, // Calculate rate ratio
        });
        toast.success(`Loaded salary record for ${new Date(existingRecord.month).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`);
      }
    }

    // Fetch overtime hours for the new month
    await fetchOvertimeHours();
    
    // Refresh data once more to ensure consistency
    setTimeout(() => {
      fetchOvertimeHours();
    }, 500);
  };

  // Update the handleInputChange function to recalculate total salary immediately
  const handleInputChange = (field: keyof BasicSalaryCalculation, value: number) => {
    setSalaryCalc(prev => {
      const updatedCalc = {
        ...prev,
        [field]: value
      };

      // For manualOvertimeHours, we need to update the total overtime hours
      if (field === 'manualOvertimeHours') {
        // Use the schedule hours (from shifts) + new manual hours value
        // This prevents double-counting when manual hours are changed
        const scheduleHours = scheduleOvertimeHours || 0;
        updatedCalc.overtimeHours = scheduleHours + value;
        updatedCalc.manualOvertimeHours = value; // Ensure manual hours are set correctly
        // Update overtime hours based on schedule and manual inputs
      }

      // Recalculate total salary
      const basicSalary = updatedCalc.basicSalary || 0;
      const costOfLiving = updatedCalc.costOfLiving || 0;
      const shiftAllowance = updatedCalc.shiftAllowance || 0;
      const exchangeRate = updatedCalc.exchangeRate || 31.50;
      const deduction = updatedCalc.deduction || 0;

      // Calculate overtime pay using formula: ((Basic Salary + Cost of living)/210) * overtime total hrs
      const hourlyRate = (basicSalary + costOfLiving) / 210;
      const totalOvertimeHours = updatedCalc.overtimeHours || 0;
      const overtimePay = hourlyRate * totalOvertimeHours;
      
      // Get other earnings value
      const otherEarnings = updatedCalc.otherEarnings || 0;
      const rateRatio = exchangeRate / 30.8;
      
      // Calculate the base amount to be multiplied by the rate ratio
      const inputBaseAmount = basicSalary + costOfLiving + shiftAllowance + otherEarnings + overtimePay;
      


      // Calculate the rate ratio (Exchange Rate/30.8)
      const currentRateRatio = exchangeRate / 30.8;

      // Calculate total salary: [(Basic + COL + Shift + Other + Overtime) * (Rate/30.8)] - Deduction
      const grossAmount = inputBaseAmount * currentRateRatio;
      const totalSalary = grossAmount - deduction;
      


      return {
        ...updatedCalc,
        overtimePay,
        variablePay: 0, // No longer used in new formula
        totalSalary,
        rateRatio: currentRateRatio,
        // Ensure all required fields from BasicSalaryCalculation interface are included
        dayOvertimeHours: updatedCalc.dayOvertimeHours || 0,
        nightOvertimeHours: updatedCalc.nightOvertimeHours || 0,
        holidayOvertimeHours: updatedCalc.holidayOvertimeHours || 0,
        effectiveOvertimeHours: updatedCalc.effectiveOvertimeHours || totalOvertimeHours // Default to total if not set
      };
    });

    // Save to localStorage with debounce
    if (employee?.id) {
      debouncedSaveToLocalStorage({
        ...salaryCalc,
        [field]: value
      });
    }
  };

  // Modified useEffects to guarantee localStorage priority
  useEffect(() => {
    fetchData();
    // Fetch overtime hours when component mounts
    if (user) {
      fetchOvertimeHours();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Add a function to apply localStorage data with priority
  const applyLocalStorageData = () => {
    if (employee?.id) {
      const savedInputs = loadInputsFromLocalStorage(employee.id);
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
      toast.error('Missing employee information or exchange rate');
      return;
    }
    
    // Validate basic salary
    if (typeof salaryCalc.basicSalary !== 'number' || salaryCalc.basicSalary <= 0) {
      toast.error('Basic salary must be greater than zero');
      return;
    }
    
    // Validate month format
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      toast.error('Invalid month format. Must be YYYY-MM');
      return;
    }
    
    setCalculationLoading(true);
    
    try {
      // Get the current session to extract the access token
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        throw new Error('Authentication error. Please sign in again.');
      }
      
      // Check if the employee still exists and can be accessed
      const { data: employeeCheck, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employee.id)
        .single();
        
      if (employeeError || !employeeCheck) {
        throw new Error('Employee information could not be verified');
      }
      
      // Check if the exchange rate is valid
      if (exchangeRate <= 0 || exchangeRate > 100) {
        throw new Error('Exchange rate seems invalid. Please update the rate');
      }
      
      console.log('Saving salary for month:', month);
      
      const salaryData = {
        employee_id: employee.id,
        month: `${month}-01`,
        basic_salary: salaryCalc.basicSalary || 0,
        cost_of_living: salaryCalc.costOfLiving || 0,
        shift_allowance: salaryCalc.shiftAllowance || 0,
        other_earnings: salaryCalc.otherEarnings || 0,
        overtime_hours: (scheduleOvertimeHours || 0) + (manualOvertimeHours || 0),
        overtime_pay: salaryCalc.overtimePay || 0,
        variable_pay: salaryCalc.variablePay || 0,
        deduction: salaryCalc.deduction || 0,
        total_salary: salaryCalc.totalSalary || 0,
        exchange_rate: exchangeRate,
        manual_overtime_hours: manualOvertimeHours || 0
      };
      
      // Verify no NaN or invalid values in the data
      for (const [key, value] of Object.entries(salaryData)) {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          throw new Error(`Invalid value for ${key}. Please check your inputs.`);
        }
      }
      
      console.log('Saving salary record:', salaryData);
      
      // Check if a record for this month already exists
      const { data: existingData, error: existingError } = await supabase
        .from('salaries')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('month', `${month}-01`)
        .limit(1);
      
      if (existingError) {
        throw new Error(`Error checking for existing records: ${existingError.message}`);
      }
      
      // Try saving with a retry mechanism
      let retryCount = 0;
      let saveSuccessful = false;
      let lastError = null;
      
      while (retryCount < 3 && !saveSuccessful) {
        try {
          // Upsert the record
          const { data, error } = await supabase
            .from('salaries')
            .upsert(salaryData, {
              onConflict: 'employee_id,month',
              ignoreDuplicates: false
            })
            .select();
            
          if (error) throw error;
          
          saveSuccessful = true;
          
          // Force a schema cache refresh
          await supabase.rpc('refresh_schema_cache');
          
          toast.success(existingData?.length ? 'Salary updated successfully!' : 'Salary saved successfully!');
          
          // Refresh salary history
          await fetchSalaryHistory();
        } catch (error) {
          lastError = error;
          retryCount++;
          
          if (retryCount < 3) {
            console.warn(`Retry attempt ${retryCount} after save failure`);
            // Wait briefly before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!saveSuccessful && lastError) {
        throw lastError;
      }
      
    } catch (error: any) {
      console.error('Error saving salary:', error);
      let errorMessage = 'Error saving salary';
      
      // More informative error messages
      if (error.code === '23505') {
        errorMessage = 'A record for this month already exists';
      } else if (error.code === '23503') {
        errorMessage = 'Referenced employee does not exist';
      } else if (error.code === '42P01') {
        errorMessage = 'Database table not found. Please contact support';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
          const exchangeRate = existingRecord.exchange_rate || 31.50;
          
          setSalaryCalc({
            basicSalary: existingRecord.basic_salary,
            costOfLiving: existingRecord.cost_of_living,
            shiftAllowance: existingRecord.shift_allowance,
            otherEarnings: existingRecord.other_earnings || 0, // Added other earnings with fallback
            overtimeHours: existingRecord.overtime_hours,
            manualOvertimeHours: 0,
            dayOvertimeHours: 0, // Use default value instead of reading from DB
            nightOvertimeHours: 0, // Use default value instead of reading from DB
            holidayOvertimeHours: 0, // Use default value instead of reading from DB
            effectiveOvertimeHours: existingRecord.overtime_hours || 0, // Use overtime_hours directly
            overtimePay: existingRecord.overtime_pay,
            variablePay: existingRecord.variable_pay || 0,
            deduction: existingRecord.deduction,
            totalSalary: existingRecord.total_salary,
            exchangeRate: exchangeRate,
            rateRatio: existingRecord.exchange_rate ? existingRecord.exchange_rate / 30.8 : 0, // Calculate rate ratio
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
        const exchangeRate = calcData.exchange_rate || 31.50;
        
        setSalaryCalc({
          basicSalary: calcData.basic_salary,
          costOfLiving: calcData.cost_of_living,
          shiftAllowance: calcData.shift_allowance,
          otherEarnings: calcData.other_earnings || 0, // Added other earnings with fallback
          overtimeHours: calcData.overtime_hours,
          manualOvertimeHours: calcData.manual_overtime_hours,
          dayOvertimeHours: calcData.day_overtime_hours || 0,
          nightOvertimeHours: calcData.night_overtime_hours || 0,
          holidayOvertimeHours: calcData.holiday_overtime_hours || 0,
          effectiveOvertimeHours: calcData.effective_overtime_hours || calcData.overtime_hours || 0,
          overtimePay: calcData.overtime_pay,
          variablePay: calcData.variable_pay || 0,
          deduction: calcData.deduction,
          totalSalary: calcData.total_salary,
          exchangeRate: exchangeRate,
          rateRatio: exchangeRate / 30.8, // Calculate rate ratio
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
          const exchangeRate = salaryData.exchange_rate || 31.50;
          
          setSalaryCalc({
            basicSalary: salaryData.basic_salary,
            costOfLiving: salaryData.cost_of_living,
            shiftAllowance: salaryData.shift_allowance,
            otherEarnings: salaryData.other_earnings || 0, // Added other earnings with fallback
            overtimeHours: salaryData.overtime_hours,
            manualOvertimeHours: 0,
            dayOvertimeHours: salaryData.day_overtime_hours || 0,
            nightOvertimeHours: salaryData.night_overtime_hours || 0,
            holidayOvertimeHours: salaryData.holiday_overtime_hours || 0,
            effectiveOvertimeHours: salaryData.effective_overtime_hours || salaryData.overtime_hours || 0,
            overtimePay: salaryData.overtime_pay,
            variablePay: salaryData.variable_pay || 0,
            deduction: salaryData.deduction,
            totalSalary: salaryData.total_salary,
            exchangeRate: exchangeRate,
            rateRatio: exchangeRate / 30.8, // Calculate rate ratio
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

  useEffect(() => {
    const fetchLastUpdate = async () => {
      const { data } = await supabase
        .from('monthly_exchange_rates')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (data?.[0]?.updated_at) {
        setLastRateUpdate(new Date(data[0].updated_at).toLocaleString());
      }
    };
    fetchLastUpdate();
  }, []);

  // Memoize the PDF document to prevent unnecessary re-renders
  const createPdfDocument = React.useCallback((salary: any, emp: typeof employee) => {
    if (!emp) return null;
    
    return (
      <Document>
        <SalaryPDF 
          salary={{
            basicSalary: salary?.basic_salary || 0,
            costOfLiving: salary?.cost_of_living || 0,
            shiftAllowance: salary?.shift_allowance || 0,
            otherEarnings: salary?.other_earnings || 0,
            overtimeHours: salary?.overtime_hours || 0,
            overtimePay: salary?.overtime_pay || 0,
            variablePay: salary?.variable_pay || 0,
            deduction: salary?.deduction || 0,
            totalSalary: salary?.total_salary || 0,
            exchangeRate: salary?.exchange_rate || exchangeRate,
            manualOvertimeHours: salary?.overtime_hours || 0,
            dayOvertimeHours: salary?.day_overtime_hours || 0,
            nightOvertimeHours: salary?.night_overtime_hours || 0,
            holidayOvertimeHours: salary?.holiday_overtime_hours || 0,
            effectiveOvertimeHours: salary?.effective_overtime_hours || salary?.overtime_hours || 0,
            rateRatio: (salary?.exchange_rate || exchangeRate) / 30.8
          }}
          employee={emp}
          month={salary.month}
          exchangeRate={salary.exchange_rate || exchangeRate}
        />
      </Document>
    );
  }, [exchangeRate]);
  
  // Keep track of generated PDFs to avoid regenerating the same document
  const [pdfCache, setPdfCache] = useState<{[key: string]: Blob}>({});
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const downloadPDF = async (salary: any) => {
    if (pdfGenerating) {
      toast.error('PDF generation already in progress');
      return;
    }
    
    try {
      setPdfGenerating(true);
      
      // Don't proceed if employee is null
      if (!employee) {
        throw new Error('Employee data not available');
      }
      
      // Create a cache key based on the salary data
      const cacheKey = `${employee.id}_${salary.month}_${salary.total_salary}`;
      
      // Check if we have a cached version
      if (pdfCache[cacheKey]) {
        console.log('Using cached PDF');
        
        // Create download link from cached blob
        const url = URL.createObjectURL(pdfCache[cacheKey]);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${employee.name}_salary_${new Date(salary.month).toISOString().substring(0, 7)}.pdf`;
        link.click();
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }
      
      // Show loading notification
      const loadingToast = toast.loading('Generating PDF...');
      
      // Create the document
      const MyDocument = createPdfDocument(salary, employee);
      
      if (!MyDocument) {
        throw new Error('Could not create PDF document');
      }

      // Generate PDF with timeout to avoid hanging browser
      const pdfPromise = new Promise<Blob>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('PDF generation timed out'));
        }, 10000); // 10 second timeout
        
        pdf(MyDocument).toBlob()
          .then(blob => {
            clearTimeout(timeoutId);
            resolve(blob);
          })
          .catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });
      
      // Generate PDF
      const pdfBlob = await pdfPromise;
      
      // Cache the blob for future use
      setPdfCache(prev => ({
        ...prev,
        [cacheKey]: pdfBlob
      }));
      
      // Clear loading toast
      toast.dismiss(loadingToast);
      toast.success('PDF generated successfully');
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${employee.name}_salary_${new Date(salary.month).toISOString().substring(0, 7)}.pdf`;
      
      // Trigger download
      link.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
        // Limit cache size to avoid memory issues
        if (Object.keys(pdfCache).length > 10) {
          // Keep only the 5 most recent PDFs
          const cacheKeys = Object.keys(pdfCache);
          const keysToRemove = cacheKeys.slice(0, cacheKeys.length - 5);
          const newCache = { ...pdfCache };
          keysToRemove.forEach(key => delete newCache[key]);
          setPdfCache(newCache);
        }
      }, 100);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  // Call test calculation
  useEffect(() => {
    const results = testCalculation();
    console.log('Test Calculation Results:', results);
  }, []);

  // Add useEffect to watch for changes in manual overtime hours
  useEffect(() => {
    setSalaryCalc(prev => {
      const totalOvertimeHours = (prev.overtimeHours || 0) + manualOvertimeHours;
      const basicSalary = prev.basicSalary || 0;
      const costOfLiving = prev.costOfLiving || 0;
      const shiftAllowance = prev.shiftAllowance || 0;
      const exchangeRate = prev.exchangeRate || 31.50;
      const deduction = prev.deduction || 0;

      // Calculate overtime pay
      const hourlyRate = (basicSalary + costOfLiving) / 210;
      const overtimePay = hourlyRate * totalOvertimeHours;

      // Calculate the rate ratio (Exchange Rate/30.8)
      const currentRateRatio = exchangeRate / 30.8;
      
      // Get other earnings value (or default to 0)
      const otherEarnings = prev.otherEarnings || 0;

      // Calculate total salary using the new formula: [(X+Y+Z+E+O)*(Rate/30.8)]-F
      const totalSalary = calculateTotalSalary(
        basicSalary,
        costOfLiving,
        shiftAllowance,
        otherEarnings,
        overtimePay,
        exchangeRate,
        deduction
      );

      return {
        ...prev,
        overtimeHours: totalOvertimeHours,
        overtimePay,
        variablePay: 0, // No longer used in new formula
        totalSalary,
        rateRatio: currentRateRatio
      };
    });
  }, [manualOvertimeHours]);

  // Add useEffect to watch for changes in exchange rate
  useEffect(() => {
    setSalaryCalc(prev => {
      const totalOvertimeHours = (prev.overtimeHours || 0) + manualOvertimeHours;
      const basicSalary = prev.basicSalary || 0;
      const costOfLiving = prev.costOfLiving || 0;
      const shiftAllowance = prev.shiftAllowance || 0;
      const deduction = prev.deduction || 0;

      // Calculate overtime pay
      const hourlyRate = (basicSalary + costOfLiving) / 210;
      const overtimePay = hourlyRate * totalOvertimeHours;

      // Calculate the rate ratio (Exchange Rate/30.8)
      const currentRateRatio = exchangeRate / 30.8;
      
      // Get other earnings value (or default to 0)
      const otherEarnings = prev.otherEarnings || 0;

      // Calculate total salary using the new formula: [(X+Y+Z+E+O)*(Rate/30.8)]-F
      const totalSalary = calculateTotalSalary(
        basicSalary,
        costOfLiving,
        shiftAllowance,
        otherEarnings,
        overtimePay,
        exchangeRate,
        deduction
      );

      return {
        ...prev,
        overtimePay,
        variablePay: 0, // No longer used in new formula
        totalSalary,
        exchangeRate,
        rateRatio: currentRateRatio
      };
    });
  }, [exchangeRate, manualOvertimeHours]);

  // Calculate salary using the new formula: [(X+Y+Z+E+O)*(Rate/30.8)]-F
  const calculateSalary = async () => {
    setCalculationLoading(true);
    
    try {
      // Input validation
      if (!employee) {
        throw new Error('Employee information is missing');
      }
      
      // Validate required inputs
      if (typeof salaryCalc.basicSalary !== 'number' || salaryCalc.basicSalary <= 0) {
        throw new Error('Basic salary must be greater than zero');
      }

      if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
        throw new Error('Exchange rate must be greater than zero');
      }
      
      // Extract values from state - all in EGP
      const basicSalary = salaryCalc.basicSalary || 0;
      const costOfLiving = salaryCalc.costOfLiving || 0;
      const shiftAllowance = salaryCalc.shiftAllowance || 0;
      const otherEarnings = salaryCalc.otherEarnings || 0; // Added other earnings
      const overtimeHours = salaryCalc.overtimeHours || 0;
      const deduction = salaryCalc.deduction || 0;
      
      // Check for suspicious values (data sanitization)
      if (basicSalary > 1000000) {
        throw new Error('Basic salary value seems too high');
      }
      
      if (deduction < 0) {
        throw new Error('Deductions cannot be negative');
      }
      
      // Calculate overtime pay using formula: ((Basic Salary + Cost of living)/210) * overtime total hrs
      const overtimePay = calculateOvertimePay(basicSalary, costOfLiving, overtimeHours);
      
      // Calculate the rate ratio (Exchange Rate/30.8)
      const currentRateRatio = exchangeRate / 30.8;
      
      // Calculate total salary using the correct formula: [(X+Y+Z+E+O)*(Rate/30.8)]-F
      const totalSalary = calculateTotalSalary(
        basicSalary,
        costOfLiving,
        shiftAllowance,
        otherEarnings,
        overtimePay,
        exchangeRate,
        deduction
      );
      
      // Verify the calculated result is valid
      if (isNaN(totalSalary) || !isFinite(totalSalary)) {
        throw new Error('Calculation resulted in an invalid value. Please check your inputs.');
      }
      
      const newCalc = {
        ...salaryCalc,
        otherEarnings,
        overtimePay,
        variablePay: 0, // No longer used in new formula
        totalSalary,
        exchangeRate,
        rateRatio: currentRateRatio,
      };
      
      setSalaryCalc(newCalc);
      setRateRatio(currentRateRatio);
      
      // Save inputs to localStorage whenever calculation happens
      if (employee?.id) {
        saveInputsToLocalStorage(newCalc, employee.id);
      }
      
      toast.success('Salary calculated successfully!');
    } catch (error) {
      console.error('Salary calculation error:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        toast.error(`Calculation error: ${error.message}`);
      } else {
        toast.error('An unknown error occurred during calculation');
      }
    } finally {
      setCalculationLoading(false);
    }
  };

  // Update the clear function to handle React events
  const handleClearSavedInputs = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (employee?.id) {
      if (clearSavedInputs(employee.id)) {
        setSalaryCalc(defaultSalaryCalc);
        alert('Form reset to default values. Your saved inputs have been cleared.');
      } else {
        alert('Error clearing saved data. Please try again.');
      }
    } else {
      alert('Cannot clear saved data: Employee information not available');
    }
  };

  const fetchExchangeRatesForMonths = async (months: string[]) => {
    const { data, error } = await supabase
      .from('monthly_exchange_rates')
      .select('*')
      .in('month', months);

    if (error) {
      console.error('Error fetching exchange rates:', error);
      return null;
    }

    return data;
  };

  const calculateSalariesForMonths = async (months: string[]) => {
    const rates = await fetchExchangeRatesForMonths(months);
    if (!rates) return null;

    return months.map(month => {
      const rate = rates.find(r => r.month === month);
      if (!rate) return { month, error: 'Rate not found' };

      // Get current salary values from state
      const salaryData = {
        basicSalary: salaryCalc.basicSalary || 0,
        costOfLiving: salaryCalc.costOfLiving || 0,
        shiftAllowance: salaryCalc.shiftAllowance || 0,
        otherEarnings: salaryCalc.otherEarnings || 0,
        deduction: salaryCalc.deduction || 0,
        overtimeHours: salaryCalc.overtimeHours || 0,
        dayOvertimeHours: 0, // Default values
        nightOvertimeHours: 0,
        holidayOvertimeHours: 0,
        effectiveOvertimeHours: 0,
        rateRatio: rate.rate
      };

      const totalSalary = calculateTotalSalary(
        salaryData.basicSalary,
        salaryData.costOfLiving,
        salaryData.shiftAllowance,
        salaryData.otherEarnings,
        calculateOvertimePay(salaryData.basicSalary, salaryData.costOfLiving, salaryData.effectiveOvertimeHours || salaryData.overtimeHours),
        rate.rate,
        salaryData.deduction
      );

      return { month, totalSalary, rate: rate.rate };
    });
  };

  const handleCalculateSpecificMonths = async () => {
    const results = await calculateSalariesForMonths([
      'january-2024', 
      'april-2024', 
      'december-2024', 
      'march-2025', 
      'april-2025'
    ]);
    if (results) {
      setMonthlyCalculations(results);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-dark-surface rounded-apple shadow-sm">
          <div className="px-4 sm:px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalaryForm
                employee={toSimplifiedEmployee(employee)}
                salaryCalc={salaryCalc}
                setSalaryCalc={setSalaryCalc}
                scheduleOvertimeHours={scheduleOvertimeHours}
                setScheduleOvertimeHours={setScheduleOvertimeHours}
                manualOvertimeHours={manualOvertimeHours}
                setManualOvertimeHours={setManualOvertimeHours}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onDateChange={handleDateChange}
                onInputChange={handleInputChange}
                exchangeRate={exchangeRate}
              />
              
              {/* Salary Summary Section with Toggle */}
              <div className="mt-6 mb-2">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                  <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">Salary Breakdown</h3>
                  <button 
                    onClick={() => setShowSalarySummary(!showSalarySummary)}
                    className="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 focus:outline-none"
                  >
                    {showSalarySummary ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                
                {showSalarySummary && (
                  <SalarySummary 
                    employee={employee ? { id: employee.id, name: employee.name } : undefined}
                    salaryCalc={salaryCalc}
                    scheduleOvertimeHours={scheduleOvertimeHours}
                    manualOvertimeHours={manualOvertimeHours || 0}
                    exchangeRate={exchangeRate}
                  />
                )}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-lg font-semibold">
                  Total Salary: EGP {salaryCalc.totalSalary.toLocaleString()}
                </div>
                <button
                  onClick={saveSalary}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Salary
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-4">
            Salary History
          </h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple shadow-sm">
            <div className="px-4 sm:px-6 py-5">
              <div className="overflow-x-auto">
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
                                  onClick={() => downloadPDF(salary)}
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
        <div className="text-sm text-gray-500 mt-2">
          Exchange rates last updated: {lastRateUpdate || 'Loading...'}
        </div>
      </div>
    </Layout>
  );
}