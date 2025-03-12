import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';

// In-memory storage for rate limiting
// Note: In a production environment with multiple servers,
// this should be replaced with Redis or another distributed cache
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Separate stores for different endpoint types
const generalRateLimit: RateLimitStore = {};
const authRateLimit: RateLimitStore = {};
const sensitiveRateLimit: RateLimitStore = {};

// Rate limit types
export enum RateLimitType {
  GENERAL = 'general',      // Regular API endpoints
  AUTH = 'auth',            // Authentication endpoints (login, signup)
  SENSITIVE = 'sensitive'   // Endpoints with sensitive operations (password reset, etc.)
}

// Rate limit configurations
const RATE_LIMITS = {
  [RateLimitType.GENERAL]: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60      // 60 requests per minute
  },
  [RateLimitType.AUTH]: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 10           // 10 login attempts per 10 minutes
  },
  [RateLimitType.SENSITIVE]: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5            // 5 requests per hour
  }
};

// Get the appropriate store based on rate limit type
function getStore(type: RateLimitType): RateLimitStore {
  switch(type) {
    case RateLimitType.AUTH:
      return authRateLimit;
    case RateLimitType.SENSITIVE:
      return sensitiveRateLimit;
    case RateLimitType.GENERAL:
    default:
      return generalRateLimit;
  }
}

// Cleanup expired rate limit entries (call this periodically)
export function cleanupRateLimits(): void {
  const now = Date.now();
  
  [generalRateLimit, authRateLimit, sensitiveRateLimit].forEach(store => {
    Object.keys(store).forEach(key => {
      if (store[key].resetTime <= now) {
        delete store[key];
      }
    });
  });
  
  logger.debug('Rate limit stores cleaned up');
}

// Set up automatic cleanup every hour
if (typeof window === 'undefined') { // Only run on server
  setInterval(cleanupRateLimits, 60 * 60 * 1000);
}

// Check if a request should be rate limited
export function isRateLimited(
  req: NextApiRequest,
  type: RateLimitType = RateLimitType.GENERAL
): boolean {
  const store = getStore(type);
  const limits = RATE_LIMITS[type];
  
  // Get a unique identifier for the client
  // Preferably use a combination of IP and user ID if authenticated
  const clientIp = (req.headers['x-forwarded-for'] as string) || 
                   req.socket.remoteAddress || 
                   'unknown-ip';
  
  // For auth endpoints, use the IP address directly
  // For other endpoints, if user is authenticated, use user ID + IP
  const userId = (req as any).user?.id;
  const identifier = type === RateLimitType.AUTH 
    ? `${clientIp}:${type}` 
    : userId 
      ? `${clientIp}:${userId}:${type}` 
      : `${clientIp}:${type}`;
  
  const now = Date.now();
  
  // Initialize or reset expired entry
  if (!store[identifier] || store[identifier].resetTime <= now) {
    store[identifier] = {
      count: 1,
      resetTime: now + limits.windowMs
    };
    return false;
  }
  
  // Increment count and check against limit
  store[identifier].count++;
  
  // Log excessive attempts
  if (store[identifier].count > limits.maxRequests) {
    logger.warn(`Rate limit exceeded for ${identifier}. Count: ${store[identifier].count}`);
    return true;
  }
  
  return false;
}

// Middleware function for rate limiting
export function rateLimiter(
  type: RateLimitType = RateLimitType.GENERAL
) {
  return function(req: NextApiRequest, res: NextApiResponse, next: () => void) {
    if (isRateLimited(req, type)) {
      logger.warn(`Rate limit applied: ${req.url}`);
      
      // Calculate time until reset
      const store = getStore(type);
      const clientIp = (req.headers['x-forwarded-for'] as string) || 
                      req.socket.remoteAddress || 
                      'unknown-ip';
      const userId = (req as any).user?.id;
      const identifier = type === RateLimitType.AUTH 
        ? `${clientIp}:${type}` 
        : userId 
          ? `${clientIp}:${userId}:${type}` 
          : `${clientIp}:${type}`;
      
      const resetTime = store[identifier]?.resetTime || Date.now() + RATE_LIMITS[type].windowMs;
      const secondsToReset = Math.ceil((resetTime - Date.now()) / 1000);
      
      // Set appropriate headers
      res.setHeader('Retry-After', secondsToReset.toString());
      res.setHeader('X-RateLimit-Limit', RATE_LIMITS[type].maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
      
      // Return rate limit exceeded error
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${secondsToReset} seconds.`
      });
    }
    
    next();
  };
}

// Apply rate limiting directly in an API route
export function applyRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  type: RateLimitType = RateLimitType.GENERAL
): boolean {
  if (isRateLimited(req, type)) {
    const store = getStore(type);
    const clientIp = (req.headers['x-forwarded-for'] as string) || 
                    req.socket.remoteAddress || 
                    'unknown-ip';
    const userId = (req as any).user?.id;
    const identifier = type === RateLimitType.AUTH 
      ? `${clientIp}:${type}` 
      : userId 
        ? `${clientIp}:${userId}:${type}` 
        : `${clientIp}:${type}`;
    
    const resetTime = store[identifier]?.resetTime || Date.now() + RATE_LIMITS[type].windowMs;
    const secondsToReset = Math.ceil((resetTime - Date.now()) / 1000);
    
    res.setHeader('Retry-After', secondsToReset.toString());
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${secondsToReset} seconds.`
    });
    
    return true;
  }
  
  return false;
} 