import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';

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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Set Supabase JWT
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = userData.user.id;

  try {
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
      console.error('Error fetching employee data:', employeeError);
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

    // Calculate leave balance
    const baseLeave = employeeData?.years_of_service >= 10 ? 24.67 : 18.67;

    // Get leave taken this year
    const currentYear = new Date().getFullYear();
    const { data: leaveTakenData, error: leaveTakenError } = await supabase
      .from('leave_requests')
      .select('duration')
      .eq('employee_id', userId)
      .eq('status', 'approved')
      .gte('start_date', `${currentYear}-01-01`)
      .lte('end_date', `${currentYear}-12-31`);

    let leaveTaken = 0;
    if (!leaveTakenError && leaveTakenData) {
      leaveTaken = leaveTakenData.reduce((total, leave) => total + leave.duration, 0);
      dashboardData.leaveTaken = leaveTaken;
    }

    // Get in-lieu records
    const { data: inLieuData, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .select('*')
      .eq('employee_id', userId);

    let inLieuDaysAdded = 0;
    if (!inLieuError && inLieuData) {
      inLieuDaysAdded = inLieuData.reduce((total, record) => total + record.days_added, 0);
      dashboardData.inLieuSummary = {
        count: inLieuData.length,
        daysAdded: inLieuDaysAdded,
      };
    }

    // Calculate final leave balance
    if (baseLeave !== null && baseLeave !== undefined) {
      dashboardData.leaveBalance = baseLeave + inLieuDaysAdded - leaveTaken;
    }

    // Set cache control headers for client and CDN
    res.setHeader(
      'Cache-Control',
      `s-maxage=${CACHE_TTL}, stale-while-revalidate`
    );

    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many dashboard requests. Please try again later.'
}); 