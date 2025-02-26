export interface Employee {
  id: string;
  employee_id: number;
  name: string;
  email: string;
  position: string;
  years_of_service: number;
  created_at: string;
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
}

export interface Leave {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  days_taken: number;
  created_at: string;
}

export interface SalaryCalculation {
  basicSalary: number; // A
  costOfLiving: number; // B
  shiftAllowance: number; // C
  overtimeHours: number;
  overtimePay: number; // D
  variablePay: number; // E
  totalSalary: number;
  exchangeRate: number;
} 