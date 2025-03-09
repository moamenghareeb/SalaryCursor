import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';

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

  // Handle GET request - fetch notifications
  if (req.method === 'GET') {
    try {
      // Query to get user notifications
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to 50 most recent notifications

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      return res.status(200).json(notifications || []);
    } catch (error) {
      console.error('Error processing notifications:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Handle POST request - create notification
  else if (req.method === 'POST') {
    // Check if user is an admin
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('role')
      .eq('id', userId)
      .single();

    if (employeeError) {
      console.error('Error fetching employee role:', employeeError);
      return res.status(500).json({ error: 'Failed to verify permissions' });
    }

    // Only admins can create notifications for other users
    if (employeeData.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized - admin permission required' });
    }

    try {
      const { title, message, type, targetUserId, category } = req.body;

      // Validate required fields
      if (!title || !message || !type || !targetUserId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create notification
      const { data: newNotification, error: createError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          title,
          message,
          type,
          category: category || 'system',
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating notification:', createError);
        return res.status(500).json({ error: 'Failed to create notification' });
      }

      return res.status(201).json(newNotification);
    } catch (error) {
      console.error('Error creating notification:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Method not allowed
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Apply rate limiting
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many requests for notifications. Please try again later.'
}); 