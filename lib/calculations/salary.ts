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