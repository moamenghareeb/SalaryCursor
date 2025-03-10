import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { withRateLimit } from '../../lib/rateLimit';
import { logger } from '../../lib/logger';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for token in Authorization header (Bearer token)
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    logger.info(`Found token in Authorization header`);
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
          logger.info(`Extracted token from JSON cookie`);
        } else {
          token = authCookie;
          logger.info(`Using direct token from cookie`);
        }
      } catch (error) {
        logger.error(`Error parsing auth cookie: ${error}`);
      }
    }
  }

  // If still no token, return unauthorized
  if (!token) {
    logger.warn('No authentication token found in request');
    return res.status(401).json({ error: 'Authentication required. Please log in again.' });
  }

  // Set Supabase JWT
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    logger.error(`Invalid token or user not found: ${userError?.message}`);
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  const userId = userData.user.id;
  logger.info(`Processing profile request for user ID: ${userId}`);

  // GET request - fetch user profile
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error(`Error fetching employee data: ${error.message}`);
        return res.status(500).json({ error: 'Failed to fetch employee data' });
      }

      if (!data) {
        logger.warn(`No employee record found for user ID: ${userId}`);
        // Create default employee record if missing
        const { data: newEmployee, error: createError } = await supabase
          .from('employees')
          .insert([{ 
            id: userId, 
            email: userData.user.email,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
          
        if (createError) {
          logger.error(`Error creating employee record: ${createError.message}`);
          return res.status(500).json({ error: 'Failed to create employee record' });
        }
        
        logger.info(`Created new employee record for user ID: ${userId}`);
        return res.status(200).json({ profile: newEmployee });
      }

      // Set cache control headers
      res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=30, stale-while-revalidate=60');
      
      logger.info(`Successfully fetched profile for user ID: ${userId}`);
      return res.status(200).json({ profile: data });
    } catch (error) {
      logger.error(`Unexpected error in profile GET handler: ${error}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // PUT request - update user profile
  else if (req.method === 'PUT') {
    const updateData = req.body;
    
    // Validate required fields
    if (!updateData.first_name || !updateData.last_name || !updateData.email) {
      logger.warn(`Missing required fields in profile update: ${JSON.stringify(updateData)}`);
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    try {
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
        logger.error(`Error updating profile: ${error.message}`);
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

      logger.info(`Successfully updated profile for user ID: ${userId}`);
      return res.status(200).json({ profile: data });
    } catch (error) {
      logger.error(`Unexpected error in profile PUT handler: ${error}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Method not allowed
  else {
    logger.warn(`Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Apply rate limiting with custom configuration
export default withRateLimit(handler, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Too many profile requests. Please try again later.'
}); 