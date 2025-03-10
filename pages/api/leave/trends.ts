import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';

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
    console.log('Using token from Authorization header');
  }
  
  // If no token in header, try cookies
  if (!token) {
    // Get auth token from request cookies
    const possibleCookies = ['sb-access-token', 'supabase-auth-token'];
    
    for (const cookieName of possibleCookies) {
      const authCookie = req.cookies[cookieName];
      if (authCookie) {
        try {
          console.log('Auth cookie found:', cookieName);
          // Handle both direct token and JSON format
          if (authCookie.startsWith('[')) {
            // Parse JSON format (['token', 'refresh'])
            const parsed = JSON.parse(authCookie);
            token = parsed[0]?.token || parsed[0]; // Handle both formats
            console.log('Parsed token from JSON array');
            break;
          } else if (authCookie.startsWith('{')) {
            // Parse JSON object format
            const parsed = JSON.parse(authCookie);
            token = parsed.token || parsed.access_token;
            console.log('Parsed token from JSON object');
            break;
          } else {
            token = authCookie;
            console.log('Using direct token from cookie');
            break;
          }
        } catch (error) {
          console.error('Error parsing auth cookie:', error);
        }
      }
    }
  }

  // If still no token, return unauthorized
  if (!token) {
    console.log('No valid auth token found in headers or cookies');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'No valid authentication found'
    });
  }

  try {
    // Set Supabase JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.error('Invalid token:', userError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    // Query to get leave data for the current year by month
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        start_date,
        end_date,
        leave_type,
        duration,
        status
      `)
      .eq('employee_id', userId)
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('end_date', endDate);

    if (leaveError) {
      console.error('Error fetching leave data:', leaveError);
      return res.status(500).json({ error: 'Failed to fetch leave data' });
    }

    // Process monthly data
    const monthlyData = Array.from({ length: 12 }, (_, index) => {
      const monthName = new Date(currentYear, index, 1).toLocaleString('default', { month: 'short' });
      return {
        month: monthName,
        annual_leave: 0,
        sick_leave: 0,
        unpaid_leave: 0,
        in_lieu: 0,
      };
    });

    // Process summary data by leave type
    const summaryData = {
      annual: 0,
      sick: 0,
      unpaid: 0,
      inLieu: 0,
    };

    // Process leave data to populate monthly and summary data
    leaveData.forEach(leave => {
      const startMonth = new Date(leave.start_date).getMonth();
      
      switch (leave.leave_type.toLowerCase()) {
        case 'annual':
          monthlyData[startMonth].annual_leave += leave.duration;
          summaryData.annual += leave.duration;
          break;
        case 'sick':
          monthlyData[startMonth].sick_leave += leave.duration;
          summaryData.sick += leave.duration;
          break;
        case 'unpaid':
          monthlyData[startMonth].unpaid_leave += leave.duration;
          summaryData.unpaid += leave.duration;
          break;
        case 'in lieu':
          monthlyData[startMonth].in_lieu += leave.duration;
          summaryData.inLieu += leave.duration;
          break;
      }
    });

    // Set cache control headers
    res.setHeader('Cache-Control', 'private, max-age=60');

    return res.status(200).json({
      monthly: monthlyData,
      summary: summaryData
    });
  } catch (error) {
    console.error('Error processing leave trends:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply rate limiting with a try-catch wrapper
export default async function safeHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    return await withRateLimit(handler, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 requests per minute
      message: 'Too many requests for leave trend data. Please try again later.'
    })(req, res);
  } catch (error) {
    console.error('Unhandled error in leave trends API:', error);
    return res.status(500).json({ error: 'Server error' });
  }
} 