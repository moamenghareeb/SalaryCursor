import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function authMiddleware(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protect specific routes
  const protectedPaths = [
    '/salary',
    '/dashboard',
    '/api/salary'
  ]

  const isProtectedRoute = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Role-based access control can be implemented here if needed
  // if (session?.user.role !== 'ADMIN' && req.nextUrl.pathname.includes('/admin')) {
  //   return NextResponse.redirect(new URL('/unauthorized', req.url))
  // }

  return NextResponse.next()
} 