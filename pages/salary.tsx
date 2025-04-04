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
import {
  BasicSalaryCalculation,
  defaultSalaryCalc,
  calculateOvertimePay,
  calculateVariablePay,
  calculateTotalSalary,
  testCalculation
} from '@/lib/calculations/salary';
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
  const [calculationResults, setCalculationResults] = useState<BasicSalaryCalculation | null>(null);

  const [salaryCalc, setSalaryCalc] = useState<BasicSalaryCalculation>(defaultSalaryCalc);

  // Add state for overtime data
  const [scheduleOvertimeHours, setScheduleOvertimeHours] = useState(0);
  const [manualOvertimeHours, setManualOvertimeHours] = useState(0);

  // Create a debounced version of the save function with 1 second delay
  const debouncedSaveToLocalStorage = useDebounce((data: BasicSalaryCalculation) => {
    if (employee?.id) {
      saveInputsToLocalStorage(data, employee.id);
    }
  }, 1000);

  // Function to fetch overtime hours for the selected month
  const fetchOvertimeHours = async () => {
    if (!employee) {
      console.log('No employee data, skipping overtime fetch');
      return;
    }

    try {
      // Calculate start and end dates for the selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      startDate.setHours(0, 0, 0, 0);  // Set to beginning of day
      
      const endDate = new Date(selectedYear, selectedMonth, 0); // Last day of the month
      endDate.setHours(23, 59, 59, 999);  // Set to end of day
      
      console.log('Date range calculation (with time):', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startDateString: startDate.toISOString().split('T')[0],
        endDateString: endDate.toISOString().split('T')[0],
        year: selectedYear,
        month: selectedMonth
      });

      // Fetch all shifts for the month
      const { data: shifts, error: shiftsError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        return;
      }

      console.log('Fetching shifts with params:', {
        employee_id: employee.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        query: 'gte start_date AND lte end_date'
      });
      
      console.log('All shifts found:', shifts?.length);
      console.log('Raw shifts data:', shifts);

      // Log detailed shift information
      console.log('Detailed shift information:', shifts?.map(s => ({
        date: s.date,
        type: s.shift_type,
        notes: s.notes
      })));

      // Get unique shift types
      const shiftTypes = Array.from(new Set(shifts?.map(s => s.shift_type) || []));
      console.log('Shift types found:', shiftTypes);

      // Log all shifts with their types for debugging
      console.log('Shifts by type:', shifts?.reduce((acc, shift) => {
        const type = shift.shift_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      // Filter overtime shifts - only count actual overtime shifts
      const overtimeShifts = shifts?.filter(s => {
        const type = (s.shift_type || '').toLowerCase().trim();
        console.log('Checking shift type:', { original: s.shift_type, normalized: type });
        return type === 'overtime';
      }) || [];
      
      console.log('Overtime shifts details:', overtimeShifts);
      console.log('Total overtime shifts found:', overtimeShifts.length);

      // Calculate total overtime hours (24 hours per shift)
      const scheduleOvertimeHours = overtimeShifts.length * 24;
      console.log('Calculated schedule overtime hours:', scheduleOvertimeHours);

      // Update the salary calculation with new overtime hours
      setSalaryCalc(prev => {
        const totalOvertimeHours = scheduleOvertimeHours + (manualOvertimeHours || 0);
        const basicSalary = prev.basicSalary || 0;
        const costOfLiving = prev.costOfLiving || 0;
        const shiftAllowance = prev.shiftAllowance || 0;
        const exchangeRate = prev.exchangeRate || 31.50;
        const deduction = prev.deduction || 0;

        // Calculate overtime pay
        const hourlyRate = (basicSalary + costOfLiving) / 210;
        const overtimePay = hourlyRate * totalOvertimeHours;

        // Calculate variable pay
        const variablePay = calculateVariablePay(
          basicSalary,
          costOfLiving,
          shiftAllowance,
          overtimePay,
          exchangeRate
        );

        // Calculate total salary
        const totalSalary = calculateTotalSalary(
          basicSalary,
          costOfLiving,
          shiftAllowance,
          overtimePay,
          variablePay,
          deduction
        );

        return {
          ...prev,
          overtimeHours: totalOvertimeHours,
          overtimePay,
          variablePay,
          totalSalary
        };
      });

    } catch (error) {
      console.error('Error in fetchOvertimeHours:', error);
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
        const manualHours = existingRecord.manual_overtime_hours || 0; // Keep manual hours from record
        
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
      }
    }

    // Fetch overtime hours for the new month
    fetchOvertimeHours();
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
        const totalOvertimeHours = (prev.overtimeHours || 0) + value;
        updatedCalc.overtimeHours = totalOvertimeHours;
      }

      // Recalculate total salary
      const basicSalary = updatedCalc.basicSalary || 0;
      const costOfLiving = updatedCalc.costOfLiving || 0;
      const shiftAllowance = updatedCalc.shiftAllowance || 0;
      const exchangeRate = updatedCalc.exchangeRate || 31.50;
      const deduction = updatedCalc.deduction || 0;

      // Calculate overtime pay
      const hourlyRate = (basicSalary + costOfLiving) / 210;
      const overtimePay = hourlyRate * (updatedCalc.overtimeHours || 0);

      // Calculate variable pay
      const variablePay = calculateVariablePay(
        basicSalary,
        costOfLiving,
        shiftAllowance,
        overtimePay,
        exchangeRate
      );

      // Calculate total salary
      const totalSalary = calculateTotalSalary(
        basicSalary,
        costOfLiving,
        shiftAllowance,
        overtimePay,
        variablePay,
        deduction
      );

      return {
        ...updatedCalc,
        overtimePay,
        variablePay,
        totalSalary
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
    fetchOvertimeHours();
  }, [fetchData, fetchOvertimeHours, user]);

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
        exchange_rate: exchangeRate
      };
      
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
      
      // Upsert the record
      const { data, error } = await supabase
        .from('salaries')
        .upsert(salaryData, {
          onConflict: 'employee_id,month',
          ignoreDuplicates: false
        })
        .select();
      
      if (error) throw error;
      
      // Force a schema cache refresh
      await supabase.rpc('refresh_schema_cache');
      
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

  const downloadPDF = async (salary: any) => {
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
              exchangeRate: salary?.exchange_rate || exchangeRate,
              manualOvertimeHours: salary?.overtime_hours || 0
            }}
            employee={employee as Employee}
            month={salary.month}
            exchangeRate={salary.exchange_rate || exchangeRate}
          />
        </Document>
      );

      // Generate PDF
      const pdfBlob = await pdf(<MyDocument />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${employee?.name}_salary_${new Date(salary.month).toISOString().substring(0, 7)}.pdf`;
      
      // Trigger download
      link.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Call test calculation
  useEffect(() => {
    const results = testCalculation();
    console.log('Test Calculation Results:', results);
  }, []);

  // Add useEffect to watch for changes in manual overtime hours
  useEffect(() => {
    if (manualOvertimeHours) {
      calculateSalary();
    }
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

      // Calculate variable pay
      const variablePay = calculateVariablePay(
        basicSalary,
        costOfLiving,
        shiftAllowance,
        overtimePay,
        exchangeRate
      );

      // Calculate total salary
      const totalSalary = calculateTotalSalary(
        basicSalary,
        costOfLiving,
        shiftAllowance,
        overtimePay,
        variablePay,
        deduction
      );

      return {
        ...prev,
        overtimePay,
        variablePay,
        totalSalary,
        exchangeRate
      };
    });
  }, [exchangeRate]);

  // Add the calculate salary function
  const calculateSalary = async () => {
    setCalculationLoading(true);
    
    // Extract values from state - all in EGP
    const basicSalary = salaryCalc.basicSalary || 0;
    const costOfLiving = salaryCalc.costOfLiving || 0;
    const shiftAllowance = salaryCalc.shiftAllowance || 0;
    const overtimeHours = salaryCalc.overtimeHours || 0;
    const deduction = salaryCalc.deduction || 0;
    
    // Calculate overtime pay
    const overtimePay = calculateOvertimePay(basicSalary, costOfLiving, overtimeHours);
    
    // Calculate variable pay
    const variablePay = calculateVariablePay(
      basicSalary,
      costOfLiving,
      shiftAllowance,
      overtimePay,
      exchangeRate
    );
    
    // Calculate total salary
    const totalSalary = calculateTotalSalary(
      basicSalary,
      costOfLiving,
      shiftAllowance,
      overtimePay,
      variablePay,
      deduction
    );
    
    const newCalc = {
      ...salaryCalc,
      overtimePay,
      variablePay,
      totalSalary,
      exchangeRate,
    };
    
    setSalaryCalc(newCalc);
    
    // Save inputs to localStorage whenever calculation happens
    if (employee?.id) {
      saveInputsToLocalStorage(newCalc, employee.id);
    }
    
    setCalculationLoading(false);
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
                employee={employee}
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
                onManualUpdateRate={manuallyUpdateRate}
                exchangeRate={exchangeRate}
              />
              
              <div className="flex justify-between items-center">
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
      </div>
    </Layout>
  );
}