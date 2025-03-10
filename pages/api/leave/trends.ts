import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';

// Define response data types
type MonthlyLeaveData = {
  month: string;
  annual: number;
  casual: number;
  sick: number;
  unpaid: number;
  total: number;
};

type LeaveTypeData = {
  name: string;
  value: number;
  color: string;
};

type LeaveStatsResponse = {
  monthlyData: MonthlyLeaveData[];
  leaveTypeData: LeaveTypeData[];
};

// Function to generate initial empty data when DB is empty
function generateEmptyData(): LeaveStatsResponse {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthlyData: MonthlyLeaveData[] = months.map(month => ({
    month,
    annual: 0,
    casual: 0,
    sick: 0,
    unpaid: 0,
    total: 0,
  }));
  
  const leaveTypeData: LeaveTypeData[] = [
    { name: 'Annual', value: 0, color: '#8884d8' },
    { name: 'Casual', value: 0, color: '#82ca9d' },
    { name: 'Sick', value: 0, color: '#ffc658' },
    { name: 'Unpaid', value: 0, color: '#ff8042' },
  ];
  
  return { monthlyData, leaveTypeData };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enhanced token extraction with better logging
  let token = null;

  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    logger.debug('Using token from Authorization header');
  }
  
  // If no token in header, try cookies
  if (!token) {
    // Check multiple possible cookie names
    const possibleCookies = ['sb-access-token', 'supabase-auth-token'];
    
    for (const cookieName of possibleCookies) {
      const authCookie = req.cookies[cookieName];
      if (authCookie) {
        try {
          logger.debug(`Auth cookie found: ${cookieName}`);
          // Handle both direct token and JSON format
          if (authCookie.startsWith('[')) {
            // Parse JSON format (['token', 'refresh'])
            const parsed = JSON.parse(authCookie);
            token = parsed[0]?.token || parsed[0]; 
            logger.debug('Parsed token from JSON array');
            break;
          } else if (authCookie.startsWith('{')) {
            // Parse JSON object format
            const parsed = JSON.parse(authCookie);
            token = parsed.token || parsed.access_token;
            logger.debug('Parsed token from JSON object');
            break;
          } else {
            token = authCookie;
            logger.debug('Using direct token from cookie');
            break;
          }
        } catch (error) {
          logger.error(`Error parsing auth cookie: ${error}`);
        }
      }
    }
  }

  // If still no token, return unauthorized
  if (!token) {
    logger.warn('No valid auth token found in request');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required. Please log in again.'
    });
  }

  try {
    // Set Supabase JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      logger.error(`Invalid token: ${userError?.message || 'User not found'}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Your session has expired. Please log in again.'
      });
    }

    const userId = userData.user.id;
    logger.info(`Fetching leave trends for user: ${userId}`);

    // Fetch employee information (for department-based filtering)
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id, department_id')
      .eq('id', userId)
      .single();

    if (employeeError) {
      logger.error(`Error fetching employee data: ${employeeError.message}`);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch employee data. Please try again later.'
      });
    }

    if (!employeeData || !employeeData.department_id) {
      logger.warn(`Employee data or department not found for user: ${userId}`);
      // Return empty data instead of an error
      return res.status(200).json(generateEmptyData());
    }

    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Query leave data for this year grouped by month
    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', userId)
      .eq('status', 'approved')
      .gte('start_date', `${currentYear}-01-01`)
      .lte('end_date', `${currentYear}-12-31`);

    if (leaveError) {
      logger.error(`Error fetching leave data: ${leaveError.message}`);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch leave data. Please try again later.'
      });
    }

    // Early return with empty data if no leave records
    if (!leaveData || leaveData.length === 0) {
      logger.info(`No leave data found for user ${userId} in ${currentYear}`);
      return res.status(200).json(generateEmptyData());
    }

    // Process leave data by month
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    // Initialize monthly data with zeros
    const monthlyData: MonthlyLeaveData[] = months.map(month => ({
      month,
      annual: 0,
      casual: 0,
      sick: 0,
      unpaid: 0,
      total: 0,
    }));

    // Process each leave request
    leaveData.forEach(leave => {
      // Extract month from start_date (format: YYYY-MM-DD)
      const startDate = new Date(leave.start_date);
      const monthIndex = startDate.getMonth();
      const leaveType = leave.leave_type.toLowerCase();
      
      // Safely handle duration
      const duration = typeof leave.duration === 'number' ? leave.duration : 0;
      
      // Add to the appropriate leave type if valid
      if (['annual', 'casual', 'sick', 'unpaid'].includes(leaveType)) {
        monthlyData[monthIndex][leaveType as keyof Omit<MonthlyLeaveData, 'month' | 'total'>] += duration;
      } else {
        logger.warn(`Unknown leave type: ${leaveType} for leave ID: ${leave.id}`);
      }
      
      // Update total
      monthlyData[monthIndex].total += duration;
    });

    // Prepare leave type summary for pie chart
    let totalAnnual = 0;
    let totalCasual = 0;
    let totalSick = 0;
    let totalUnpaid = 0;

    monthlyData.forEach(month => {
      totalAnnual += month.annual;
      totalCasual += month.casual;
      totalSick += month.sick;
      totalUnpaid += month.unpaid;
    });

    const leaveTypeData: LeaveTypeData[] = [
      { name: 'Annual', value: totalAnnual, color: '#8884d8' },
      { name: 'Casual', value: totalCasual, color: '#82ca9d' },
      { name: 'Sick', value: totalSick, color: '#ffc658' },
      { name: 'Unpaid', value: totalUnpaid, color: '#ff8042' },
    ];

    // Set cache control headers
    res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');

    logger.info(`Successfully processed leave trends for user: ${userId}`);
    
    return res.status(200).json({
      monthlyData,
      leaveTypeData,
    });
  } catch (error) {
    logger.error(`Server error in leave trends: ${error}`);
    // Return empty data with 200 status for graceful fallback
    return res.status(200).json(generateEmptyData());
  }
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many leave trend requests. Please try again later.'
}); 