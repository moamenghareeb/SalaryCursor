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

    // Query to get salary data for the last 12 months
    const { data: salaryData, error: salaryError } = await supabase
      .from('salaries')
      .select(`
        month,
        basic_salary,
        cost_of_living,
        shift_allowance,
        overtime_pay,
        variable_pay,
        deduction,
        total_salary
      `)
      .eq('employee_id', userId)
      .order('month', { ascending: true })
      .limit(12);

    if (salaryError) {
      console.error('Error fetching salary data:', salaryError);
      return res.status(500).json({ error: 'Failed to fetch salary data' });
    }

    // Process data if needed
    const formattedData = salaryData.map(item => ({
      month: item.month, // Format the month as needed
      total_salary: item.total_salary,
      basic_salary: item.basic_salary,
      overtime_pay: item.overtime_pay || 0,
      // You can include other fields as needed
    }));

    // Set cache control headers
    res.setHeader('Cache-Control', 'private, max-age=60');

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error processing salary trends:', error);
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
      message: 'Too many requests for salary trend data. Please try again later.'
    })(req, res);
  } catch (error) {
    console.error('Unhandled error in salary trends API:', error);
    return res.status(500).json({ error: 'Server error' });
  }
} 