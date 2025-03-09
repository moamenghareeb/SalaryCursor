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

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error processing salary trends:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many requests for salary trend data. Please try again later.'
}); 