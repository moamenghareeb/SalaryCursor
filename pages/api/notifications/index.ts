import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
            // Continue to next cookie rather than failing
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

    // Handle GET request - fetch notifications with improved error handling
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
          console.error('Database error fetching notifications:', notificationsError);
          return res.status(500).json({ 
            error: 'Database Error', 
            message: 'Failed to fetch notifications from database'
          });
        }

        // Set cache control headers with longer validity
        res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
        
        return res.status(200).json(notifications || []);
      } catch (error) {
        console.error('Unexpected error processing notifications:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: 'An unexpected error occurred while fetching notifications'
        });
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
  } catch (error) {
    console.error('Unhandled server error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}

// Apply rate limiting with better error handling
export default async function safeHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    return await withRateLimit(handler, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 requests per minute
      message: 'Too many requests for notifications. Please try again later.'
    })(req, res);
  } catch (error) {
    console.error('Unhandled error in notifications API:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
} 