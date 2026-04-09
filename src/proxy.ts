import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const authRoutes = ['/login', '/signup']
  const publicRoutes = ['/', '/about', '/auth/callback']
  const isAuthRoute = authRoutes.includes(pathname)
  const isPublicRoute = publicRoutes.includes(pathname)

  // Unauthenticated users can only access public + auth pages
  if (!user && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged-in users don't need the auth forms; send them to their feed
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // Admin authorization is enforced in src/app/(main)/admin/layout.tsx
  // (renders an "Access Required" UI for non-admins rather than a silent redirect)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
