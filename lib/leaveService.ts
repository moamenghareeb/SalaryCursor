import { supabase } from './supabase';
import { logger } from './logger';

let lastServiceUpdate = Date.now(); // Add a timestamp for cache busting

type LeaveBalanceResult = {
  baseLeaveBalance: number;
  inLieuBalance: number;
  leaveTaken: number;
  remainingBalance: number;
  error?: string;
  debug?: DebugInfo;
  lastUpdated?: number;
};

type DebugInfo = {
  queries: string[];
  results: {
    [key: string]: any;
  };
};

/**
 * Centralized service for calculating leave balances
 * Formula: remaining leave balance = Base annual leave + In Lieu - leave taken
 */
export const leaveService = {
  /**
   * Get the timestamp of last service update for cache busting
   */
  getLastUpdateTimestamp() {
    return lastServiceUpdate;
  },

  /**
   * Calculate the leave balance for a specific employee
   * @param userId - The employee's user ID
   * @param year - Optional year to calculate for (defaults to current year)
   * @param forceFresh - Whether to force a fresh calculation ignoring caches
   * @returns Promise with the leave balance details
   */
  async calculateLeaveBalance(userId: string, year?: number, forceFresh: boolean = false): Promise<LeaveBalanceResult> {
    // Update timestamp to bust cache
    lastServiceUpdate = Date.now();
    
    const debug: DebugInfo = { queries: [], results: {} };
    
    // Add initial logging
    logger.info(`=== LEAVE BALANCE CALCULATION START ===`);
    logger.info(`UserId: ${userId}, Year: ${year || 'current'}, ForceFresh: ${forceFresh}`);
    
    try {
      if (!userId) {
        logger.error('Leave calculation failed: User ID is required');
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
      logger.info(`STEP 1: Fetching employee details for user ${userId}`);
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
      
      logger.info(`Employee data retrieved: annual_leave_balance=${employeeData?.annual_leave_balance}, leave_balance=${employeeData?.leave_balance}, years_of_service=${employeeData?.years_of_service}`);

      // Step 2: Check for specific yearly allocation or use years of service calculation
      logger.info(`STEP 2: Checking leave allocations for year ${currentYear}`);
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
      
      logger.info(`Base leave balance determined: ${baseLeaveBalance}`);

      // Step 3: Get in-lieu records and calculate total additional days
      logger.info(`STEP 3: Fetching in-lieu records for user ${userId}`);
      debug.queries.push('in_lieu_records');
      const { data: inLieuData, error: inLieuError } = await supabase
        .from('in_lieu_records')
        .select('*')
        .eq('employee_id', userId)
        .eq('status', 'approved');  // Only count approved in-lieu records

      debug.results.inLieu = { data: inLieuData, error: inLieuError };

      let inLieuBalance = 0;
      if (!inLieuError && inLieuData) {
        logger.info(`Found ${inLieuData.length} approved in-lieu records`);
        // Sum up all approved in-lieu days using leave_days_added field
        inLieuBalance = inLieuData.reduce((total, record) => {
          const daysAdded = record.leave_days_added || 0;
          logger.debug(`In-lieu record ${record.id}: leave_days_added=${daysAdded}`);
          return total + daysAdded;
        }, 0);
        logger.info(`Calculated in-lieu days: ${inLieuBalance} from ${inLieuData.length} records`);
      } else if (inLieuError) {
        logger.error(`Error fetching in-lieu data: ${inLieuError.message}`);
      }

      // Step 4: Get leave taken for the current year
      logger.info(`STEP 4: Fetching leave taken for year ${currentYear}`);
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;
      
      debug.queries.push('leaves-annual');
      
      // Log the query we're about to execute for debugging
      logger.info(`Executing query: leaves for status 'Approved' or 'approved'`);
      
      // Modified to check for both 'Approved' and 'approved' - case variations
      const { data: takenLeaveData, error: takenLeaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', userId)
        .eq('leave_type', 'Annual')
        .or('status.eq.Approved,status.eq.approved')  // Check both status variations
        .gte('start_date', startOfYear)
        .lte('end_date', endOfYear);

      debug.results.leaves = { data: takenLeaveData, error: takenLeaveError };

      let leaveTaken = 0;
      if (!takenLeaveError && takenLeaveData) {
        logger.info(`Found ${takenLeaveData.length} approved leave records for ${currentYear}`);
        
        // Log each leave record for debugging
        takenLeaveData.forEach(leave => {
          logger.info(`Leave record details: id=${leave.id}, days_taken=${leave.days_taken}, leave_type=${leave.leave_type}, status=${leave.status}, start_date=${leave.start_date}, end_date=${leave.end_date}`);
        });
        
        // Sum up all approved Annual leave using days_taken field
        leaveTaken = takenLeaveData.reduce((total, leave) => {
          const daysTaken = leave.days_taken || 0;
          logger.debug(`Leave record ${leave.id}: days_taken=${daysTaken}, from ${leave.start_date} to ${leave.end_date}`);
          return total + daysTaken;
        }, 0);
        logger.info(`Calculated leave taken: ${leaveTaken} from ${takenLeaveData.length} records`);
      } else if (takenLeaveError) {
        logger.error(`Error fetching taken leave data: ${takenLeaveError.message}`);
      }
      
      // Step 5: Calculate final remaining balance
      logger.info(`STEP 5: Calculating final balance`);
      // Ensure we're working with numbers and rounding to 2 decimal places
      const baseLeaveAsNumber = parseFloat(baseLeaveBalance.toString()) || 0;
      const inLieuAsNumber = parseFloat(inLieuBalance.toString()) || 0;
      const takenAsNumber = parseFloat(leaveTaken.toString()) || 0;
      
      // Do the math and round to 2 decimal places
      const remainingBalance = parseFloat((baseLeaveAsNumber + inLieuAsNumber - takenAsNumber).toFixed(2));
      
      logger.info(`FINAL CALCULATION: ${baseLeaveAsNumber} (base) + ${inLieuAsNumber} (in-lieu) - ${takenAsNumber} (taken) = ${remainingBalance}`);

      // Step 6: Update employee record to ensure consistency across the application
      logger.info(`STEP 6: Updating employee record in database`);
      try {
        const updates = { 
          annual_leave_balance: baseLeaveAsNumber,
          leave_balance: remainingBalance
        };
        
        logger.info(`Updating employee record with: annual_leave_balance=${baseLeaveAsNumber}, leave_balance=${remainingBalance}`);
        
        debug.queries.push('update-employee');
        const { error: updateError } = await supabase
          .from('employees')
          .update(updates)
          .eq('id', userId);

        debug.results.update = { data: updates, error: updateError };

        if (updateError) {
          logger.error(`Error updating employee record: ${updateError.message}`);
          logger.error(`Database update FAILED`);
        } else {
          logger.info(`Database update SUCCESSFUL`);
          logger.info(`Employee record updated with latest leave balances`);
        }
      } catch (updateError: any) {
        logger.error(`Exception during employee record update: ${updateError.message}`);
        logger.error(`Database update FAILED due to exception`);
      }

      logger.info(`=== LEAVE BALANCE CALCULATION COMPLETE ===`);
      return {
        baseLeaveBalance,
        inLieuBalance,
        leaveTaken,
        remainingBalance,
        debug,
        lastUpdated: lastServiceUpdate
      };
      
    } catch (error: any) {
      logger.error(`Unexpected error in leave balance calculation: ${error.message}`);
      logger.error(`=== LEAVE BALANCE CALCULATION FAILED ===`);
      return {
        baseLeaveBalance: 0,
        inLieuBalance: 0, 
        leaveTaken: 0,
        remainingBalance: 0,
        error: `Unexpected error: ${error.message}`,
        debug,
        lastUpdated: lastServiceUpdate
      };
    }
  }
}; 