import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withRateLimit } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are allowed for this endpoint'
    });
  }

  // Enhanced token extraction with better logging
  let token = null;

  try {
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
            // Continue to next cookie if parsing fails
          }
        }
      }
    }

    // If still no token, return empty result instead of error
    if (!token) {
      logger.warn('No valid auth token found in request');
      return res.status(200).json({ 
        notifications: [],
        unreadCount: 0
      });
    }

    // Get user from token
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      logger.error('Invalid token:', userError);
      // Return empty data instead of error for better client experience
      return res.status(200).json({ 
        notifications: [],
        unreadCount: 0
      });
    }

    const userId = userData.user.id;
    logger.info(`Fetching notifications for user: ${userId}`);

    // Get notifications from database with safe error handling
    try {
      const { data: notifications, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notificationError) {
        logger.error('Error fetching notifications:', notificationError);
        // Return empty array instead of error
        return res.status(200).json({ 
          notifications: [],
          unreadCount: 0
        });
      }

      // Get unread count
      const unreadCount = (notifications || []).filter(n => !n.read).length;

      // Set cache control for better performance
      res.setHeader('Cache-Control', 'private, max-age=10');
      
      return res.status(200).json({
        notifications: notifications || [],
        unreadCount
      });
    } catch (dbError) {
      logger.error('Database error in notifications:', dbError);
      // Return empty data on error
      return res.status(200).json({ 
        notifications: [],
        unreadCount: 0
      });
    }
  } catch (error) {
    logger.error('Unexpected error in notifications API:', error);
    // Return empty data even on unexpected errors
    return res.status(200).json({ 
      notifications: [],
      unreadCount: 0
    });
  }
}

// Apply rate limiting to the handler
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Too many notification requests, please try again later.'
}); 