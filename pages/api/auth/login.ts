import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { applyRateLimit, RateLimitType } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting specific to authentication
  if (applyRateLimit(req, res, RateLimitType.AUTH)) {
    logger.warn('Login attempt rate limited', { 
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    });
    return; // Response already sent by applyRateLimit
  }

  try {
    const { employeeId, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Determine login credential (email or employeeId)
    let loginEmail: string;
    
    if (email) {
      loginEmail = email;
    } else if (employeeId) {
      // Check if input includes @ symbol (is email) or is employeeId
      loginEmail = employeeId.includes('@') 
        ? employeeId 
        : `${employeeId}@company.local`;
    } else {
      return res.status(400).json({ error: 'Email or Employee ID is required' });
    }

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      logger.warn('Failed login attempt', { 
        email: loginEmail,
        error: error.message,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      });
      
      return res.status(401).json({ error: error.message });
    }

    // Log successful login
    logger.info('Successful login', { 
      userId: data.user?.id,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    return res.status(200).json({
      user: data.user,
      session: data.session
    });
  } catch (error: any) {
    logger.error('Login error', { error });
    return res.status(500).json({ error: 'Authentication failed' });
  }
} 