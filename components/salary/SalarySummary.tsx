import { SalaryCalculation } from '../../lib/calculations/salary';

interface SalarySummaryProps {
  calculation: SalaryCalculation;
}

export function SalarySummary({ calculation }: SalarySummaryProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Salary Summary</h2>
      
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Basic Salary:</span>
          <span className="font-medium">{calculation.basicSalary.toLocaleString()} SAR</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Overtime Pay:</span>
          <span className="font-medium">{calculation.overtimePay.toLocaleString()} SAR</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Allowances:</span>
          <span className="font-medium">{calculation.allowances.toLocaleString()} SAR</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Deductions:</span>
          <span className="font-medium text-red-600">{calculation.deductions.toLocaleString()} SAR</span>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between">
            <span className="text-lg font-semibold">Net Salary:</span>
            <span className="text-lg font-semibold text-green-600">
              {calculation.netSalary.toLocaleString()} SAR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 