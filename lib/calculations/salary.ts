export interface SalaryData {
  basicSalary: number;
  overtimeHours: number;
  deductions: number;
  allowances: number;
  month: string;
}

export class SalaryCalculation {
  private data: SalaryData;
  private readonly OVERTIME_RATE = 1.5; // 150% of basic salary per hour

  constructor(data: SalaryData) {
    this.data = data;
  }

  get basicSalary(): number {
    return this.data.basicSalary;
  }

  get overtimePay(): number {
    const hourlyRate = this.data.basicSalary / 160; // Assuming 160 working hours per month
    return this.data.overtimeHours * hourlyRate * this.OVERTIME_RATE;
  }

  get allowances(): number {
    return this.data.allowances;
  }

  get deductions(): number {
    return this.data.deductions;
  }

  get netSalary(): number {
    return this.basicSalary + this.overtimePay + this.allowances - this.deductions;
  }
}

// Basic salary calculation interface used in the form
export interface BasicSalaryCalculation {
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

// Default values for basic salary calculation
export const defaultSalaryCalc: BasicSalaryCalculation = {
  basicSalary: 0,
  costOfLiving: 0,
  shiftAllowance: 0,
  overtimeHours: 0,
  manualOvertimeHours: 0,
  overtimePay: 0,
  variablePay: 0,
  deduction: 0,
  totalSalary: 0,
  exchangeRate: 0,
};

// Helper functions for salary calculations
export function calculateOvertimePay(basicSalary: number, costOfLiving: number, overtimeHours: number): number {
  return ((basicSalary + costOfLiving) / 210) * overtimeHours;
}

export function calculateVariablePay(
  basicSalary: number,
  costOfLiving: number,
  shiftAllowance: number,
  overtimePay: number,
  exchangeRate: number
): number {
  return (basicSalary + costOfLiving + shiftAllowance + overtimePay) * ((exchangeRate / 31) - 1);
}

export function calculateTotalSalary(
  basicSalary: number,
  costOfLiving: number,
  shiftAllowance: number,
  overtimePay: number,
  variablePay: number,
  deduction: number
): number {
  return basicSalary + costOfLiving + shiftAllowance + overtimePay + variablePay - deduction;
}

export function testCalculation() {
  const basicSalary = 23517;
  const costOfLiving = 6300;
  const shiftAllowance = 2200;
  const overtimeHours = 96;
  const deductions = 98.35;
  const exchangeRate = 50.6;

  // Calculate overtime pay
  const overtimePay = calculateOvertimePay(basicSalary, costOfLiving, overtimeHours);

  // Calculate variable pay
  const variablePay = calculateVariablePay(basicSalary, costOfLiving, shiftAllowance, overtimePay, exchangeRate);

  // Calculate total salary
  const totalSalary = calculateTotalSalary(basicSalary, costOfLiving, shiftAllowance, overtimePay, variablePay, deductions);

  return {
    overtimePay,
    variablePay,
    totalSalary
  };
} 