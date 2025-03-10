import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';

// Define types for the leave data structure
interface EmployeeInfo {
  name: string;
  department: string;
}

interface TeamLeaveRequest {
  id: string;
  employee_id: string;
  employees: EmployeeInfo | null;  // Changed from EmployeeInfo to handle possible null
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
}

interface FormattedLeaveData {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  is_team_member?: boolean;
  employee_name?: string;
  reason?: string;
  duration?: number;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for token in Authorization header (Bearer token)
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // If no token in header, try cookies
  if (!token) {
    // Get auth token from request cookies
    const authCookie = req.cookies['sb-access-token'] || req.cookies['supabase-auth-token'];
    
    // Try to extract token from the cookie
    if (authCookie) {
      try {
        // Handle both direct token and JSON format
        if (authCookie.startsWith('[')) {
          const parsedCookie = JSON.parse(authCookie);
          token = parsedCookie[0].token;
        } else {
          token = authCookie;
        }
      } catch (error) {
        console.error('Error parsing auth cookie:', error);
      }
    }
  }

  // If still no token, return unauthorized
  if (!token) {
    console.warn('No authentication token found in request');
    return res.status(401).json({ error: 'Authentication required. Please log in again.' });
  }

  // Set Supabase JWT
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    console.error('Invalid token or user not found:', userError);
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  const userId = userData.user.id;

  try {
    // Get employee data first to get department
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('department')
      .eq('id', userId)
      .single();

    if (employeeError) {
      console.error('Error fetching employee data:', employeeError);
      return res.status(500).json({ error: 'Failed to fetch employee data. Please try again later.' });
    }

    if (!employeeData || !employeeData.department) {
      console.warn('Employee data or department not found for user:', userId);
      return res.status(404).json({ error: 'Employee information not found. Please contact HR.' });
    }

    // Get start of 6 months ago and end of 6 months from now
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    const sixMonthsFromNow = new Date(today);
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    // Format dates for Supabase
    const startDate = sixMonthsAgo.toISOString().split('T')[0];
    const endDate = sixMonthsFromNow.toISOString().split('T')[0];

    // Query to get leave data for the calendar view
    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        leave_type,
        status,
        reason,
        duration
      `)
      .eq('employee_id', userId)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date', { ascending: true });

    if (leaveError) {
      console.error('Error fetching leave data:', leaveError);
      return res.status(500).json({ error: 'Failed to fetch leave data' });
    }

    // Also get team leave data (for visibility of colleagues' leaves)
    const { data: teamLeaveData, error: teamLeaveError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        employees (
          name,
          department
        ),
        start_date,
        end_date,
        leave_type,
        status
      `)
      .neq('employee_id', userId)
      .eq('status', 'approved')
      .eq('employees.department', employeeData.department)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date', { ascending: true });

    if (teamLeaveError && teamLeaveError.code !== 'PGRST116') {
      // PGRST116 is for "no rows returned" which is not an error for us
      console.error('Error fetching team leave data:', teamLeaveError);
    }

    // Format team leave data to include names
    const formattedTeamLeaveData = teamLeaveData ? (teamLeaveData as unknown as TeamLeaveRequest[]).map(leave => ({
      id: leave.id,
      start_date: leave.start_date,
      end_date: leave.end_date,
      leave_type: leave.leave_type,
      status: leave.status,
      is_team_member: true,
      employee_name: leave.employees?.name || 'Unknown Employee'
    })) : [];

    // Return all leave data
    return res.status(200).json([...leaveData, ...formattedTeamLeaveData] as FormattedLeaveData[]);
  } catch (error) {
    console.error('Error processing leave calendar data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many requests for leave calendar data. Please try again later.'
}); 