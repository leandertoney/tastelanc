import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import AdminRestaurantActions from '@/components/admin/AdminRestaurantActions';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Globe,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  ShoppingCart,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminRestaurantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify user is admin
  let admin;
  try { admin = await verifyAdminAccess(supabase); }
  catch { redirect('/login'); }

  // Fetch restaurant with related data — scoped by admin role
  let query = supabase
    .from('restaurants')
    .select(`
      *,
      tiers (
        name,
        display_name
      )
    `)
    .eq('id', id);

  // market_admin: filter to their scoped market
  // super_admin: scopedMarketId is null, no filter (can see all markets)
  if (admin.scopedMarketId) {
    query = query.eq('market_id', admin.scopedMarketId);
  }

  const { data: restaurant, error } = await query.single();

  if (error || !restaurant) {
    notFound();
  }

  // Fetch owner info if exists
  let ownerEmail = null;
  if (restaurant.owner_id) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', restaurant.owner_id)
      .single();
    ownerEmail = owner?.email;
  }

  // Fetch tiers for the tier selector
  const { data: tiers } = await supabase
    .from('tiers')
    .select('id, name, display_name')
    .order('price_monthly', { ascending: true });

  // Fetch counts
  const [hoursResult, eventsResult, specialsResult, happyHoursResult] = await Promise.all([
    supabase.from('restaurant_hours').select('id', { count: 'exact' }).eq('restaurant_id', id),
    supabase.from('events').select('id', { count: 'exact' }).eq('restaurant_id', id).eq('is_active', true),
    supabase.from('specials').select('id', { count: 'exact' }).eq('restaurant_id', id).eq('is_active', true),
    supabase.from('happy_hours').select('id', { count: 'exact' }).eq('restaurant_id', id).eq('is_active', true),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/restaurants"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-tastelanc-surface-light transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
            <p className="text-gray-400">{restaurant.city}, {restaurant.state}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/restaurants/${restaurant.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white border border-tastelanc-surface-light rounded-lg hover:bg-tastelanc-surface-light transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Public Page
          </Link>
          <Link
            href={`/admin/sales?restaurantId=${restaurant.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Create Sale
          </Link>
          <Link
            href={`/dashboard?admin_mode=true&restaurant_id=${restaurant.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent text-white rounded-lg hover:bg-tastelanc-accent/90 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Restaurant
          </Link>
        </div>
      </div>

      {/* Interactive Admin Controls */}
      <AdminRestaurantActions
        restaurantId={restaurant.id}
        initialIsActive={restaurant.is_active}
        initialIsVerified={restaurant.is_verified}
        initialTierId={restaurant.tier_id}
        initialAdminNotes={restaurant.admin_notes || null}
        tiers={(tiers || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          display_name: t.display_name,
        }))}
      />

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-tastelanc-accent" />
            Contact Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-white">{restaurant.address}</p>
                <p className="text-gray-400">{restaurant.city}, {restaurant.state} {restaurant.zip_code}</p>
              </div>
            </div>
            {restaurant.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <p className="text-white">{restaurant.phone}</p>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tastelanc-accent hover:underline"
                >
                  {restaurant.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Content Stats */}
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-tastelanc-accent" />
            Content Overview
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-tastelanc-bg rounded-lg">
              <p className="text-2xl font-bold text-white">{hoursResult.count || 0}</p>
              <p className="text-sm text-gray-400">Hours Set</p>
            </div>
            <div className="p-3 bg-tastelanc-bg rounded-lg">
              <p className="text-2xl font-bold text-white">{eventsResult.count || 0}</p>
              <p className="text-sm text-gray-400">Active Events</p>
            </div>
            <div className="p-3 bg-tastelanc-bg rounded-lg">
              <p className="text-2xl font-bold text-white">{specialsResult.count || 0}</p>
              <p className="text-sm text-gray-400">Active Specials</p>
            </div>
            <div className="p-3 bg-tastelanc-bg rounded-lg">
              <p className="text-2xl font-bold text-white">{happyHoursResult.count || 0}</p>
              <p className="text-sm text-gray-400">Happy Hours</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {(restaurant.custom_description || restaurant.description) && (
          <div className="md:col-span-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
            <p className="text-gray-300">{restaurant.custom_description || restaurant.description}</p>
          </div>
        )}

        {/* Categories */}
        {restaurant.categories && restaurant.categories.length > 0 && (
          <div className="md:col-span-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {restaurant.categories.map((cat: string) => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-tastelanc-accent/20 text-tastelanc-accent rounded-full text-sm capitalize"
                >
                  {cat.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-tastelanc-accent" />
          Metadata
        </h2>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Owner</p>
            <p className="text-white truncate">{ownerEmail || 'No owner assigned'}</p>
          </div>
          <div>
            <p className="text-gray-400">Created</p>
            <p className="text-white">{new Date(restaurant.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Last Updated</p>
            <p className="text-white">{new Date(restaurant.updated_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Restaurant ID</p>
            <p className="text-white font-mono text-xs">{restaurant.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
