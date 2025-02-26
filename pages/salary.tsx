import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { SalaryCalculation, Employee } from '../types';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider } from '@react-pdf/renderer';
import SalaryPDF from '../components/SalaryPDF';

export default function Salary() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch exchange rate
        const rateResponse = await fetch('/api/exchange-rate');
        const rateData = await rateResponse.json();
        
        if (rateData.exchangeRate) {
          setExchangeRate(rateData.exchangeRate);
        }

        // Fetch employee data
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData.user) {
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', userData.user.id)
            .single();

          if (employeeError) throw employeeError;
          setEmployee(employeeData);

          // Fetch salary history
          const { data: historyData, error: historyError } = await supabase
            .from('salaries')
            .select('*')
            .eq('employee_id', userData.user.id)
            .order('month', { ascending: false });

          if (historyError) throw historyError;
          setSalaryHistory(historyData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field: keyof SalaryCalculation, value: number) => {
    setSalaryCalc((prev) => ({ ...prev, [field]: value }));
  };

  const calculateSalary = () => {
    if (!exchangeRate) return;

    const { basicSalary, costOfLiving, shiftAllowance, overtimeHours } = salaryCalc;
    
    // Calculate overtime pay: D = ((A+B)/210)*overtimeHours
    const overtimePay = ((basicSalary + costOfLiving) / 210) * overtimeHours;
    
    // Calculate variable pay: E = ((A+B+C+D)*((exchangeRate/31)-1)
    const variablePay = 
      (basicSalary + costOfLiving + shiftAllowance + overtimePay) * 
      ((exchangeRate / 31) - 1);
    
    // Calculate total salary
    const totalSalary = basicSalary + costOfLiving + shiftAllowance + overtimePay + variablePay;
    
    setSalaryCalc({
      ...salaryCalc,
      overtimePay,
      variablePay,
      totalSalary,
      exchangeRate,
    });
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Salary Calculator</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Exchange Rate</h2>
        <p className="text-lg">
          1 USD = <span className="font-bold text-green-600">{exchangeRate ? exchangeRate.toFixed(2) : '...'} EGP</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Calculate Salary</h2>
          
          <div className="mb-4">
            <label className="block mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Basic Salary (A)</label>
            <input
              type="number"
              value={salaryCalc.basicSalary || ''}
              onChange={(e) => handleInputChange('basicSalary', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded"
              placeholder="Enter basic salary"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Cost of Living (B)</label>
            <input
              type="number"
              value={salaryCalc.costOfLiving || ''}
              onChange={(e) => handleInputChange('costOfLiving', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded"
              placeholder="Enter cost of living"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Shift Allowance (C)</label>
            <input
              type="number"
              value={salaryCalc.shiftAllowance || ''}
              onChange={(e) => handleInputChange('shiftAllowance', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded"
              placeholder="Enter shift allowance"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Overtime Hours</label>
            <input
              type="number"
              value={salaryCalc.overtimeHours || ''}
              onChange={(e) => handleInputChange('overtimeHours', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded"
              placeholder="Enter overtime hours"
            />
          </div>
          
          <button
            onClick={calculateSalary}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
            disabled={!exchangeRate}
          >
            Calculate
          </button>
          
          <button
            onClick={saveSalary}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            disabled={!salaryCalc.totalSalary || calculationLoading}
          >
            {calculationLoading ? 'Saving...' : 'Save Salary'}
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Salary Results</h2>
          
          <div className="mb-3">
            <p className="text-gray-600">Overtime Pay (D)</p>
            <p className="font-medium">{salaryCalc.overtimePay.toFixed(2)} EGP</p>
            <p className="text-xs text-gray-500">((A+B)/210) * Overtime Hours</p>
          </div>
          
          <div className="mb-3">
            <p className="text-gray-600">Variable Pay (E)</p>
            <p className="font-medium">{salaryCalc.variablePay.toFixed(2)} EGP</p>
            <p className="text-xs text-gray-500">((A+B+C+D) * ((exchange rate/31) - 1))</p>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <p className="text-gray-600 text-lg">Total Salary</p>
            <p className="font-bold text-2xl text-green-600">{salaryCalc.totalSalary.toFixed(2)} EGP</p>
            <p className="text-xs text-gray-500">A + B + C + D + E</p>
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
                    className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    {loading ? 'Generating PDF...' : 'Download PDF'}
                  </a>
                )}
              </BlobProvider>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Salary History</h2>
        
        {salaryHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost of Living</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Allowance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variable Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaryHistory.map((salary) => (
                  <tr key={salary.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(salary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{salary.basic_salary.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salary.cost_of_living.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salary.shift_allowance.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salary.overtime_pay.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salary.variable_pay.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">{salary.total_salary.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                            {loading ? 'Loading...' : 'Download PDF'}
                          </a>
                        )}
                      </BlobProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No salary history available.</p>
        )}
      </div>
    </Layout>
  );
} 