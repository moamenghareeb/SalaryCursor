export interface SalaryCalculation {
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

export interface MonthlySalary {
  id: string;
  date: string;
  basic_salary: number;
  overtime_pay: number;
  total_salary: number;
  month: string;
  name: string;
  total: number;
}

export interface LeaveBalanceData {
  remainingBalance: number;
  used: number;
  total: number;
}

export interface StatsPanelProps {
  data: {
    monthlyEarnings: number;
    overtimeHours: number;
  };
} 