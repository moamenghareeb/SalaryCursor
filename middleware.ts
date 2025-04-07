import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Rate limiting map (IP -> timestamps of requests)
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS = 50; // Maximum requests per minute
const WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds

/**
 * Security middleware for SalaryCursor
 * Implements:
 * 1. Rate limiting
 * 2. Security headers
 * 3. Request monitoring and logging
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const ip = request.ip || 'unknown';
  const requestTime = Date.now();
  
  // Add security headers
  addSecurityHeaders(response);
  
  // Check for rate limiting (only for API routes)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Implement rate limiting
    if (isRateLimited(ip, requestTime)) {
      // Log rate limit event to Sentry
      Sentry.captureMessage('Rate limit exceeded', {
        level: 'warning',
        tags: { ip, endpoint: request.nextUrl.pathname }
      });
      
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Content-Type': 'text/plain',
        }
      });
    }
    
    // Log API request for monitoring
    Sentry.addBreadcrumb({
      category: 'api',
      message: `API request to ${request.nextUrl.pathname}`,
      level: 'info',
      data: {
        method: request.method,
        url: request.url,
      }
    });
  }

  return response;
}

/**
 * Check if a request from an IP is rate limited
 */
function isRateLimited(ip: string, now: number): boolean {
  // Get timestamps of previous requests
  let timestamps = rateLimitMap.get(ip) || [];
  
  // Filter out timestamps outside the current window
  timestamps = timestamps.filter(time => time > now - WINDOW_SIZE);
  
  // Check if rate limit is exceeded
  if (timestamps.length >= MAX_REQUESTS) {
    return true;
  }
  
  // Add current timestamp and update the map
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  
  return false;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Set Content Security Policy with all required domains and features allowed
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Add 'blob:' to script-src for both environments
  const scriptSrc = isDevelopment
    ? "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net blob:"
    : "'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net blob:";

  response.headers.set(
    'Content-Security-Policy',
    // Added script-src-elem explicitly for good measure, although worker-src might cover it
    `default-src 'self'; script-src ${scriptSrc}; script-src-elem ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in https://supabase.com data:; worker-src 'self' blob:`
  );
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Set strict transport security
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Set referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent browser from saving credentials
  response.headers.set('Cache-Control', 'no-store');
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
