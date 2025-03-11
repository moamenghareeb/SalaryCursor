import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';

// Define types for the audit results
interface ReconciliationIssue {
  recordId: string | number;
  days_added: number | null;
  leave_days_added: number | null;
  difference: number;
}

interface LeaveTypeStats {
  count: number;
  totalDays: number;
}

interface CalculatedValues {
  baseLeaveBalance: number;
  actualAnnualLeaveBalance: number;
  actualLeaveBalance: number;
  calculatedTotalBalance: number;
}

interface AuditResults {
  timestamp: string;
  employee: any | null;
  inLieuRecords: {
    raw: any[];
    summary: {
      totalRecords: number;
      hasLeave_days_added: boolean;
      hasDays_added: boolean;
      totalDaysFromDays_added: number;
      totalDaysFromLeave_days_added: number;
      reconciliation: {
        daysAddedSum: number;
        issues: ReconciliationIssue[];
      }
    }
  };
  leaveRecords: {
    raw: any[];
    summary: {
      totalRecords: number;
      totalDaysTaken: number;
      byLeaveType: Record<string, LeaveTypeStats>;
      hasLeaveType: boolean;
      hasStatus: boolean;
    }
  };
  leaveAllocations: {
    raw: any[];
    summary: {
      hasAllocatedDays: boolean;
      totalAllocatedDays: number;
    }
  };
  schema: {
    employees: string[];
    in_lieu_records: string[];
    leaves: string[];
    leave_allocations: string[];
    [key: string]: string[];
  };
  calculated?: CalculatedValues;
}

/**
 * This API endpoint is for debugging purposes only.
 * It provides a complete audit of the database state related to leave balances.
 */
