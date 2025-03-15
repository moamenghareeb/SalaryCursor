import { SalaryCalculation } from '../../types';

interface CalculatedSalary {
  totalSalary: number;
  baseAmount: number;
  overtimeAmount: number;
  deductionsAmount: number;
  bonusesAmount: number;
  costOfLivingAmount?: number;
  shiftAllowanceAmount?: number;
  variablePayAmount?: number;
}

export function calculateSalary(params: SalaryCalculation): CalculatedSalary {
  // Validate inputs
  if (params.baseSalary <= 0) {
    throw new Error('Invalid base salary');
  }

  // Calculate standard working hours per month (assuming 22 working days * 8 hours)
  const standardMonthlyHours = 176;

  // Calculate hourly rate
  const hourlyRate = params.baseSalary / standardMonthlyHours;

  // Calculate overtime amount
  const overtimeAmount = params.overtimeHours 
    ? (hourlyRate * params.overtimeHours * 1.5) // Using fixed overtime rate of 1.5
    : 0;

  // Calculate additional components
  const costOfLivingAmount = params.costOfLiving || 0;
  const shiftAllowanceAmount = params.shiftAllowance || 0;
  const variablePayAmount = params.variablePay || 0;

  // Calculate total with all components
  const baseAmount = params.baseSalary;
  const deductionsAmount = params.deductions || 0;
  const bonusesAmount = 0; // Bonuses handled through variablePay

  // Calculate final total
  const totalSalary = baseAmount + 
    overtimeAmount + 
    costOfLivingAmount + 
    shiftAllowanceAmount + 
    variablePayAmount + 
    bonusesAmount - 
    deductionsAmount;

  return {
    totalSalary,
    baseAmount,
    overtimeAmount,
    deductionsAmount,
    bonusesAmount,
    costOfLivingAmount,
    shiftAllowanceAmount,
    variablePayAmount
  };
}
