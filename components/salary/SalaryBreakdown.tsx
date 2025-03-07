import React from 'react';
import { SalaryDetails } from '../../types';

interface SalaryBreakdownProps {
  salary: SalaryDetails;
}

export default function SalaryBreakdown({ salary }: SalaryBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salary.currency
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Basic Salary */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Salary</h3>
        <p className="text-xl font-semibold text-gray-900">{formatCurrency(salary.basic)}</p>
      </div>

      {/* Allowances */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Allowances</h3>
        <div className="bg-gray-50 p-4 rounded-md space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Housing</span>
            <span className="text-gray-900 font-medium">{formatCurrency(salary.allowances.housing)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Transportation</span>
            <span className="text-gray-900 font-medium">{formatCurrency(salary.allowances.transportation)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Meals</span>
            <span className="text-gray-900 font-medium">{formatCurrency(salary.allowances.meals)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Other</span>
            <span className="text-gray-900 font-medium">{formatCurrency(salary.allowances.other)}</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between">
            <span className="font-medium text-gray-900">Total Allowances</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(
                Object.values(salary.allowances).reduce((a, b) => a + b, 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Deductions */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Deductions</h3>
        <div className="bg-gray-50 p-4 rounded-md space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span className="text-red-600 font-medium">-{formatCurrency(salary.deductions.tax)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Insurance</span>
            <span className="text-red-600 font-medium">-{formatCurrency(salary.deductions.insurance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pension</span>
            <span className="text-red-600 font-medium">-{formatCurrency(salary.deductions.pension)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Other</span>
            <span className="text-red-600 font-medium">-{formatCurrency(salary.deductions.other)}</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between">
            <span className="font-medium text-gray-900">Total Deductions</span>
            <span className="font-semibold text-red-600">
              -{formatCurrency(
                Object.values(salary.deductions).reduce((a, b) => a + b, 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Net Salary */}
      <div className="pt-4 border-t-2 border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Net Salary</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(salary.netSalary)}</p>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          For the month of {salary.month} {salary.year}
        </p>
      </div>
    </div>
  );
} 