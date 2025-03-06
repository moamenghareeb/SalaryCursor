import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authMiddleware } from './middleware/authMiddleware'

export async function middleware(request: NextRequest) {
  // Apply auth middleware
  const response = await authMiddleware(request)
  if (response) return response

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/salary/:path*',
    '/dashboard/:path*',
    '/api/salary/:path*',
  ],
} 