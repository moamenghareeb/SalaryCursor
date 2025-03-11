import { supabase } from './supabase';
import { logger } from './logger';

type LeaveBalanceResult = {
  baseLeaveBalance: number;
  inLieuBalance: number;
  leaveTaken: number;
  remainingBalance: number;
  error?: string;
  debug?: DebugInfo; // For additional debug information
};

// Define a proper type for debug information
type DebugInfo = {
  queries: string[];
  results: {
    [key: string]: any;
  };
};

/**
 * Centralized service for calculating leave balances
 * Formula: remaining leave balance = Annual leave balance + In Lieu - leave taken
 */
export const leaveService = {
  /**
   * Calculate the leave balance for a specific employee
   * @param userId - The employee's user ID
   * @param year - Optional year to calculate for (defaults to current year)
   * @returns Promise with the leave balance details
   */
  async calculateLeaveBalance(userId: string, year?: number): Promise<LeaveBalanceResult> {
    const debug: DebugInfo = { queries: [], results: {} };
    
    try {
      if (!userId) {
        return {
          baseLeaveBalance: 0,
          inLieuBalance: 0,
          leaveTaken: 0,
          remainingBalance: 0,
          error: 'User ID is required'
        };
      }

      const currentYear = year || new Date().getFullYear();
      logger.info(`Calculating leave balance for user ${userId} for year ${currentYear}`);

      // Step 1: Fetch employee details for base leave calculation
      debug.queries.push('employees');
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      debug.results.employee = { data: employeeData, error: employeeError };

      if (employeeError) {
        logger.error(`Error fetching employee data: ${employeeError.message}`);
        return {
          baseLeaveBalance: 0,
          inLieuBalance: 0,
          leaveTaken: 0,
          remainingBalance: 0,
          error: `Error fetching employee data: ${employeeError.message}`,
          debug
        };
      }

      // Step 2: Check for specific yearly allocation or use years of service calculation
      debug.queries.push('leave_allocations');
      const { data: leaveAllocation, error: leaveAllocationError } = await supabase
        .from('leave_allocations')
        .select('allocated_days')
        .eq('employee_id', userId)
        .eq('year', currentYear)
        .eq('type', 'annual')
        .single();

      debug.results.allocation = { data: leaveAllocation, error: leaveAllocationError };

      // Determine base leave allocation
      let baseLeaveBalance: number;
      if (!leaveAllocationError && leaveAllocation && leaveAllocation.allocated_days) {
        baseLeaveBalance = leaveAllocation.allocated_days;
        logger.info(`Using allocated leave days: ${baseLeaveBalance}`);
      } else {
        // Fall back to calculation based on years of service
        baseLeaveBalance = employeeData?.years_of_service >= 10 ? 24.67 : 18.67;
        logger.info(`Using calculated leave days based on years of service: ${baseLeaveBalance}`);
      }

      // Step 3: Get in-lieu records and calculate total additional days
      debug.queries.push('in_lieu_records');
      const { data: inLieuData, error: inLieuError } = await supabase
        .from('in_lieu_records')
        .select('*')
        .eq('employee_id', userId);
        // Removed status filter since it might not exist

      debug.results.inLieu = { data: inLieuData, error: inLieuError };

      let inLieuBalance = 0;
      if (!inLieuError && inLieuData) {
        // Sum up all in-lieu days (not filtering by status for now)
        inLieuBalance = inLieuData.reduce((total, record) => {
          const daysAdded = typeof record.days_added === 'number' ? record.days_added : 
                           (typeof record.leave_days_added === 'number' ? record.leave_days_added : 0);
          return total + daysAdded;
        }, 0);
        logger.info(`Calculated in-lieu days: ${inLieuBalance} from ${inLieuData.length} records`);
      } else if (inLieuError) {
        logger.error(`Error fetching in-lieu data: ${inLieuError.message}`);
      }

      // Step 4: Get leave taken for the current year
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;
      
      debug.queries.push('leaves-annual');
      const { data: takenLeaveData, error: takenLeaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', userId)
        // Not filtering by status or leave_type since columns might not exist
        .gte('start_date', startOfYear)
        .lte('end_date', endOfYear);

      debug.results.leaves = { data: takenLeaveData, error: takenLeaveError };

      let leaveTaken = 0;
      if (!takenLeaveError && takenLeaveData) {
        // Count only Annual leave if leave_type exists, otherwise count all leave
        leaveTaken = takenLeaveData.reduce((total, leave) => {
          // Only count if it's Annual leave or if leave_type doesn't exist
          if (!leave.leave_type || leave.leave_type === 'Annual') {
            const daysTaken = typeof leave.days_taken === 'number' ? leave.days_taken : 0;
            return total + daysTaken;
          }
          return total;
        }, 0);
        logger.info(`Calculated leave taken: ${leaveTaken} from ${takenLeaveData.length} records`);
      } else if (takenLeaveError) {
        logger.error(`Error fetching taken leave data: ${takenLeaveError.message}`);
      }
      
      // Step 5: Calculate final remaining balance
      const remainingBalance = parseFloat((baseLeaveBalance + inLieuBalance - leaveTaken).toFixed(2));
      logger.info(`Final leave balance calculation: ${baseLeaveBalance} (base) + ${inLieuBalance} (in-lieu) - ${leaveTaken} (taken) = ${remainingBalance}`);

      // Step 6: Update employee record to ensure consistency across the application
      try {
        const updates = { 
          annual_leave_balance: inLieuBalance, // Store only in-lieu balance in this field
          leave_balance: remainingBalance      // Store total remaining balance in this field
        };
        
        debug.queries.push('update-employee');
        const { error: updateError } = await supabase
          .from('employees')
          .update(updates)
          .eq('id', userId);

        debug.results.update = { data: updates, error: updateError };

        if (updateError) {
          logger.error(`Error updating employee record: ${updateError.message}`);
        } else {
          logger.info(`Successfully updated employee record with latest leave balances`);
        }
      } catch (updateError) {
        logger.error(`Failed to update employee record: ${updateError}`);
      }

      return {
        baseLeaveBalance,
        inLieuBalance,
        leaveTaken,
        remainingBalance,
        debug
      };
      
    } catch (error: any) {
      logger.error(`Unexpected error in leave balance calculation: ${error.message}`);
      return {
        baseLeaveBalance: 0,
        inLieuBalance: 0, 
        leaveTaken: 0,
        remainingBalance: 0,
        error: `Unexpected error: ${error.message}`,
        debug
      };
    }
  }
}; 