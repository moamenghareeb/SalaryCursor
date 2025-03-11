import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';
import { leaveService } from '../../../lib/leaveService';

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
  remainingBalance?: number;
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

  // Enhanced token extraction similar to dashboard API
  let token = null;

  // Check for token in Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    logger.debug('Using token from Authorization header');
  }
  
  // If no token in header, try cookies
  if (!token) {
    // Get auth token from request cookies
    const possibleCookies = ['sb-access-token', 'supabase-auth-token'];
    
    for (const cookieName of possibleCookies) {
      const authCookie = req.cookies[cookieName];
      if (authCookie) {
        try {
          logger.debug('Auth cookie found:', cookieName);
          // Handle both direct token and JSON format
          if (authCookie.startsWith('[')) {
            // Parse JSON format (['token', 'refresh'])
            const parsed = JSON.parse(authCookie);
            token = parsed[0]?.token || parsed[0]; // Handle both formats
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
          logger.error('Error parsing auth cookie:', error);
        }
      }
    }
  }

  // If still no token, return unauthorized
  if (!token) {
    logger.warn('No valid auth token found in headers or cookies');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'No valid authentication found'
    });
  }

  try {
    // Authenticate user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      logger.error('Invalid token:', userError);
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Your session has expired. Please log in again.'
      });
    }

    const userId = userData.user.id;
    logger.info(`Processing leave trends for user: ${userId}`);

    // Get current year (or from query if specified)
    const yearParam = req.query.year ? parseInt(req.query.year as string) : null;
    const currentYear = yearParam && !isNaN(yearParam) ? yearParam : new Date().getFullYear();
    
    // Fetch leave records for the year - MODIFIED: remove date filters to get all leaves
    const { data: leaveData, error: leaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', userId);
      // Removed date filters to ensure we get ALL leaves

    if (leaveError) {
      logger.error(`Error fetching leave data: ${leaveError.message}`);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch leave data. Please try again later.'
      });
    }
    
    // Log the raw data we found
    logger.info(`Found ${leaveData?.length || 0} total leave records for user ${userId}`);
    if (leaveData && leaveData.length > 0) {
      leaveData.forEach(leave => {
        logger.info(`Leave record: id=${leave.id}, type=${leave.leave_type}, days=${leave.days_taken}, start=${leave.start_date}, end=${leave.end_date}, status=${leave.status}`);
      });
    }

    // Also fetch the current leave balance using our service
    const leaveBalanceResult = await leaveService.calculateLeaveBalance(userId, currentYear);
    
    // Early return with empty data if no leave records
    if (!leaveData || leaveData.length === 0) {
      logger.info(`No leave data found for user ${userId} in ${currentYear}`);
      // Return empty data but include the current balance
      const emptyData = generateEmptyData();
      emptyData.remainingBalance = leaveBalanceResult.remainingBalance;
      return res.status(200).json(emptyData);
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
      // Only process approved leaves
      if (leave.status !== 'approved') {
        logger.info(`Skipping non-approved leave: ${leave.id}, status=${leave.status}`);
        return;
      }
      
      // Extract month from start_date (format: YYYY-MM-DD)
      const startDate = new Date(leave.start_date);
      const monthIndex = startDate.getMonth();
      
      // Normalize leave type (case insensitive) and default to Annual if not specified
      let leaveType = leave.leave_type?.toLowerCase() || 'annual';
      
      // Map the leave type to one of our supported types
      if (leaveType.includes('annual') || leaveType === '' || leaveType === null) {
        leaveType = 'annual';
      } else if (leaveType.includes('casual')) {
        leaveType = 'casual';
      } else if (leaveType.includes('sick')) {
        leaveType = 'sick';
      } else if (leaveType.includes('unpaid')) {
        leaveType = 'unpaid';
      } else {
        // Default unknown types to annual
        logger.warn(`Unmapped leave type "${leaveType}" for leave ID: ${leave.id} - defaulting to annual`);
        leaveType = 'annual';
      }
      
      // Safely handle duration - use days_taken for consistency
      const duration = typeof leave.days_taken === 'number' ? leave.days_taken : 0;
      
      // Add to the appropriate leave type
      if (['annual', 'casual', 'sick', 'unpaid'].includes(leaveType)) {
        monthlyData[monthIndex][leaveType as keyof Omit<MonthlyLeaveData, 'month' | 'total'>] += duration;
        // Log what we're adding
        logger.info(`Adding ${duration} days of ${leaveType} leave for ${months[monthIndex]}`);
      } else {
        logger.warn(`Failed to process leave type: ${leaveType} for leave ID: ${leave.id}`);
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
    
    // Return the processed data
    logger.info(`Successfully processed leave trends for user: ${userId}`);
    
    return res.status(200).json({
      monthlyData,
      leaveTypeData,
      remainingBalance: leaveBalanceResult.remainingBalance
    });
  } catch (error: any) {
    logger.error(`Server error in leave trends: ${error.message || error}`);
    // Return empty data with 200 status for graceful fallback
    return res.status(200).json(generateEmptyData());
  }
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many requests for leave trends. Please try again later.'
}); 