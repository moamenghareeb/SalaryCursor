export interface SalaryData {
  basicSalary: number;
  overtimeHours: number;
  deductions: number;
  allowances: number;
  month: string;
}

export class SalaryCalculation {
  constructor(data: SalaryData);
  readonly basicSalary: number;
  readonly overtimePay: number;
  readonly allowances: number;
  readonly deductions: number;
  readonly netSalary: number;
} 