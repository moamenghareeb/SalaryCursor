import { z } from 'zod';

export const salaryCalculationSchema = z.object({
  baseSalary: z.number().positive('Base salary must be greater than 0'),
  overtimeHours: z.number().min(0, 'Overtime hours cannot be negative').default(0),
  overtimeRate: z.number().min(1, 'Overtime rate must be at least 1').default(1.5),
  deductions: z.number().min(0, 'Deductions cannot be negative').default(0),
  bonuses: z.number().min(0, 'Bonuses cannot be negative').default(0),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  employee_id: z.string().min(1, 'Employee ID is required')
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
