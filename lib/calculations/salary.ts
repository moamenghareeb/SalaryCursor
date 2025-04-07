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
  otherEarnings: number; // Added other earnings field
  overtimeHours: number;
  manualOvertimeHours: number;
  // Breakdown of overtime by type
  dayOvertimeHours: number;
  nightOvertimeHours: number;
  holidayOvertimeHours: number;
  effectiveOvertimeHours: number; // Total after applying multipliers
  overtimePay: number;
  variablePay: number;
  deduction: number;
  totalSalary: number;
  exchangeRate: number;
  rateRatio: number; // Exchange rate / 30.8 ratio
}

// Default values for basic salary calculation
export const defaultSalaryCalc: BasicSalaryCalculation = {
  basicSalary: 0,
  costOfLiving: 0,
  shiftAllowance: 0,
  otherEarnings: 0, // Initialize other earnings
  overtimeHours: 0,
  manualOvertimeHours: 0,
  // Initialize overtime breakdown by type
  dayOvertimeHours: 0,
  nightOvertimeHours: 0,
  holidayOvertimeHours: 0,
  effectiveOvertimeHours: 0,
  overtimePay: 0,
  variablePay: 0,
  deduction: 0,
  totalSalary: 0,
  exchangeRate: 0,
  rateRatio: 0, // Initialize rate ratio
};

// Helper functions for salary calculations
/**
 * Calculate overtime pay based on overtime hours and type
 * @param basicSalary Basic salary amount
 * @param costOfLiving Cost of living allowance
 * @param effectiveOvertimeHours Effective overtime hours after applying multipliers
 * @returns Overtime pay amount
 */
export function calculateOvertimePay(
  basicSalary: number, 
  costOfLiving: number, 
  effectiveOvertimeHours: number
): number {
  // Base calculation is (basicSalary + costOfLiving) / 210 * effective hours
  // where effective hours already includes the multipliers
  return ((basicSalary + costOfLiving) / 210) * effectiveOvertimeHours;
}

/**
 * Calculate variable pay based on inputs
 * No longer needed in the new formula - keeping for backward compatibility
 */
export function calculateVariablePay(
  basicSalary: number,
  costOfLiving: number,
  shiftAllowance: number,
  overtimePay: number,
  exchangeRate: number
): number {
  // Return 0 as this is no longer used in the new formula
  return 0;
}

/**
 * Calculate total salary according to formula:
 * Total Salary = [(Basic Salary + Cost of Living + Shift allowance + Other Earnings + Overtime)*(Exchange Rate/30.8)] - deductions
 */
export function calculateTotalSalary(
  basicSalary: number,
  costOfLiving: number,
  shiftAllowance: number,
  otherEarnings: number,
  overtimePay: number,
  exchangeRate: number,
  deduction: number
): number {
  // Calculate the rate ratio (Exchange Rate/30.8)
  const rateRatio = exchangeRate / 30.8;
  
  // Apply the formula: [(X+Y+Z+E+O)*(Rate/30.8)]-F
  return (basicSalary + costOfLiving + shiftAllowance + otherEarnings + overtimePay) * rateRatio - deduction;
}

/**
 * Calculate effective overtime hours based on different overtime types and their multipliers
 * @param dayHours Day overtime hours (1.5x multiplier)
 * @param nightHours Night overtime hours (1.75x multiplier)
 * @param holidayHours Public holiday overtime hours (2.0x multiplier)
 * @returns Effective overtime hours
 */
export function calculateEffectiveOvertimeHours(
  dayHours: number,
  nightHours: number,
  holidayHours: number
): number {
  return (
    dayHours * 1.5 +      // Day overtime: 150%
    nightHours * 1.75 +   // Night overtime: 175%
    holidayHours * 2.0    // Holiday overtime: 200%
  );
}

/**
 * Test the salary calculation with sample data
 */
export function testCalculation() {
  const basicSalary = 23517;
  const costOfLiving = 6300;
  const shiftAllowance = 2200;
  const otherEarnings = 1500;
  const dayOvertimeHours = 64;      // Regular day overtime
  const nightOvertimeHours = 24;    // Night overtime
  const holidayOvertimeHours = 8;   // Public holiday overtime
  const deductions = 98.35;
  const exchangeRate = 50.6;

  // Calculate effective overtime hours with multipliers
  const effectiveOvertimeHours = calculateEffectiveOvertimeHours(
    dayOvertimeHours,
    nightOvertimeHours,
    holidayOvertimeHours
  );

  // Calculate overtime pay based on effective hours
  const overtimePay = calculateOvertimePay(basicSalary, costOfLiving, effectiveOvertimeHours);

  // Calculate rate ratio
  const rateRatio = exchangeRate / 30.8;

  // Calculate total salary
  const totalSalary = calculateTotalSalary(
    basicSalary,
    costOfLiving,
    shiftAllowance,
    otherEarnings,
    overtimePay,
    exchangeRate,
    deductions
  );

  return {
    effectiveOvertimeHours,
    overtimePay,
    rateRatio,
    totalSalary
  };
} 