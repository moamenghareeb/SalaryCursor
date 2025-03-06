export function validateSalaryInput(data: any) {
  const errors: Record<string, string> = {}

  // Month validation
  if (!data.month || typeof data.month !== 'string') {
    errors.month = 'Invalid month format'
  }

  // Basic Salary validation
  if (typeof data.basicSalary !== 'number' || data.basicSalary < 0) {
    errors.basicSalary = 'Basic salary must be a non-negative number'
  }

  // Cost of Living validation
  if (typeof data.costOfLiving !== 'number' || data.costOfLiving < 0) {
    errors.costOfLiving = 'Cost of living must be a non-negative number'
  }

  // Overtime Hours validation
  if (typeof data.overtimeHours !== 'number' || data.overtimeHours < 0) {
    errors.overtimeHours = 'Overtime hours must be a non-negative number'
  }

  // Throw validation
} 