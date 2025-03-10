import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

// Define the dashboard data type
type DashboardData = {
  employee: any | null;
  latestSalary: any | null;
  leaveBalance: number | null;
  leaveTaken: number;
  inLieuSummary: { count: number; daysAdded: number };
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enhanced token extraction
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
    // Set Supabase JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      logger.error('Invalid token:', userError);
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Your session has expired. Please log in again.'
      });
    }

    const userId = userData.user.id;
    logger.info('Fetching dashboard data for user:', userId);

    // Initial data structure
    const dashboardData: DashboardData = {
      employee: null,
      latestSalary: null,
      leaveBalance: null,
      leaveTaken: 0,
      inLieuSummary: { count: 0, daysAdded: 0 },
    };

    // Fetch employee details
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();

    if (employeeError) {
      logger.error('Error fetching employee data:', employeeError);
    } else {
      dashboardData.employee = employeeData;
    }

    // Fetch latest salary
    const { data: salaryData, error: salaryError } = await supabase
      .from('salaries')
      .select('*')
      .eq('employee_id', userId)
      .order('month', { ascending: false })
      .limit(1)
      .single();

    if (!salaryError && salaryData) {
      dashboardData.latestSalary = salaryData;
    }

    // Get leave allocation for current year, or use default based on years of service
    const currentYear = new Date().getFullYear();
    
    // First check for specific allocation in leave_allocations table
    const { data: leaveAllocation, error: leaveAllocationError } = await supabase
      .from('leave_allocations')
      .select('allocated_days, type')
      .eq('employee_id', userId)
      .eq('year', currentYear)
      .eq('type', 'annual')
      .single();
      
    let baseLeave: number;
    if (!leaveAllocationError && leaveAllocation && leaveAllocation.allocated_days) {
      baseLeave = leaveAllocation.allocated_days;
      logger.info('Using allocated leave days:', baseLeave);
    } else {
      // Fall back to calculation based on years of service
      baseLeave = employeeData?.years_of_service >= 10 ? 24.67 : 18.67;
      logger.info('Using calculated leave days based on years of service:', baseLeave);
    }

    // IMPROVED: Get leave taken with better filtering
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;
    
    const { data: takenLeaveData, error: takenLeaveError } = await supabase
      .from('leave_requests')
      .select('duration, status, leave_type, start_date, end_date')
      .eq('employee_id', userId)
      .eq('leave_type', 'annual')
      .eq('status', 'approved')
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);

    if (takenLeaveError) {
      logger.error('Error fetching taken leave:', takenLeaveError);
    }
    
    // FIXED: Calculate taken leave days with proper validation
    let leaveTaken = 0;
    if (takenLeaveData && Array.isArray(takenLeaveData)) {
      // Map through each leave request and sum up the durations
      leaveTaken = takenLeaveData.reduce((total, leave) => {
        // Make sure we only count valid durations
        const duration = typeof leave.duration === 'number' ? leave.duration : 0;
        return total + duration;
      }, 0);
      
      logger.info(`Calculated leave taken: ${leaveTaken} from ${takenLeaveData.length} records`);
      
      // Update in dashboard data
      dashboardData.leaveTaken = leaveTaken;
    }

    // Get in-lieu records
    const { data: inLieuData, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .select('*')
      .eq('employee_id', userId);

    let inLieuDaysAdded = 0;
    if (!inLieuError && inLieuData) {
      // Safely calculate in-lieu days with validation
      inLieuDaysAdded = inLieuData.reduce((total, record) => {
        const daysAdded = typeof record.days_added === 'number' ? record.days_added : 0;
        return total + daysAdded;
      }, 0);
      
      dashboardData.inLieuSummary = {
        count: inLieuData.length,
        daysAdded: inLieuDaysAdded,
      };
      
      logger.info(`Calculated in-lieu days: ${inLieuDaysAdded} from ${inLieuData.length} records`);
    }

    // Calculate final leave balance with proper checks for null/undefined
    if (baseLeave !== null && baseLeave !== undefined) {
      dashboardData.leaveBalance = parseFloat((baseLeave + inLieuDaysAdded - leaveTaken).toFixed(2));
      logger.info(`Final leave balance calculation: ${baseLeave} (base) + ${inLieuDaysAdded} (in-lieu) - ${leaveTaken} (taken) = ${dashboardData.leaveBalance}`);
    } else {
      logger.warn('Could not calculate leave balance because baseLeave is null or undefined');
    }

    // Set cache control headers with better options
    res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');

    return res.status(200).json(dashboardData);
  } catch (error) {
    logger.error('Server error in dashboard summary:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many dashboard requests. Please try again later.'
}); 