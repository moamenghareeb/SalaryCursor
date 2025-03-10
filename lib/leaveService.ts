import { supabase } from './supabase';
import { logger } from './logger';

type LeaveBalanceResult = {
  baseLeaveBalance: number;
  inLieuBalance: number;
  leaveTaken: number;
  remainingBalance: number;
  error?: string;
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
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      if (employeeError) {
        logger.error(`Error fetching employee data: ${employeeError.message}`);
        return {
          baseLeaveBalance: 0,
          inLieuBalance: 0,
          leaveTaken: 0,
          remainingBalance: 0,
          error: `Error fetching employee data: ${employeeError.message}`
        };
      }

      // Step 2: Check for specific yearly allocation or use years of service calculation
      const { data: leaveAllocation, error: leaveAllocationError } = await supabase
        .from('leave_allocations')
        .select('allocated_days')
        .eq('employee_id', userId)
        .eq('year', currentYear)
        .eq('type', 'annual')
        .single();

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
      const { data: inLieuData, error: inLieuError } = await supabase
        .from('in_lieu_records')
        .select('*')
        .eq('employee_id', userId)
        .eq('status', 'approved');

      let inLieuBalance = 0;
      if (!inLieuError && inLieuData) {
        // Sum up all approved in-lieu days
        inLieuBalance = inLieuData.reduce((total, record) => {
          const daysAdded = typeof record.days_added === 'number' ? record.days_added : 0;
          return total + daysAdded;
        }, 0);
        logger.info(`Calculated in-lieu days: ${inLieuBalance} from ${inLieuData.length} records`);
      } else if (inLieuError) {
        logger.error(`Error fetching in-lieu data: ${inLieuError.message}`);
      }

      // Step 4: Get leave taken for the current year
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;
      
      const { data: takenLeaveData, error: takenLeaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', userId)
        .eq('status', 'approved')
        .eq('leave_type', 'Annual')
        .gte('start_date', startOfYear)
        .lte('end_date', endOfYear);

      let leaveTaken = 0;
      if (!takenLeaveError && takenLeaveData) {
        leaveTaken = takenLeaveData.reduce((total, leave) => {
          const daysTaken = typeof leave.days_taken === 'number' ? leave.days_taken : 0;
          return total + daysTaken;
        }, 0);
        logger.info(`Calculated Annual leave taken: ${leaveTaken} from ${takenLeaveData.length} records`);
      } else if (takenLeaveError) {
        logger.error(`Error fetching taken leave data: ${takenLeaveError.message}`);
      }
      
      // Step 5: Get count of all leave types for reporting
      const { data: allLeaveData } = await supabase
        .from('leaves')
        .select('id, leave_type, days_taken')
        .eq('employee_id', userId)
        .eq('status', 'approved')
        .gte('start_date', startOfYear)
        .lte('end_date', endOfYear);
        
      // Log breakdown of different leave types
      if (allLeaveData && allLeaveData.length > 0) {
        const leaveBreakdown = allLeaveData.reduce((acc: Record<string, number>, leave) => {
          const leaveType = leave.leave_type || 'Annual';
          const days = typeof leave.days_taken === 'number' ? leave.days_taken : 0;
          acc[leaveType] = (acc[leaveType] || 0) + days;
          return acc;
        }, {});
        
        logger.info(`Leave breakdown for ${currentYear}: ${JSON.stringify(leaveBreakdown)}`);
      }

      // Step 6: Calculate final remaining balance
      const remainingBalance = parseFloat((baseLeaveBalance + inLieuBalance - leaveTaken).toFixed(2));
      logger.info(`Final leave balance calculation: ${baseLeaveBalance} (base) + ${inLieuBalance} (in-lieu) - ${leaveTaken} (taken) = ${remainingBalance}`);

      // Step 7: Update employee record to ensure consistency across the application
      const { error: updateError } = await supabase
        .from('employees')
        .update({ 
          annual_leave_balance: inLieuBalance,  // Store only in-lieu balance in this field
          leave_balance: remainingBalance       // Store total remaining balance in this field
        })
        .eq('id', userId);

      if (updateError) {
        logger.error(`Error updating employee record: ${updateError.message}`);
      } else {
        logger.info(`Successfully updated employee record with latest leave balances`);
      }

      return {
        baseLeaveBalance,
        inLieuBalance,
        leaveTaken,
        remainingBalance
      };
      
    } catch (error: any) {
      logger.error(`Unexpected error in leave balance calculation: ${error.message}`);
      return {
        baseLeaveBalance: 0,
        inLieuBalance: 0, 
        leaveTaken: 0,
        remainingBalance: 0,
        error: `Unexpected error: ${error.message}`
      };
    }
  }
}; 