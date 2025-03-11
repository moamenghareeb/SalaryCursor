import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Authenticate user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      logger.error('Authentication error:', userError);
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Your session has expired. Please log in again.'
      });
    }

    const userId = userData.user.id;
    logger.info(`Fetching direct dashboard data for user: ${userId}`);

    // Execute all database queries in parallel for efficiency
    const [employeeResult, salaryResult, leavesResult, inLieuResult] = await Promise.all([
      // Get employee data
      supabase
        .from('employees')
        .select('id, name, email, annual_leave_balance, years_of_service')
        .eq('id', userId)
        .single(),
      
      // Get latest salary
      supabase
        .from('salaries')
        .select('id, month, total_salary')
        .eq('employee_id', userId)
        .order('month', { ascending: false })
        .limit(1)
        .single(),
      
      // Get ALL leave records for this user (no date filters)
      supabase
        .from('leaves')
        .select('id, start_date, end_date, days_taken, leave_type, status')
        .eq('employee_id', userId)
        .order('start_date', { ascending: false }),
      
      // Get in-lieu records
      supabase
        .from('in_lieu_records')
        .select('id, leave_days_added, status')
        .eq('employee_id', userId)
        .eq('status', 'approved')
    ]);

    // Handle any query errors
    if (employeeResult.error) {
      logger.error('Error fetching employee data:', employeeResult.error);
      return res.status(500).json({ error: 'Failed to fetch employee data' });
    }

    // Process leave data
    let leaveRecords: Array<{
      id: string;
      start_date: string;
      end_date: string;
      days_taken: number;
      leave_type: string;
      status: string;
    }> = [];
    let daysTaken = 0;
    
    if (!leavesResult.error && leavesResult.data) {
      // Filter for only approved Annual leaves and calculate days taken
      const approvedLeaves = leavesResult.data.filter(leave => 
        leave.status === 'approved' && 
        (leave.leave_type?.toLowerCase().includes('annual') || !leave.leave_type)
      );
      
      daysTaken = approvedLeaves.reduce((total, leave) => total + (leave.days_taken || 0), 0);
      leaveRecords = leavesResult.data;
      
      logger.info(`Found ${leavesResult.data.length} total leave records, ${approvedLeaves.length} approved Annual leaves`);
      logger.info(`Total days taken: ${daysTaken}`);
    } else if (leavesResult.error) {
      logger.error('Error fetching leave data:', leavesResult.error);
    }

    // Process in-lieu data
    let inLieuDays = 0;
    
    if (!inLieuResult.error && inLieuResult.data) {
      inLieuDays = inLieuResult.data.reduce((total, record) => total + (record.leave_days_added || 0), 0);
      logger.info(`Found ${inLieuResult.data.length} approved in-lieu records, total days: ${inLieuDays}`);
    } else if (inLieuResult.error) {
      logger.error('Error fetching in-lieu data:', inLieuResult.error);
    }

    // Calculate leave balance
    const baseBalance = employeeResult.data?.annual_leave_balance || 
                        (employeeResult.data?.years_of_service >= 10 ? 24.67 : 18.67);
    const remainingBalance = parseFloat((baseBalance + inLieuDays - daysTaken).toFixed(2));
    
    logger.info(`Leave balance calculation: ${baseBalance} (base) + ${inLieuDays} (in-lieu) - ${daysTaken} (taken) = ${remainingBalance}`);

    // Compile the dashboard data
    const dashboardData = {
      employee: employeeResult.data || null,
      salary: salaryResult.error ? null : salaryResult.data,
      leave: {
        baseBalance,
        inLieuDays,
        daysTaken,
        remainingBalance,
        leaveRecords: leaveRecords || []
      }
    };

    // Return the dashboard data
    return res.status(200).json(dashboardData);
  } catch (error: any) {
    logger.error('Unexpected error in dashboard-direct API:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred'
    });
  }
} 