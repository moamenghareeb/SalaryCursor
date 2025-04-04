import React, { useState, useEffect } from 'react';
import { FiSave } from 'react-icons/fi';

interface SalaryFormProps {
  employee?: {
    id: string;
    name: string;
  };
  salaryCalc: {
    basicSalary: number;
    costOfLiving: number;
    shiftAllowance: number;
    overtimeHours: number;
    overtimePay: number;
    deduction: number;
  };
  scheduleOvertimeHours?: number;
  manualOvertimeHours?: number;
  selectedMonth?: number;
  selectedYear?: number;
  onDateChange?: (year: number, month: number) => void;
  onInputChange?: (field: keyof SalaryFormProps['salaryCalc'] | 'manualOvertimeHours', value: number) => void;
  onManualUpdateRate?: () => void;
  exchangeRate?: number;
}

export function SalaryForm({ 
  employee,
  salaryCalc,
  scheduleOvertimeHours = 0,
  manualOvertimeHours = 0,
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
  onDateChange = () => {},
  onInputChange = () => {},
  onManualUpdateRate = () => {},
  exchangeRate = 31.50
}: SalaryFormProps) {
  const [formData, setFormData] = useState(salaryCalc);
  const [manualOvertimeHoursState, setManualOvertimeHours] = useState(manualOvertimeHours || 0);

  // Update form when data changes
  useEffect(() => {
    setFormData(salaryCalc);
  }, [salaryCalc]);

  // Update parent when manual overtime changes
  const handleManualOvertimeChange = (value: number) => {
    setManualOvertimeHours(value);
    onInputChange('manualOvertimeHours', value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
    onInputChange(name as keyof typeof salaryCalc, parseFloat(value) || 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Month
          </label>
          <select 
            value={selectedMonth}
            onChange={(e) => onDateChange(selectedYear, parseInt(e.target.value))}
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
            onChange={(e) => onDateChange(parseInt(e.target.value), selectedMonth)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {Array.from({ length: selectedYear - 2020 + 2 }, (_, i) => (
              <option key={2020 + i} value={2020 + i}>
                {2020 + i}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Basic Salary (EGP)
          </label>
          <input
            type="number"
            value={formData.basicSalary || ''}
            onChange={handleChange}
            name="basicSalary"
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cost of Living (EGP)
          </label>
          <input
            type="number"
            value={formData.costOfLiving || ''}
            onChange={handleChange}
            name="costOfLiving"
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Shift Allowance (EGP)
          </label>
          <input
            type="number"
            value={formData.shiftAllowance || ''}
            onChange={handleChange}
            name="shiftAllowance"
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Overtime Hours
          </label>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="number"
                value={scheduleOvertimeHours}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                readOnly
              />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                From Schedule
              </span>
            </div>
            
            <div className="flex items-center">
              <input
                type="number"
                value={manualOvertimeHoursState}
                onChange={(e) => handleManualOvertimeChange(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
              />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Additional
              </span>
            </div>
            
            <div className="flex items-center">
              <input
                type="number"
                value={scheduleOvertimeHours + manualOvertimeHoursState}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                readOnly
              />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Total Overtime
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deductions (EGP)
          </label>
          <input
            type="number"
            value={formData.deduction || ''}
            onChange={handleChange}
            name="deduction"
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {exchangeRate}
        </div>
      </div>
    </div>
  );
}