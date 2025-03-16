import { z } from 'zod';

// Schema for allowances
export const salaryAllowancesSchema = z.object({
  costOfLiving: z.number().min(0, 'Cost of living allowance cannot be negative').default(0),
  shiftAllowance: z.number().min(0, 'Shift allowance cannot be negative').default(0),
  variablePay: z.number().min(0, 'Variable pay cannot be negative').default(0),
  transportation: z.number().min(0, 'Transportation allowance cannot be negative').default(0),
  housing: z.number().min(0, 'Housing allowance cannot be negative').default(0),
  meals: z.number().min(0, 'Meals allowance cannot be negative').default(0)
});

// Schema for deductions
export const salaryDeductionsSchema = z.object({
  pensionPlan: z.number().min(0, 'Pension plan deduction cannot be negative').default(0),
  premiumCardDeduction: z.number().min(0, 'Premium card deduction cannot be negative').default(0),
  mobileDeduction: z.number().min(0, 'Mobile deduction cannot be negative').default(0),
  absences: z.number().min(0, 'Absences deduction cannot be negative').default(0),
  sickLeave: z.number().min(0, 'Sick leave deduction cannot be negative').default(0),
  actAsPay: z.number().min(0, 'Act as pay cannot be negative').default(0)
});

// Main salary calculation schema
export const salaryCalculationSchema = z.object({
  // Required fields
  basicSalary: z.number().positive('Basic salary must be greater than 0'),
  overtimeHours: z.number().min(0, 'Overtime hours cannot be negative').default(0),
  deductions: z.number().min(0, 'Deductions cannot be negative').default(0),
  employeeId: z.string().min(1, 'Employee ID is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  
  // Allowances (merged from salaryAllowancesSchema)
  costOfLiving: z.number().min(0).default(0),
  shiftAllowance: z.number().min(0).default(0),
  variablePay: z.number().min(0).default(0),
  transportation: z.number().min(0).default(0),
  housing: z.number().min(0).default(0),
  meals: z.number().min(0).default(0),

  // Deductions (merged from salaryDeductionsSchema)
  pensionPlan: z.number().min(0).default(0),
  premiumCardDeduction: z.number().min(0).default(0),
  mobileDeduction: z.number().min(0).default(0),
  absences: z.number().min(0).default(0),
  sickLeave: z.number().min(0).default(0),
  actAsPay: z.number().min(0).default(0),

  // Optional calculated fields
  exchangeRate: z.number().positive('Exchange rate must be greater than 0').default(1),
  overtimePay: z.number().optional(),
  totalSalary: z.number().optional(),
  grossSalary: z.number().optional(),
  netSalary: z.number().optional(),
  allowances: salaryAllowancesSchema.optional()
}).transform(data => {
  // Default calculated values if not provided
  return {
    ...data,
    // Set default values for optional fields to ensure type safety
    overtimePay: data.overtimePay ?? 0,
    totalSalary: data.totalSalary ?? 0,
    grossSalary: data.grossSalary ?? 0,
    netSalary: data.netSalary ?? 0,
    allowances: data.allowances ?? {
      costOfLiving: data.costOfLiving,
      shiftAllowance: data.shiftAllowance,
      variablePay: data.variablePay,
      transportation: data.transportation,
      housing: data.housing,
      meals: data.meals
    }
  };
});

export const leaveRequestSchema = z.object({
  startDate: z.string().datetime({ message: 'Invalid start date' }),
  endDate: z.string().datetime({ message: 'Invalid end date' }),
  leaveType: z.enum(['ANNUAL', 'SICK', 'UNPAID', 'IN_LIEU'], {
    errorMap: () => ({ message: 'Invalid leave type' })
  }),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason is too long'),
  attachments: z.array(z.string().url('Invalid attachment URL')).optional()
});

// Type inference
export type SalaryCalculationInput = z.infer<typeof salaryCalculationSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
