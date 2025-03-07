export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  position: string;
  yearsOfService: number;
  email: string;
  department: string;
  joinDate: string;
}

export interface SalaryDetails {
  basic: number;
  currency: string;
  month: string;
  year: number;
  netSalary: number;
  allowances: {
    housing: number;
    transportation: number;
    meals: number;
    other: number;
  };
  deductions: {
    tax: number;
    insurance: number;
    pension: number;
    other: number;
  };
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  unpaid: number;
  total: number;
}

export interface LeaveRequest {
  id: string;
  type: 'Annual' | 'Sick' | 'Unpaid';
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
}

export interface SalaryHistory {
  id: string;
  month: string;
  year: number;
  amount: number;
  currency: string;
  paymentDate: string;
}

export interface DashboardStats {
  totalEmployees: number;
  averageSalary: number;
  totalLeaveRequests: number;
  pendingLeaveRequests: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form State Types
export interface SalaryFormState {
  basic: number;
  allowances: {
    housing: number;
    transportation: number;
    meals: number;
    other: number;
  };
  deductions: {
    tax: number;
    insurance: number;
    pension: number;
    other: number;
  };
}

export interface LeaveFormState {
  type: 'Annual' | 'Sick' | 'Unpaid';
  startDate: string;
  endDate: string;
  reason: string;
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
  deduction: number;
  totalSalary: number;
  exchangeRate: number;
  
  // Additional fields used in PDF generation
  actAsPay?: number;
  pensionPlan?: number;
  premiumCardDeduction?: number;
  mobileDeduction?: number;
  absences?: number;
  sickLeave?: number;
}

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