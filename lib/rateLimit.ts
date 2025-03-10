import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from './supabase';

// Define rate limit types
type RateLimitConfig = {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  message?: string;  // Optional custom message
};

// Default rate limit configuration
const defaultRateLimit: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'Too many requests, please try again later.',
};

// Rate limit store using Supabase
export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  config: Partial<RateLimitConfig> = {}
): Promise<boolean> {
  try {
    // Merge default config with provided config
    const rateLimitConfig = { ...defaultRateLimit, ...config };
    
    // Get client IP address
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0') as string;
    
    // Get user ID if authenticated
    let userId = 'anonymous';
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          userId = data.user.id;
        }
      } catch (error) {
        console.error('Error extracting user ID from token:', error);
        // Continue with anonymous user ID
      }
    }
    
    // Create a unique key for this rate limit
    const endpoint = req.url || '/api/unknown';
    const key = `${userId}:${clientIp}:${endpoint}`;
    
    // Get current timestamp
    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;
    
    // Query rate limit records
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('timestamp')
        .eq('key', key)
        .gte('timestamp', windowStart);
      
      if (error) {
        console.error('Rate limit db query error:', error);
        return true; // Allow request on error
      }
      
      // Count requests in the current window
      const requestCount = data?.length || 0;
      
      // Check if rate limit exceeded
      if (requestCount >= rateLimitConfig.maxRequests) {
        // Rate limit exceeded
        res.status(429).json({ 
          error: rateLimitConfig.message || 'Too many requests, please try again later.' 
        });
        return false;
      }
      
      // Record this request (don't wait for it to complete)
      try {
        // Fire and forget - don't await this
        supabase
          .from('rate_limits')
          .insert({
            key,
            timestamp: now,
            endpoint,
            user_id: userId,
            ip: clientIp
          });
      } catch (insertError: any) {
        console.error('Error inserting rate limit record:', insertError);
        // Continue processing the request even if we fail to record it
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (rateLimitConfig.maxRequests - requestCount - 1).toString());
      
      return true;
    } catch (dbError) {
      console.error('Rate limit database error:', dbError);
      return true; // Allow request on error
    }
  } catch (generalError) {
    console.error('General rate limit error:', generalError);
    return true; // Allow request on error
  }
}

// Higher-order function to create a rate-limited API handler
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  config?: Partial<RateLimitConfig>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const shouldContinue = await rateLimit(req, res, config);
      if (shouldContinue) {
        return await handler(req, res);
      }
    } catch (error) {
      console.error('Error in rate limit wrapper:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
} 