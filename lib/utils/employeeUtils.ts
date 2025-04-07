/**
 * Utility functions and types for employee data
 */

/**
 * A simplified version of the Employee interface for components that don't need all properties
 */
export interface SimplifiedEmployee {
  id: string;
  name: string;
  email?: string;
  position?: string;
  department?: string;
  employeeId?: string;
}

/**
 * Converts a full employee object to a simplified version
 * @param employee The full employee object
 * @returns A simplified employee object with only essential fields
 */
export function toSimplifiedEmployee(employee: any): SimplifiedEmployee | undefined {
  if (!employee) return undefined;
  
  return {
    id: employee.id,
    name: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`,
    email: employee.email,
    position: employee.position || employee.title,
    department: employee.department,
    employeeId: employee.employeeId || employee.id
  };
} 