import type { SalaryCalculation } from '../../types/salary';
import { salaryCalculationSchema } from '../validations/salary';

// Import Sentry safely for both browser and test environments
let Sentry: any;

// This try-catch allows the module to work in test environments where Next.js isn't available
try {
  // Only import Sentry in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    Sentry = require('@sentry/nextjs');
  } else {
    // Create a mock Sentry for test environments
    Sentry = {
      captureException: (error: Error) => console.error('Sentry mock:', error),
      addBreadcrumb: () => {},
    };
  }
} catch (e) {
  // Fallback mock if import fails
  Sentry = {
    captureException: (error: Error) => console.error('Sentry fallback:', error),
    addBreadcrumb: () => {},
  };
}

/**
 * Validates salary calculation inputs using Zod schema
 * @param params - Salary calculation parameters to validate
 * @returns SalaryCalculation - The validated parameters with defaults applied
 * @throws ZodError if validation fails
 */
function validateInputs(params: SalaryCalculation): SalaryCalculation {
  try {
    // Use the Zod schema to validate inputs and transform with defaults
    return salaryCalculationSchema.parse(params);
  } catch (error) {
    // Log validation errors to Sentry with context
    Sentry.captureException(error, {
      extra: {
        inputData: JSON.stringify(params),
        errorType: 'Salary Validation Error'
      },
      tags: {
        feature: 'salary_calculation', 
        errorType: 'validation_error',
        employeeId: params.employeeId || 'unknown',
        month: params.month || 'unknown'
      }
    });
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

function calculateDeductions(params: SalaryCalculation): number {
  const baseDeductions = params.deductions;
  const optionalDeductions = [
    params.premiumCardDeduction || 0,
    params.mobileDeduction || 0,
    params.pensionPlan || 0
  ].reduce((sum, value) => sum + value, 0);

  return baseDeductions + optionalDeductions;
}

function calculateAllowances(params: SalaryCalculation): number {
  const { costOfLiving, shiftAllowance, variablePay } = params;
  return costOfLiving + shiftAllowance + variablePay;
}

/**
 * Calculates salary based on input parameters with error handling and performance optimization
 * 
 * @param params - The salary calculation parameters
 * @returns The complete salary calculation result
 */
export function calculateSalary(params: SalaryCalculation): SalaryCalculation {
  try {
    // Start performance measurement
    const startTime = performance.now();
    
    // Validate and normalize inputs using Zod schema
    const validatedParams = validateInputs(params);
    
    // Calculate standard working hours per month (assuming 22 working days * 8 hours)
    const standardMonthlyHours = 176;

    // Calculate hourly rate
    const hourlyRate = validatedParams.basicSalary / standardMonthlyHours;

    // Calculate overtime pay with standard 1.5x rate
    const overtimePay = validatedParams.overtimeHours > 0
      ? (hourlyRate * validatedParams.overtimeHours * 1.5)
      : 0;

    // Calculate allowances
    const allowances = {
      costOfLiving: validatedParams.costOfLiving,
      shiftAllowance: validatedParams.shiftAllowance,
      variablePay: validatedParams.variablePay,
      transportation: validatedParams.transportation,
      housing: validatedParams.housing,
      meals: validatedParams.meals
    };

    // Calculate total allowances
    const totalAllowances = calculateAllowances(validatedParams);

    // Calculate gross salary (before deductions)
    const grossSalary = validatedParams.basicSalary + overtimePay + totalAllowances;

    // Calculate total deductions
    const deductions = calculateDeductions(validatedParams);

    // Calculate net salary (after deductions)
    const netSalary = grossSalary - deductions;

    const result: SalaryCalculation = {
      ...validatedParams,
      totalSalary: netSalary,
      grossSalary,
      netSalary,
      overtimePay,
      deductions,
      allowances
    };
    
    // End performance measurement
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Log performance metrics in development or when exceeding thresholds
    if (process.env.NODE_ENV === 'development' || executionTime > 100) {
      console.log(`Salary calculation completed in ${executionTime.toFixed(2)}ms`);
      
      if (executionTime > 100) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Slow salary calculation (${executionTime.toFixed(2)}ms)`,
          level: 'warning',
          data: {
            employeeId: validatedParams.employeeId,
            month: validatedParams.month,
            executionTime
          }
        });
      }
    }

    return result;
  } catch (error) {
    // Handle errors and report to Sentry with context
    Sentry.captureException(error, {
      extra: {
        inputData: JSON.stringify(params),
        errorSource: 'calculateSalary',
        errorType: error instanceof Error ? error.name : 'Unknown Error'
      },
      tags: {
        feature: 'salary_calculation',
        employeeId: params.employeeId || 'unknown',
        month: params.month || 'unknown'
      } 
    });
    
    // Rethrow with more context
    if (error instanceof Error) {
      throw new Error(`Salary calculation failed: ${error.message}`);
    }
    throw new Error('Salary calculation failed due to an unknown error');
  }
}
