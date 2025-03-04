import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Log cookies and headers for debugging
  console.log('Request cookies:', req.cookies);
  console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
  
  // Check for token in Authorization header (Bearer token)
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Using token from Authorization header');
  }
  
  // If no token in header, try cookies
  if (!token) {
    // Get auth token from request cookies
    const authCookie = req.cookies['sb-access-token'] || req.cookies['supabase-auth-token'];
    
    if (authCookie) {
      try {
        console.log('Auth cookie found:', typeof authCookie);
        // Handle both direct token and JSON format
        if (authCookie.startsWith('[')) {
          // Parse JSON format (['token', 'refresh'])
          const parsed = JSON.parse(authCookie);
          token = parsed[0];
          console.log('Parsed token from JSON');
        } else {
          token = authCookie;
          console.log('Using direct token');
        }
      } catch (e) {
        console.error('Error parsing auth cookie:', e);
      }
    } else {
      console.log('No auth cookie found');
    }
  }
  
  // Check auth from token OR from session
  let userSession = null;
  
  // If we have a token, set it for this request
  if (token) {
    console.log('Attempting auth with token');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.log('Token auth error:', error.message);
    }
    if (user) {
      console.log('User authenticated via token');
      userSession = user;
    }
  } else {
    console.log('No token available');
  }
  
  // If no token or token invalid, try session-based auth as fallback
  if (!userSession) {
    console.log('Trying session-based auth');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.log('Session auth error:', error.message);
    }
    if (session?.user) {
      console.log('User authenticated via session');
      userSession = session.user;
    } else {
      console.log('No session user found');
    }
  }
  
  if (!userSession) {
    console.log('Authentication failed');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'No valid authentication found',
      cookies: Object.keys(req.cookies),
      hadAuthHeader: !!authHeader
    });
  }
  
  // Success! Return user info
  return res.status(200).json({
    message: 'Authentication successful',
    user: {
      id: userSession.id,
      email: userSession.email,
    },
    authMethod: token ? (authHeader ? 'auth_header' : 'cookie') : 'session'
  });
} 