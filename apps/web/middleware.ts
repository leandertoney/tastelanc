import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add code between createServerClient and supabase.auth.getUser()
  // This prevents session timing issues
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user?.email === 'admin@tastelanc.com';
  const userRole = user?.user_metadata?.role;
  const isRestaurantOwner = userRole === 'restaurant_owner';

  // Admin routes - redirect to login if not admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      // Non-admin users trying to access admin - redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Restaurant Dashboard routes - only for restaurant owners (or admin in admin_mode)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Check for admin mode - allow admin to access dashboard when editing a restaurant
    const adminMode = request.nextUrl.searchParams.get('admin_mode') === 'true';
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (isAdmin && adminMode && restaurantId) {
      // Admin in admin mode - allow access to dashboard
      return supabaseResponse;
    }

    // Redirect admin to admin dashboard (when not in admin mode)
    if (isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    // Redirect non-restaurant-owners (consumers) to account page
    if (!isRestaurantOwner) {
      const url = request.nextUrl.clone();
      url.pathname = '/account';
      return NextResponse.redirect(url);
    }
  }

  // Consumer Account routes - only for consumers (non-restaurant-owners)
  if (request.nextUrl.pathname.startsWith('/account')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    // Redirect admin to admin dashboard
    if (isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    // Redirect restaurant owners to their dashboard
    if (isRestaurantOwner) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Auth routes - redirect to appropriate dashboard if already authenticated
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
    if (user) {
      const url = request.nextUrl.clone();
      const redirect = url.searchParams.get('redirect');

      // Determine appropriate destination based on role
      let destination = '/account'; // Default for consumers
      if (isAdmin) {
        destination = '/admin';
      } else if (isRestaurantOwner) {
        destination = '/dashboard';
      }

      if (redirect) {
        url.pathname = redirect;
      } else {
        url.pathname = destination;
      }
      url.searchParams.delete('redirect');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
