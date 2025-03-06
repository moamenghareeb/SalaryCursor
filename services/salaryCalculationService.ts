interface SalaryComponents {
  basicSalary: number
  costOfLiving: number
  shiftAllowance: number
  overtimeHours: number
  deduction: number
  taxRate?: number
}

class SalaryCalculationService {
  private static STANDARD_WORK_HOURS = 160
  private static OVERTIME_MULTIPLIER = 1.5

  static calculateSalary(components: SalaryComponents) {
    const {
      basicSalary,
      costOfLiving,
      shiftAllowance,
      overtimeHours,
      deduction,
      taxRate = 0.1 // Default tax rate
    } = components

    // Detailed calculation breakdown
    const overtimeRate = basicSalary / this.STANDARD_WORK_HOURS * this.OVERTIME_MULTIPLIER
    const overtimePay = overtimeHours * overtimeRate

    const grossSalary = 
      basicSalary + 
      costOfLiving + 
      shiftAllowance + 
      overtimePay

    const taxAmount = grossSalary * taxRate
    const netSalary = grossSalary - deduction - taxAmount

    return {
      components: {
        basicSalary,
        costOfLiving,
        shiftAllowance,
        overtimeHours
      },
      calculations: {
        overtimeRate,
        overtimePay,
        grossSalary,
        taxRate,
        taxAmount,
        deduction,
        netSalary
      },
      summary: {
        totalEarnings: grossSalary,
        takeHomePay: netSalary
      }
    }
  }

  static validateSalaryComponents(components: SalaryComponents): boolean {
    const errors: string[] = []

    if (components.basicSalary < 0) errors.push('Basic salary cannot be negative')
    if (components.overtimeHours < 0) errors.push('Overtime hours cannot be negative')
    if (components.deduction < 0) errors.push('Deduction cannot be negative')

    if (errors.length > 0) {
      throw new Error(errors.join('; '))
    }

    return true
  }
}

export default SalaryCalculationService 