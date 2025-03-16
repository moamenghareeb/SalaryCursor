import React, { useState, useEffect } from 'react';
import { FiSave } from 'react-icons/fi';

interface SalaryFormProps {
  data: {
    basicSalary: number;
    overtimeHours: number;
    overtimePay: number;
    deductions: number;
    allowances: number;
    month: string;
  };
  onSave: (data: any) => void;
  onMonthChange: (month: string) => void;
}

export function SalaryForm({ data, onSave, onMonthChange }: SalaryFormProps) {
  const [formData, setFormData] = useState(data);

  // Update form when data changes
  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="month" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Month
        </label>
        <input
          type="month"
          id="month"
          name="month"
          value={formData.month}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div>
        <label htmlFor="basicSalary" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Basic Salary
        </label>
        <input
          type="number"
          id="basicSalary"
          name="basicSalary"
          value={formData.basicSalary}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div>
        <label htmlFor="overtimeHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Overtime Hours
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="number"
            id="overtimeHours"
            name="overtimeHours"
            value={formData.overtimeHours}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            readOnly
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            (Automatically updated from schedule)
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="overtimePay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Overtime Pay
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="number"
            id="overtimePay"
            name="overtimePay"
            value={formData.overtimePay}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            readOnly
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            (Calculated automatically)
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="deductions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Deductions
        </label>
        <input
          type="number"
          id="deductions"
          name="deductions"
          value={formData.deductions}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div>
        <label htmlFor="allowances" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Allowances
        </label>
        <input
          type="number"
          id="allowances"
          name="allowances"
          value={formData.allowances}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <FiSave className="mr-2" />
        Save Changes
      </button>
    </form>
  );
} 