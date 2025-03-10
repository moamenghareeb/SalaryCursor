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

  // Enhanced token extraction with better logging
  let token = null;

  try {
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
            // Continue to next cookie rather than failing completely
          }
        }
      }
    }

    // If still no token, return unauthorized with clear message
    if (!token) {
      console.warn('No valid auth token found in headers or cookies');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required. Please log in again.'
      });
    }

    // Set Supabase JWT with better error handling
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.error('Invalid token or user not found:', userError);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Your session has expired. Please log in again.'
      });
    }

    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    // Get employee information (needed for department-based filtering)
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('department')
      .eq('id', userId)
      .single();

    // Handle employee error with more specific message
    if (employeeError) {
      console.error('Error fetching employee data:', employeeError);
      return res.status(500).json({ 
        error: 'Database Error', 
        message: 'Failed to fetch employee data. Please try again later.'
      });
    }

    // Check if employee data is valid
    if (!employeeData || !employeeData.department) {
      console.warn('Employee or department not found:', userId);
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Employee information not found. Please contact HR.'
      });
    }

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
      return res.status(500).json({ 
        error: 'Database Error',
        message: 'Failed to fetch leave data from database'
      });
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

    // Safely process leave data to populate monthly and summary data
    if (Array.isArray(leaveData)) {
      leaveData.forEach(leave => {
        if (!leave.start_date) return; // Skip entries with missing start date
        
        try {
          const startMonth = new Date(leave.start_date).getMonth();
          const leaveType = (leave.leave_type || '').toLowerCase();
          const duration = leave.duration || 0;
          
          switch (leaveType) {
            case 'annual':
              monthlyData[startMonth].annual_leave += duration;
              summaryData.annual += duration;
              break;
            case 'sick':
              monthlyData[startMonth].sick_leave += duration;
              summaryData.sick += duration;
              break;
            case 'unpaid':
              monthlyData[startMonth].unpaid_leave += duration;
              summaryData.unpaid += duration;
              break;
            case 'in lieu': // Cover both formats (with and without space)
            case 'in-lieu':
              monthlyData[startMonth].in_lieu += duration;
              summaryData.inLieu += duration;
              break;
          }
        } catch (error) {
          console.error('Error processing leave entry:', leave, error);
          // Continue processing other leave entries
        }
      });
    }

    // Set cache control headers with longer validity
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');

    return res.status(200).json({
      monthly: monthlyData,
      summary: summaryData
    });
  } catch (error) {
    console.error('Unhandled error in leave trends API:', error);
    return res.status(500).json({ 
      error: 'Server Error', 
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}

// Apply rate limiting with a try-catch wrapper and better error handling
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
    return res.status(500).json({ 
      error: 'Server Error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
} 