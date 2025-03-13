// Types for SalaryCursor application

export interface Employee {
  id: string;
  name: string;
  employee_id: string;
  email: string;
  position: string;
  created_at: string;
  updated_at: string;
  years_of_service: number;
  is_admin: boolean;
}

export interface Leave {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  days_taken: number;
  created_at: string;
  start_date?: string;
  end_date?: string;
  type?: 'Annual' | 'Sick' | 'Unpaid' | 'Compassionate';
  leave_type?: 'Annual' | 'Sick' | 'Unpaid' | 'Compassionate';
  status?: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
}

export interface SalaryCalculation {
  basicSalary: number;
  baseSalary: number;
  costOfLiving: number;
  shiftAllowance: number;
  overtimeHours: number;
  overtimePay: number;
  variablePay: number;
  deduction: number;
  totalSalary: number;
  overtime: number;
  deductions: number;
  totalEarnings: number;
  netSalary: number;
  taxableIncome: number;
  socialInsurance: number;
  allowances: {
    transportation: number;
    housing: number;
    meals: number;
  };
  monthlyBreakdown?: Array<{
    month: string;
    total: number;
  }>;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: 'Annual' | 'Sick' | 'Unpaid' | 'Compassionate';
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
}

export interface InLieuRecord {
  id?: string;
  employee_id?: string;
  date?: string;
  status?: string;
  reason?: string;
  leave_days_added?: number;
  leave_type?: 'Annual' | 'Sick' | 'Unpaid' | 'Compassionate';
}

export interface ShiftOverride {
  id?: string;
  employee_id: string;
  date: string;
  shift_type: 'Day' | 'Night' | 'Off' | 'Leave' | 'Public' | 'Overtime' | 'InLieu';
  notes?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isOfficial: boolean;
  country?: string;
}