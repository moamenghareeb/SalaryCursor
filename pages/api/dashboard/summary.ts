import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';
import { leaveService } from '../../../lib/leaveService';

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

// Define the dashboard data type
type DashboardData = {
  employee: any | null;
  latestSalary: any | null;
  leaveBalance: number | null;
  leaveTaken: number;
  inLieuSummary: { count: number; daysAdded: number };
  timestamp: string;
  debug?: any; // For debugging information
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
    logger.info(`Fetching dashboard data for user: ${userId}`);

    // Initial data structure
    const dashboardData: DashboardData = {
      employee: null,
      latestSalary: null,
      leaveBalance: null,
      leaveTaken: 0,
      inLieuSummary: { count: 0, daysAdded: 0 },
      timestamp: new Date().toISOString(),
      debug: {},
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
      dashboardData.debug.employee = employeeData;
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

    // Use centralized leave service to calculate leave balance
    const currentYear = new Date().getFullYear();
    try {
      logger.info(`Calling leave service for user ${userId}`);
      const leaveBalanceResult = await leaveService.calculateLeaveBalance(userId, currentYear);
      
      // Store full debug info
      dashboardData.debug.leaveService = leaveBalanceResult;
      
      // Update dashboard data with calculated values
      if (!leaveBalanceResult.error) {
        dashboardData.leaveBalance = leaveBalanceResult.remainingBalance;
        dashboardData.leaveTaken = leaveBalanceResult.leaveTaken;
        dashboardData.inLieuSummary = {
          // Get in-lieu records count
          count: await getInLieuRecordsCount(userId),
          daysAdded: leaveBalanceResult.inLieuBalance,
        };
        
        logger.info(`Leave service results: Balance=${leaveBalanceResult.remainingBalance}, Taken=${leaveBalanceResult.leaveTaken}, InLieu=${leaveBalanceResult.inLieuBalance}`);
      } else {
        logger.error(`Error from leave service: ${leaveBalanceResult.error}`);
        // Still provide partial data if available
        if (leaveBalanceResult.remainingBalance !== undefined) {
          dashboardData.leaveBalance = leaveBalanceResult.remainingBalance;
        }
        if (leaveBalanceResult.leaveTaken !== undefined) {
          dashboardData.leaveTaken = leaveBalanceResult.leaveTaken;
        }
        if (leaveBalanceResult.inLieuBalance !== undefined) {
          dashboardData.inLieuSummary.daysAdded = leaveBalanceResult.inLieuBalance;
        }
      }
    } catch (leaveServiceError: any) {
      logger.error(`Exception from leave service: ${leaveServiceError.message || leaveServiceError}`);
      dashboardData.debug.leaveServiceError = leaveServiceError.message || leaveServiceError;
    }

    // Set cache control headers for frequent refreshes
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Always include a timestamp to prevent browser caching
    dashboardData.timestamp = new Date().toISOString();

    // In development, include debug info, otherwise remove it
    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json(dashboardData);
    } else {
      // Remove debug info in production
      const { debug, ...cleanData } = dashboardData;
      return res.status(200).json(cleanData);
    }
  } catch (error: any) {
    logger.error('Server error in dashboard summary:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to get in-lieu records count
async function getInLieuRecordsCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('in_lieu_records')
    .select('id')
    .eq('employee_id', userId);
    
  if (error || !data) {
    logger.error('Error counting in-lieu records:', error);
    return 0;
  }
  
  return data.length;
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many dashboard requests. Please try again later.'
}); 