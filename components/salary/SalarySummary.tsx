import { BasicSalaryCalculation } from '@/lib/calculations/salary';

interface SalarySummaryProps {
  employee?: {
    id: string;
    name: string;
  };
  salaryCalc: BasicSalaryCalculation;
  scheduleOvertimeHours?: number;
  manualOvertimeHours?: number;
  exchangeRate?: number;
}

export function SalarySummary({ 
  employee,
  salaryCalc,
  scheduleOvertimeHours = 0,
  manualOvertimeHours = 0,
  exchangeRate = 31.50
}: SalarySummaryProps) {
  const totalOvertimeHours = scheduleOvertimeHours + (manualOvertimeHours || 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Basic Salary:</span>
          <span className="text-sm font-medium">EGP {salaryCalc.basicSalary.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Cost of Living:</span>
          <span className="text-sm font-medium">EGP {salaryCalc.costOfLiving.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Shift Allowance:</span>
          <span className="text-sm font-medium">EGP {salaryCalc.shiftAllowance.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Overtime Hours:</span>
          <span className="text-sm font-medium">{totalOvertimeHours} hours</span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Overtime Pay:</span>
          <span className="text-sm font-medium">EGP {salaryCalc.overtimePay.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Deductions:</span>
          <span className="text-sm font-medium text-red-600">EGP {salaryCalc.deduction.toLocaleString()}</span>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between">
            <span className="text-base font-semibold">Total Salary:</span>
            <span className="text-base font-semibold text-green-600">
              EGP {salaryCalc.totalSalary.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}