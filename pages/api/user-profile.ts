import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { withRateLimit } from '../../lib/rateLimit';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  // GET request - fetch user profile
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ profile: data });
  }
  
  // PUT request - update user profile
  else if (req.method === 'PUT') {
    const updateData = req.body;
    
    // Validate required fields
    if (!updateData.first_name || !updateData.last_name || !updateData.email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Remove restricted fields (if any)
    const { role, ...allowedData } = updateData;
    
    // Update profile
    const { data, error } = await supabase
      .from('employees')
      .update(allowedData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log update for audit
    await supabase
      .from('audit_logs')
      .insert({ 
        user_id: userId,
        action: 'profile_update',
        details: JSON.stringify(allowedData)
      });

    return res.status(200).json({ profile: data });
  }
  
  // Method not allowed
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Apply rate limiting with custom configuration
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Too many profile requests. Please try again later.'
}); 