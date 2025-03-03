import React from 'react';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { SalaryCalculation, Employee, Deduction, PermanentDeduction } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';
import { User } from '@supabase/supabase-js';
import PermanentDeductionModal from '../components/PermanentDeductionModal';

export default function Salary() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(31.50); // Default fallback
  const [rateLastUpdated, setRateLastUpdated] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [salaryCalc, setSalaryCalc] = useState<SalaryCalculation>({
    basicSalary: 0,
    costOfLiving: 0,
    shiftAllowance: 0,
    overtimeHours: 0,
    overtimePay: 0,
    variablePay: 0,
    totalSalary: 0,
    exchangeRate: 0,
  });

  // Add new state for deductions
  const [deductions, setDeductions] = useState<{
    type: string;
    customName?: string;
    amount: number;
  }[]>([]);

  // Permanent Deductions State
  const [permanentDeductions, setPermanentDeductions] = useState<PermanentDeduction[]>([]);

  // Predefined deduction types
  const deductionTypes = [
    'Pension Plan Employee Contribution',
    'Retroactive Deduction',
    'Premium Card Deduction',
    'Mobile Deduction',
    'Absences & Sick Leave Deduction',
    'Custom Deduction'
  ];

  // New state for modal management
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<PermanentDeduction | undefined>(undefined);

  // Function to add a new deduction
  const addDeduction = () => {
    setDeductions([...deductions, { type: '', amount: 0 }]);
  };

  // Function to update a specific deduction
  const updateDeduction = (index: number, field: 'type' | 'customName' | 'amount', value: string | number) => {
    const newDeductions = [...deductions];
    newDeductions[index] = {
      ...newDeductions[index],
      [field]: value
    };
    setDeductions(newDeductions);
  };

  // Function to remove a deduction
  const removeDeduction = (index: number) => {
    const newDeductions = deductions.filter((_, i) => i !== index);
    setDeductions(newDeductions);
  };

  // Calculate total deductions
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);

  // Fetch Permanent Deductions in useEffect
  useEffect(() => {
    const fetchPermanentDeductions = async () => {
      if (!employee?.id) return;

      try {
        const { data, error } = await supabase
          .from('permanent_deductions')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('is_active', true);

        if (error) throw error;

        setPermanentDeductions(data || []);
      } catch (error) {
        console.error('Error fetching permanent deductions:', error);
      }
    };

    fetchPermanentDeductions();
  }, [employee?.id]);

  // Updated handler for adding a permanent deduction
  const handleAddPermanentDeduction = () => {
    setSelectedDeduction(undefined);
    setIsDeductionModalOpen(true);
  };

  // Updated handler for editing a permanent deduction
  const handleEditPermanentDeduction = (deduction: PermanentDeduction) => {
    setSelectedDeduction(deduction);
    setIsDeductionModalOpen(true);
  };

  // Updated handler for saving a permanent deduction
  const handleSavePermanentDeduction = async (deductionData: Partial<PermanentDeduction>) => {
    try {
      const employeeId = employee?.id;
      if (!employeeId) {
        throw new Error('No employee ID available');
      }

      const deductionToSave: Partial<PermanentDeduction> = {
        ...deductionData,
        employee_id: employeeId
      };

      let result;
      if (selectedDeduction?.id) {
        // Update existing deduction
        result = await supabase
          .from('permanent_deductions')
          .update(deductionToSave)
          .eq('id', selectedDeduction.id)
          .select()
          .single();
      } else {
        // Add new deduction
        result = await supabase
          .from('permanent_deductions')
          .insert(deductionToSave)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Update local state
      setPermanentDeductions(prev => {
        if (selectedDeduction?.id) {
          // Update existing deduction
          return prev.map(d => 
            d.id === selectedDeduction.id ? result.data : d
          );
        } else {
          // Add new deduction
          return [...prev, result.data];
        }
      });

      // Close modal
      setIsDeductionModalOpen(false);
      setSelectedDeduction(undefined);
    } catch (error) {
      console.error('Error saving permanent deduction:', error);
      alert('Failed to save permanent deduction');
    }
  };

  // Updated handler for removing a permanent deduction
  const handleRemovePermanentDeduction = async (deductionId: string | undefined) => {
    if (!deductionId) return;

    try {
      const { error } = await supabase
        .from('permanent_deductions')
        .delete()
        .eq('id', deductionId);

      if (error) throw error;

      setPermanentDeductions(prev => prev.filter(d => d.id !== deductionId));
    } catch (error) {
      console.error('Error removing permanent deduction:', error);
      alert('Failed to remove permanent deduction');
    }
  };

  // Calculate total permanent deductions
  const totalPermanentDeductions = permanentDeductions
    .filter(ded => ded.is_active)
    .reduce((sum, deduction) => sum + deduction.amount, 0);

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

  const calculateSalary = async () => {
    console.log('Calculate button clicked');
    
    if (!exchangeRate || !employee) return;
    
    const { basicSalary, costOfLiving, shiftAllowance, overtimeHours } = salaryCalc;
    
    // Calculate overtime pay: D = ((A+B)/210)*overtimeHours
    const overtimePay = ((basicSalary + costOfLiving) / 210) * overtimeHours;
    
    // Calculate variable pay: E = ((A+B+C+D)*((exchangeRate/31)-1)
    const variablePay = 
      (basicSalary + costOfLiving + shiftAllowance + overtimePay) * 
      ((exchangeRate / 31) - 1);
    
    // Calculate total salary
    const totalSalary = basicSalary + costOfLiving + shiftAllowance + overtimePay + variablePay;
    
    // Subtract total deductions (temporary and permanent)
    const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0) + 
                            totalPermanentDeductions;
    const netSalary = totalSalary - totalDeductions;
    
    const newCalc = {
      ...salaryCalc,
      overtimePay,
      variablePay,
      totalSalary,
      netSalary,
      exchangeRate,
    };
    
    setSalaryCalc(newCalc);

    // Save calculation to database
    try {
      const { data, error } = await supabase
        .from('salary_calculations')
        .insert([{
          employee_id: employee.id,
          basic_salary: basicSalary,
          cost_of_living: costOfLiving,
          shift_allowance: shiftAllowance,
          overtime_hours: overtimeHours,
          overtime_pay: overtimePay,
          variable_pay: variablePay,
          total_salary: totalSalary,
          net_salary: netSalary,
          deductions: JSON.stringify(deductions),
          permanent_deductions: JSON.stringify(permanentDeductions),
          exchange_rate: exchangeRate,
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving calculation:', error);
    }
  };

  const saveSalary = async () => {
    if (!employee || !exchangeRate) return;
    
    setCalculationLoading(true);
    
    try {
      // Check if salary for this month already exists
      const { data: existingSalary } = await supabase
        .from('salaries')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('month', `${month}-01`)
        .single();
      
      const salaryData = {
        employee_id: employee.id,
        month: `${month}-01`,
        basic_salary: salaryCalc.basicSalary,
        cost_of_living: salaryCalc.costOfLiving,
        shift_allowance: salaryCalc.shiftAllowance,
        overtime_hours: salaryCalc.overtimeHours,
        overtime_pay: salaryCalc.overtimePay,
        variable_pay: salaryCalc.variablePay,
        total_salary: salaryCalc.totalSalary,
        exchange_rate: exchangeRate,
      };
      
      let response;
      
      if (existingSalary) {
        // Update existing record
        response = await supabase
          .from('salaries')
          .update(salaryData)
          .eq('id', existingSalary.id);
      } else {
        // Insert new record
        response = await supabase
          .from('salaries')
          .insert(salaryData);
      }
      
      if (response.error) throw response.error;
      
      // Refresh salary history
      const { data: historyData, error: historyError } = await supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', employee.id)
        .order('month', { ascending: false });

      if (historyError) throw historyError;
      setSalaryHistory(historyData || []);
      
      alert('Salary saved successfully!');
    } catch (error) {
      console.error('Error saving salary:', error);
      alert('Failed to save salary. Please try again.');
    } finally {
      setCalculationLoading(false);
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
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-red-600 mb-4">{authError}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Salary Calculator</h1>
        
        {authError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {authError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

              {/* Deductions Section with Permanent Deductions moved next to it */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temporary Deductions */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-base font-semibold mb-3">Temporary Deductions</h3>
                  
                  {deductions.map((deduction, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <select
                        value={deduction.type}
                        onChange={(e) => {
                          updateDeduction(index, 'type', e.target.value);
                          // Reset custom name if not custom deduction
                          if (e.target.value !== 'Custom Deduction') {
                            updateDeduction(index, 'customName', '');
                          }
                        }}
                        className="w-1/2 p-2 border rounded"
                        aria-label="Select deduction type"
                      >
                        <option value="">Select Deduction Type</option>
                        {deductionTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>

                      {deduction.type === 'Custom Deduction' && (
                        <input
                          type="text"
                          placeholder="Custom Deduction Name"
                          value={deduction.customName || ''}
                          onChange={(e) => updateDeduction(index, 'customName', e.target.value)}
                          className="w-1/4 p-2 border rounded"
                        />
                      )}

                      <input
                        type="number"
                        placeholder="Amount"
                        value={deduction.amount}
                        onChange={(e) => updateDeduction(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-1/4 p-2 border rounded"
                      />

                      <button
                        onClick={() => removeDeduction(index)}
                        className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                        aria-label="Remove deduction"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addDeduction}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
                  >
                    Add Deduction
                  </button>
                </div>
                
                {/* Permanent Deductions Section moved here */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-base font-semibold mb-3">Permanent Deductions</h3>
                  <div className="space-y-4">
                    {permanentDeductions.map((deduction) => (
                      <div key={deduction.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">
                            {deduction.custom_name || deduction.type} - ${deduction.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {deduction.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditPermanentDeduction(deduction)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleRemovePermanentDeduction(deduction.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={handleAddPermanentDeduction}
                      className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition-colors"
                    >
                      Add Permanent Deduction
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium">Total Deductions: {(totalDeductions + totalPermanentDeductions).toFixed(2)}</p>
                <p className="text-sm font-medium">Net Salary: {(salaryCalc.totalSalary - totalDeductions - totalPermanentDeductions).toFixed(2)}</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2">
                <button
                  onClick={calculateSalary}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-blue-700 disabled:opacity-50"
                  disabled={!exchangeRate}
                >
                  Calculate
                </button>
                
                <button
                  onClick={saveSalary}
                  className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-green-700 disabled:opacity-50"
                  disabled={!salaryCalc.totalSalary || calculationLoading}
                >
                  {calculationLoading ? 'Saving...' : 'Save Salary'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Salary Results</h2>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-sm font-medium">Overtime Pay (D)</p>
                <p className="text-lg font-medium mt-1">{salaryCalc.overtimePay.toFixed(2)} EGP</p>
                <p className="text-xs text-gray-500 mt-1">((A+B)/210) * Overtime Hours</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-sm font-medium">Variable Pay (E)</p>
                <p className="text-lg font-medium mt-1">{salaryCalc.variablePay.toFixed(2)} EGP</p>
                <p className="text-xs text-gray-500 mt-1">((A+B+C+D) * ((exchange rate/31) - 1))</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg mt-4">
                <p className="text-gray-600 text-sm font-medium">Total Salary</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{salaryCalc.totalSalary.toFixed(2)} EGP</p>
                <p className="text-xs text-gray-500 mt-1">A + B + C + D + E</p>
              </div>
            </div>
            
            {salaryCalc.totalSalary > 0 && employee && (
              <div className="mt-6">
                <BlobProvider document={
                  <SalaryPDF 
                    salary={salaryCalc}
                    employee={employee}
                    month={month}
                  />
                }>
                  {({ blob, url, loading, error }) => (
                    <a 
                      href={url || undefined} 
                      download={`salary-slip-${month}-${employee.name}.pdf`}
                      className="block w-full sm:w-auto text-center bg-red-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-red-700"
                    >
                      {loading ? 'Generating PDF...' : 'Download PDF'}
                    </a>
                  )}
                </BlobProvider>
              </div>
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
                        <td className="px-3 py-3 text-sm">{salary.basic_salary.toFixed(0)}</td>
                        <td className="px-3 py-3 text-sm">{salary.cost_of_living.toFixed(0)}</td>
                        <td className="px-3 py-3 text-sm">{salary.shift_allowance.toFixed(0)}</td>
                        <td className="px-3 py-3 text-sm">{salary.overtime_pay.toFixed(0)}</td>
                        <td className="px-3 py-3 text-sm">{salary.variable_pay.toFixed(0)}</td>
                        <td className="px-3 py-3 text-sm font-medium">{salary.total_salary.toFixed(0)}</td>
                        <td className="px-3 py-3 text-sm">
                          <BlobProvider document={
                            <SalaryPDF 
                              salary={{
                                basicSalary: salary.basic_salary,
                                costOfLiving: salary.cost_of_living,
                                shiftAllowance: salary.shift_allowance,
                                overtimeHours: salary.overtime_hours,
                                overtimePay: salary.overtime_pay,
                                variablePay: salary.variable_pay,
                                totalSalary: salary.total_salary,
                                exchangeRate: salary.exchange_rate,
                              }} 
                              employee={employee as Employee} 
                              month={new Date(salary.month).toISOString().substring(0, 7)} 
                            />
                          }>
                            {({ blob, url, loading, error }) => (
                              <a 
                                href={url || undefined} 
                                download={`salary-${new Date(salary.month).toISOString().substring(0, 7)}-${employee?.name}.pdf`}
                                className="text-red-600 hover:text-red-800"
                              >
                                {loading ? '...' : 'PDF'}
                              </a>
                            )}
                          </BlobProvider>
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
    </Layout>
  );
} 