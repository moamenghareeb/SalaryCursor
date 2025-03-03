export interface Employee {
  id: string;
  email: string;
  name: string;
  employee_id: string;
  position: string;
  years_of_service: number;
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
  year: number;
  created_at: string;
  updated_at: string;
}

export interface SalaryCalculation {
  basicSalary: number;
  costOfLiving: number;
  shiftAllowance: number;
  overtimeHours: number;
  overtimePay: number;
  variablePay: number;
  totalSalary: number;
  exchangeRate: number;
}

export interface PublicHoliday {
  id: string;
  employee_id: string;
  holiday_date: string;
  description: string;
  leave_credit: number;
  created_at: string;
  updated_at: string;
}

export interface Deduction {
  id: string;
  employee_id: string;
  salary_id?: string;
  deduction_name: string;
  amount: number;
  deduction_type: string;
  is_permanent: boolean;
  created_at: string;
  updated_at: string;
}

export type DeductionType = 
  | 'Pension Plan'
  | 'Retroactive'
  | 'Premium Card'
  | 'Mobile'
  | 'Absences'
  | 'Sick Leave'
  | 'Other';

export interface DeductionSummary {
  totalDeductions: number;
  items: Deduction[];
} 