export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production mode' });
  }
  
  // Get user ID from query parameters
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Create an audit results object
    const auditResults: AuditResults = {
      timestamp: new Date().toISOString(),
      employee: null,
      inLieuRecords: {
        raw: [],
        summary: {
          totalRecords: 0,
          hasLeave_days_added: false,
          hasDays_added: false,
          totalDaysFromDays_added: 0,
          totalDaysFromLeave_days_added: 0,
          reconciliation: {
            daysAddedSum: 0,
            issues: []
          }
        }
      },
      leaveRecords: {
        raw: [],
        summary: {
          totalRecords: 0,
          totalDaysTaken: 0,
          byLeaveType: {},
          hasLeaveType: false,
          hasStatus: false
        }
      },
      leaveAllocations: {
        raw: [],
        summary: {
          hasAllocatedDays: false,
          totalAllocatedDays: 0
        }
      },
      schema: {
        employees: [],
        in_lieu_records: [],
        leaves: [],
        leave_allocations: []
      }
    };
    
    // 1. Get employee details
    logger.info(`Auditing employee: ${userId}`);
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (employeeError) {
      logger.error(`Error fetching employee: ${employeeError.message}`);
      return res.status(500).json({ error: employeeError.message });
    }
    
    auditResults.employee = employee;
    
    // 2. Get in-lieu records
    const { data: inLieuRecords, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .select('*')
      .eq('employee_id', userId);
      
    if (inLieuError) {
      logger.error(`Error fetching in-lieu records: ${inLieuError.message}`);
    } else if (inLieuRecords) {
      auditResults.inLieuRecords.raw = inLieuRecords;
      auditResults.inLieuRecords.summary.totalRecords = inLieuRecords.length;
      
      // Analyze in-lieu records
      for (const record of inLieuRecords) {
        // Check for days_added field
        if ('days_added' in record) {
          auditResults.inLieuRecords.summary.hasDays_added = true;
          if (typeof record.days_added === 'number') {
            auditResults.inLieuRecords.summary.totalDaysFromDays_added += record.days_added;
            auditResults.inLieuRecords.summary.reconciliation.daysAddedSum += record.days_added;
          }
        }
        
        // Check for leave_days_added field
        if ('leave_days_added' in record) {
          auditResults.inLieuRecords.summary.hasLeave_days_added = true;
          if (typeof record.leave_days_added === 'number') {
            auditResults.inLieuRecords.summary.totalDaysFromLeave_days_added += record.leave_days_added;
            
            // If both fields exist, check if they're in sync
            if ('days_added' in record && record.days_added !== record.leave_days_added) {
              auditResults.inLieuRecords.summary.reconciliation.issues.push({
                recordId: record.id,
                days_added: record.days_added,
                leave_days_added: record.leave_days_added,
                difference: (record.days_added || 0) - (record.leave_days_added || 0)
              });
            }
          }
        }
      }
    }
    
    // 3. Get leave records
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;
    
    const { data: leaveRecords, error: leaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', userId)
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);
      
    if (leaveError) {
      logger.error(`Error fetching leave records: ${leaveError.message}`);
    } else if (leaveRecords) {
      auditResults.leaveRecords.raw = leaveRecords;
      auditResults.leaveRecords.summary.totalRecords = leaveRecords.length;
      
      // Process leave records
      for (const record of leaveRecords) {
        // Calculate total days taken
        if (typeof record.days_taken === 'number') {
          auditResults.leaveRecords.summary.totalDaysTaken += record.days_taken;
          
          // Track leave types
          if ('leave_type' in record) {
            auditResults.leaveRecords.summary.hasLeaveType = true;
            const leaveType = record.leave_type || 'Unknown';
            
            if (!auditResults.leaveRecords.summary.byLeaveType[leaveType]) {
              auditResults.leaveRecords.summary.byLeaveType[leaveType] = {
                count: 0,
                totalDays: 0
              };
            }
            
            auditResults.leaveRecords.summary.byLeaveType[leaveType].count++;
            auditResults.leaveRecords.summary.byLeaveType[leaveType].totalDays += record.days_taken;
          }
        }
        
        // Check for status field
        if ('status' in record) {
          auditResults.leaveRecords.summary.hasStatus = true;
        }
      }
    }
    
    // 4. Get leave allocations
    const { data: leaveAllocations, error: allocationsError } = await supabase
      .from('leave_allocations')
      .select('*')
      .eq('employee_id', userId)
      .eq('year', currentYear);
      
    if (allocationsError) {
      logger.error(`Error fetching leave allocations: ${allocationsError.message}`);
    } else if (leaveAllocations) {
      auditResults.leaveAllocations.raw = leaveAllocations;
      
      // Process allocations
      for (const allocation of leaveAllocations) {
        if ('allocated_days' in allocation) {
          auditResults.leaveAllocations.summary.hasAllocatedDays = true;
          if (typeof allocation.allocated_days === 'number') {
            auditResults.leaveAllocations.summary.totalAllocatedDays += allocation.allocated_days;
          }
        }
      }
    }
    
    // 5. Get database schema information
    const tables = ['employees', 'in_lieu_records', 'leaves', 'leave_allocations'];
    
    for (const table of tables) {
      // Get a row to analyze structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
        .single();
        
      if (!error && data) {
        auditResults.schema[table] = Object.keys(data);
      } else {
        auditResults.schema[table] = [`Error: ${error?.message || 'Unknown error'}`];
      }
    }
    
    // 6. Add calculated fields
    const calculated: CalculatedValues = {
      baseLeaveBalance: employee?.years_of_service >= 10 ? 24.67 : 18.67,
      actualAnnualLeaveBalance: employee?.annual_leave_balance || 0,
      actualLeaveBalance: employee?.leave_balance || 0,
      calculatedTotalBalance: 0
    };
    
    // Calculate total using the formula: base + in-lieu - taken
    calculated.calculatedTotalBalance = 
      calculated.baseLeaveBalance + 
      auditResults.inLieuRecords.summary.reconciliation.daysAddedSum -
      auditResults.leaveRecords.summary.totalDaysTaken;
      
    auditResults.calculated = calculated;
    
    // Return the audit results
    return res.status(200).json(auditResults);
  } catch (error) {
    logger.error('Error in database audit:', error);
    return res.status(500).json({ error: 'Server error during database audit' });
  }
} 