import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function authMiddleware(req: NextRequest) {
  // Create a Supabase client with enhanced cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = req.cookies.get(name)
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          // This is server side, we don't set cookies here
        },
        remove(name: string, options: any) {
          // This is server side, we don't remove cookies here
        },
      },
    }
  )
  
  // Check session status
  const { data } = await supabase.auth.getSession()
  
  // Protect specific routes
  const protectedPaths = [
    '/salary',
    '/dashboard',
    '/api/salary'
  ]

  const isProtectedRoute = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedRoute && !data.session) {
    console.log('Auth middleware: Redirecting to login, no session found')
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Role-based access control can be implemented here if needed
  // if (session?.user.role !== 'ADMIN' && req.nextUrl.pathname.includes('/admin')) {
  //   return NextResponse.redirect(new URL('/unauthorized', req.url))
  // }

  return NextResponse.next()
} 