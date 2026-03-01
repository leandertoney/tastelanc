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

  // Resolve admin status from profiles table (database-driven roles)
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, admin_market_id')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'super_admin' || profile?.role === 'co_founder') {
      isAdmin = true;
    } else if (profile?.role === 'market_admin') {
      // Resolve current market to check if this admin belongs here
      const marketSlug = process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa';
      const { data: marketRow } = await supabase
        .from('markets').select('id')
        .eq('slug', marketSlug).eq('is_active', true).single();
      if (marketRow && profile.admin_market_id === marketRow.id) {
        isAdmin = true;
      }
    }
  }
  const userRole = user?.user_metadata?.role;
  const isRestaurantOwner = userRole === 'restaurant_owner';
  const isSelfPromoter = userRole === 'self_promoter';
  const isSalesRep = userRole === 'sales_rep';

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

    // Check for sales mode - allow sales rep or admin to access dashboard when managing a restaurant
    const salesMode = request.nextUrl.searchParams.get('sales_mode') === 'true';
    if ((isSalesRep || isAdmin) && salesMode && restaurantId) {
      return supabaseResponse;
    }

    // Redirect admin to admin dashboard (when not in admin mode)
    if (isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    // Redirect non-restaurant-owners to appropriate page
    if (!isRestaurantOwner) {
      const url = request.nextUrl.clone();
      if (isSalesRep) url.pathname = '/sales';
      else url.pathname = '/account';
      return NextResponse.redirect(url);
    }
  }

  // Self-Promoter Dashboard routes - only for self-promoters (or admin in admin_mode)
  if (request.nextUrl.pathname.startsWith('/promoter')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Check for admin mode - allow admin to access promoter dashboard when editing
    const adminMode = request.nextUrl.searchParams.get('admin_mode') === 'true';
    const promoterId = request.nextUrl.searchParams.get('promoter_id');

    if (isAdmin && adminMode && promoterId) {
      // Admin in admin mode - allow access to promoter dashboard
      return supabaseResponse;
    }

    // Redirect admin to admin dashboard (when not in admin mode)
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
    // Redirect non-self-promoters (consumers) to account page
    if (!isSelfPromoter) {
      const url = request.nextUrl.clone();
      url.pathname = '/account';
      return NextResponse.redirect(url);
    }
  }

  // Sales Rep Dashboard routes - only for sales reps (or admin)
  if (request.nextUrl.pathname.startsWith('/sales')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    // Admin can always access sales dashboard
    if (isAdmin) {
      return supabaseResponse;
    }
    // Redirect non-sales-reps to appropriate dashboard
    if (!isSalesRep) {
      const url = request.nextUrl.clone();
      if (isRestaurantOwner) url.pathname = '/dashboard';
      else if (isSelfPromoter) url.pathname = '/promoter';
      else url.pathname = '/account';
      return NextResponse.redirect(url);
    }
  }

  // Consumer Account routes - only for consumers (non-restaurant-owners, non-self-promoters)
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
    // Redirect self-promoters to their dashboard
    if (isSelfPromoter) {
      const url = request.nextUrl.clone();
      url.pathname = '/promoter';
      return NextResponse.redirect(url);
    }
    // Redirect sales reps to their dashboard
    if (isSalesRep) {
      const url = request.nextUrl.clone();
      url.pathname = '/sales';
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
      } else if (isSelfPromoter) {
        destination = '/promoter';
      } else if (isSalesRep) {
        destination = '/sales';
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
