import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function authMiddleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  // Protect specific routes
  const protectedPaths = [
    '/salary',
    '/dashboard',
    '/api/salary'
  ]

  const isProtectedRoute = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Role-based access control
    if (token.role !== 'ADMIN' && req.nextUrl.pathname.includes('/admin')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return NextResponse.next()
} 