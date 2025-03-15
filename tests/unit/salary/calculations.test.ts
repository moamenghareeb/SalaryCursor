import { calculateSalary } from '../../../lib/salary/calculations';
import { SalaryCalculation } from '../../../types';

describe('Salary Calculations', () => {
  const mockBaseSalary: SalaryCalculation = {
    baseSalary: 10000,
    overtimeHours: 10,
    overtimeRate: 1.5,
    deductions: 0,
    bonuses: 0,
    month: '2025-03',
    employee_id: 'test-employee'
  };

  test('calculates basic salary correctly', () => {
    const result = calculateSalary(mockBaseSalary);
    expect(result.totalSalary).toBe(10000 + (10000/176) * 10 * 1.5);
  });

  test('handles zero overtime correctly', () => {
    const noOvertimeSalary = { ...mockBaseSalary, overtimeHours: 0 };
    const result = calculateSalary(noOvertimeSalary);
    expect(result.totalSalary).toBe(10000);
  });

  test('applies deductions correctly', () => {
    const salaryWithDeductions = { ...mockBaseSalary, deductions: 1000 };
    const result = calculateSalary(salaryWithDeductions);
    const expectedBase = 10000 + (10000/176) * 10 * 1.5;
    expect(result.totalSalary).toBe(expectedBase - 1000);
  });

  test('applies bonuses correctly', () => {
    const salaryWithBonus = { ...mockBaseSalary, bonuses: 2000 };
    const result = calculateSalary(salaryWithBonus);
    const expectedBase = 10000 + (10000/176) * 10 * 1.5;
    expect(result.totalSalary).toBe(expectedBase + 2000);
  });

  test('handles invalid inputs', () => {
    const invalidSalary = { ...mockBaseSalary, baseSalary: -1000 };
    expect(() => calculateSalary(invalidSalary)).toThrow('Invalid base salary');
  });
});
