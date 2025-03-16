export interface Employee {
  id: string;
  email: string;
  name: string;
  employee_id: string;
  position: string;
  years_of_service: number;
  annual_leave_balance?: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Salary {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  cost_of_living: number;
  shift_allowance: number;
  overtime_hours: number;
  overtime_pay: number;
  variable_pay: number;
  total_salary: number;
  gross_salary: number;
  net_salary: number;
  exchange_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Leave {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days_taken: number;
  reason: string;
  leave_type?: string;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface BaseDeductions {
  pensionPlan?: number;
  premiumCardDeduction?: number;
  mobileDeduction?: number;
  absences?: number;
  sickLeave?: number;
  actAsPay?: number;
}

export interface SalaryAllowances {
  costOfLiving: number;
  shiftAllowance: number;
  variablePay: number;
}

export interface SalaryCalculation {
  // Required fields
  basicSalary: number;
  overtimeHours: number;
  deductions: number;
  employeeId: string;
  month: string;
  
  // Allowances
  costOfLiving: number;
  shiftAllowance: number;
  variablePay: number;

  // Deductions
  pensionPlan: number;
  premiumCardDeduction: number;
  mobileDeduction: number;
  absences: number;
  sickLeave: number;
  actAsPay: number;

  // Calculated fields
  exchangeRate: number;
  overtimePay: number;
  totalSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances: SalaryAllowances;
}

export interface CalculatedSalary {
  totalSalary: number;
  grossSalary: number;
  netSalary: number;
  overtimePay: number;
  deductions: number;
  allowances: SalaryAllowances;
}

export type SalaryDeductions = BaseDeductions & { deductions: number };

export interface InLieuRecord {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  leave_days_added: number;
  created_at: string;
  updated_at: string;
} 