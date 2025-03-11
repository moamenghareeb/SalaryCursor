import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { leaveService } from '../../../lib/leaveService';
import { logger } from '../../../lib/logger';

// This is a debug-only endpoint for diagnosing leave balance calculation issues
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Don't allow in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Must have a userId
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required as a query parameter' });
  }

  logger.info(`DEBUG: Running leave balance diagnosis for user ${userId}`);

  try {
    // 1. Get employee record
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();

    if (employeeError) {
      return res.status(404).json({ error: `Employee not found: ${employeeError.message}` });
    }

    // 2. Get leave records
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;
    
    const { data: leaveRecords, error: leaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', userId)
      .eq('leave_type', 'Annual')
      .eq('status', 'approved')
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);

    // 3. Get in-lieu records
    const { data: inLieuRecords, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .select('*')
      .eq('employee_id', userId)
      .eq('status', 'approved');

    // 4. Get leave allocations
    const { data: leaveAllocations, error: allocationsError } = await supabase
      .from('leave_allocations')
      .select('*')
      .eq('employee_id', userId)
      .eq('year', currentYear)
      .eq('type', 'annual');

    // 5. Run the leave service calculation with full debugging
    const leaveCalculation = await leaveService.calculateLeaveBalance(userId, currentYear, true);

    // 6. Build the diagnostic report
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      employee: {
        id: employee.id,
        name: employee.name,
        stored_leave_balance: employee.leave_balance,
        stored_annual_leave_balance: employee.annual_leave_balance,
        years_of_service: employee.years_of_service,
        hire_date: employee.hire_date,
      },
      leave_records: {
        count: leaveRecords?.length || 0,
        records: leaveRecords || [],
        total_days_taken: leaveRecords?.reduce((sum, record) => sum + (record.days_taken || 0), 0) || 0,
        error: leaveError ? leaveError.message : null,
      },
      in_lieu_records: {
        count: inLieuRecords?.length || 0,
        records: inLieuRecords || [],
        total_days_added: inLieuRecords?.reduce((sum, record) => sum + (record.leave_days_added || 0), 0) || 0,
        error: inLieuError ? inLieuError.message : null,
      },
      leave_allocations: {
        count: leaveAllocations?.length || 0,
        records: leaveAllocations || [],
        error: allocationsError ? allocationsError.message : null,
      },
      leave_service_calculation: leaveCalculation,
      manual_calculation: {
        base_leave: employee?.years_of_service >= 10 ? 24.67 : 18.67,
        allocated_leave: leaveAllocations?.[0]?.allocated_days || null,
        base_to_use: leaveAllocations?.[0]?.allocated_days || (employee?.years_of_service >= 10 ? 24.67 : 18.67),
        in_lieu_days: inLieuRecords?.reduce((sum, record) => sum + (record.leave_days_added || 0), 0) || 0,
        days_taken: leaveRecords?.reduce((sum, record) => sum + (record.days_taken || 0), 0) || 0,
        calculated_balance: 0,
      }
    };

    // Calculate the manual balance
    const baseLeave = diagnosticReport.manual_calculation.base_to_use;
    const inLieuDays = diagnosticReport.manual_calculation.in_lieu_days;
    const daysTaken = diagnosticReport.manual_calculation.days_taken;
    diagnosticReport.manual_calculation.calculated_balance = parseFloat((baseLeave + inLieuDays - daysTaken).toFixed(2));

    // Return the diagnostic report
    return res.status(200).json(diagnosticReport);
  } catch (error: any) {
    logger.error('Error in leave balance diagnostic:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
} 