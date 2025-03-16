import { calculateSalary } from '../../../lib/salary/calculations';
import type { SalaryCalculation, SalaryAllowances } from '../../../types/salary';
import { ZodError } from 'zod';

// We'll use expect().toBeTruthy() instead of fail()

// Note: In a real environment, NODE_ENV would be set by the test runner
// Jest automatically sets NODE_ENV to 'test' during test execution

describe('Salary Calculations', () => {
  // Create a default allowances object
  const defaultAllowances: SalaryAllowances = {
    costOfLiving: 500,
    shiftAllowance: 300,
    variablePay: 0,
    transportation: 0,
    housing: 0,
    meals: 0
  };

  // The mock salary input used as a base for all tests
  const mockBaseSalary: SalaryCalculation = {
    employeeId: 'test-employee',
    month: '2025-03',
    basicSalary: 10000,
    costOfLiving: 500,
    shiftAllowance: 300,
    overtimeHours: 10,
    variablePay: 0,
    deductions: 0,
    exchangeRate: 1,
    // Deductions
    premiumCardDeduction: 0,
    mobileDeduction: 0,
    pensionPlan: 0,
    absences: 0,
    sickLeave: 0,
    actAsPay: 0,
    // Transportation allowances
    transportation: 0,
    housing: 0,
    meals: 0,
    // Calculated fields (initialized with 0)
    overtimePay: 0,
    totalSalary: 0,
    grossSalary: 0,
    netSalary: 0,
    allowances: defaultAllowances
  };

  test('calculates gross salary correctly', () => {
    const result = calculateSalary(mockBaseSalary);
    const expectedOvertimePay = (10000/176) * 10 * 1.5;
    const expectedGrossSalary = 10000 + expectedOvertimePay + 500 + 300;
    expect(result.grossSalary).toBeCloseTo(expectedGrossSalary, 2);
  });

  test('calculates net salary correctly with deductions', () => {
    const salaryWithDeductions: SalaryCalculation = {
      ...mockBaseSalary,
      deductions: 1000,
      premiumCardDeduction: 200,
      mobileDeduction: 100,
      pensionPlan: 500,
      // Ensure all optional fields are included
      absences: 0,
      sickLeave: 0,
      actAsPay: 0
    };
    const result = calculateSalary(salaryWithDeductions);
    const expectedOvertimePay = (10000/176) * 10 * 1.5;
    const expectedGrossSalary = 10000 + expectedOvertimePay + 500 + 300;
    const totalDeductions = 1000 + 200 + 100 + 500;
    expect(result.netSalary).toBeCloseTo(expectedGrossSalary - totalDeductions, 2);
  });

  test('handles zero overtime correctly', () => {
    const noOvertimeSalary: SalaryCalculation = { ...mockBaseSalary, overtimeHours: 0 };
    const result = calculateSalary(noOvertimeSalary);
    expect(result.overtimePay).toBe(0);
    expect(result.grossSalary).toBeCloseTo(10000 + 500 + 300, 2); // base + cost of living + shift allowance
  });

  test('calculates allowances correctly', () => {
    const salaryWithAllowances: SalaryCalculation = {
      ...mockBaseSalary,
      costOfLiving: 1000,
      shiftAllowance: 500,
      variablePay: 2000
    };
    const result = calculateSalary(salaryWithAllowances);
    expect(result.allowances).toEqual({
      costOfLiving: 1000,
      shiftAllowance: 500,
      variablePay: 2000,
      transportation: 0,
      housing: 0,
      meals: 0
    });
  });

  describe('input validation with Zod', () => {
    test('throws error for negative base salary', () => {
      const invalidSalary: SalaryCalculation = { ...mockBaseSalary, basicSalary: -1000 };
      expect(() => calculateSalary(invalidSalary)).toThrow('Salary calculation failed');
      try {
        calculateSalary(invalidSalary);
      } catch (error: unknown) {
        // ZodError won't be an instance in test environment due to module differences
        // So we check the error message instead
        if (error instanceof Error) {
          expect(error.message).toContain('Salary calculation failed');
        } else {
          // Handle non-Error types
          expect(false).toBeTruthy(); // Force test to fail
          console.error('Expected an error with a message property');
        }
      }
    });

    test('throws error for negative overtime hours', () => {
      const invalidSalary: SalaryCalculation = { ...mockBaseSalary, overtimeHours: -5 };
      expect(() => calculateSalary(invalidSalary)).toThrow('Salary calculation failed');
    });

    test('throws error for negative deductions', () => {
      const invalidSalary: SalaryCalculation = { ...mockBaseSalary, deductions: -500 };
      expect(() => calculateSalary(invalidSalary)).toThrow('Salary calculation failed');
    });

    test('validates other optional fields correctly', () => {
      const validSalary: SalaryCalculation = {
        ...mockBaseSalary,
        transportation: 200,
        housing: 1000,
        meals: 300
      };
      const result = calculateSalary(validSalary);
      expect(result.allowances.transportation).toBe(200);
      expect(result.allowances.housing).toBe(1000);
      expect(result.allowances.meals).toBe(300);
    });

    test('handles missing optional fields with defaults', () => {
      // Create a minimal salary object without optional fields
      const minimalSalary = {
        employeeId: 'test-employee',
        month: '2025-03',
        basicSalary: 10000,
        costOfLiving: 500,
        shiftAllowance: 300,
        overtimeHours: 10,
        variablePay: 0,
        deductions: 0,
        exchangeRate: 1
      };
      
      // This should not throw because optional fields should be set to defaults
      const result = calculateSalary(minimalSalary as SalaryCalculation);
      expect(result).toBeDefined();
      expect(result.netSalary).toBeGreaterThan(0);
    });
  });
});
