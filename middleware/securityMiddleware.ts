import helmet from 'helmet'
import { NextApiRequest, NextApiResponse } from 'next'

export function applySecurityMiddleware(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Security Headers
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'"
  )
} 