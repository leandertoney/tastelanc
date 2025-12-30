import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
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
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminRestaurantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== 'admin@tastelanc.com') {
    redirect('/login');
  }

  // Fetch restaurant with related data
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      tiers (
        name,
        display_name
      )
    `)
    .eq('id', id)
    .single();

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

  // Fetch counts
  const [hoursResult, eventsResult, specialsResult, happyHoursResult] = await Promise.all([
    supabase.from('restaurant_hours').select('id', { count: 'exact' }).eq('restaurant_id', id),
    supabase.from('events').select('id', { count: 'exact' }).eq('restaurant_id', id).eq('is_active', true),
    supabase.from('specials').select('id', { count: 'exact' }).eq('restaurant_id', id).eq('is_active', true),
    supabase.from('happy_hours').select('id', { count: 'exact' }).eq('restaurant_id', id).eq('is_active', true),
  ]);

  const tier = restaurant.tiers;

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
            href={`/dashboard?admin_mode=true&restaurant_id=${restaurant.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent text-white rounded-lg hover:bg-tastelanc-accent/90 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Restaurant
          </Link>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Status</p>
          <div className="flex items-center gap-2">
            {restaurant.is_active ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Active</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-white font-medium">Inactive</span>
              </>
            )}
          </div>
        </div>
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Verified</p>
          <div className="flex items-center gap-2">
            {restaurant.is_verified ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Yes</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-400" />
                <span className="text-white font-medium">No</span>
              </>
            )}
          </div>
        </div>
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Subscription</p>
          <p className="text-white font-medium capitalize">
            {tier?.display_name || tier?.name || 'Basic'}
          </p>
          {restaurant.stripe_subscription_id ? (
            <p className="text-xs text-green-500 mt-1">
              Stripe Linked ✓
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              No Stripe subscription
            </p>
          )}
        </div>
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Owner</p>
          <p className="text-white font-medium truncate">
            {ownerEmail || 'No owner assigned'}
          </p>
        </div>
      </div>

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
        {restaurant.description && (
          <div className="md:col-span-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
            <p className="text-gray-300">{restaurant.description}</p>
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
        <div className="grid md:grid-cols-3 gap-4 text-sm">
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
