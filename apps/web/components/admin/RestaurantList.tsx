'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import {
  Store,
  MapPin,
  Phone,
  Globe,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  is_verified: boolean;
  stripe_subscription_id?: string;
  created_at: string;
  categories?: string[];
  tiers?: {
    name: string;
    display_name?: string;
  };
}

interface RestaurantListProps {
  restaurants: Restaurant[];
}

const ITEMS_PER_PAGE = 20;

export default function RestaurantList({ restaurants }: RestaurantListProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter restaurants based on search
  const filteredRestaurants = useMemo(() => {
    if (!search.trim()) return restaurants;
    const searchLower = search.toLowerCase();
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(searchLower) ||
        r.city.toLowerCase().includes(searchLower) ||
        r.state.toLowerCase().includes(searchLower)
    );
  }, [restaurants, search]);

  // Paginate
  const totalPages = Math.ceil(filteredRestaurants.length / ITEMS_PER_PAGE);
  const paginatedRestaurants = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRestaurants.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRestaurants, currentPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or city..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
          />
        </div>
        {search && (
          <p className="text-sm text-gray-400 mt-2">
            Found {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Restaurant List */}
      {paginatedRestaurants.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {search ? 'No restaurants found' : 'No restaurants yet'}
          </h3>
          <p className="text-gray-400">
            {search
              ? 'Try adjusting your search terms.'
              : 'Restaurants will appear here as they sign up.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paginatedRestaurants.map((restaurant) => (
            <Card
              key={restaurant.id}
              className="p-6 hover:border-tastelanc-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {restaurant.logo_url ? (
                    <img
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                      className="w-16 h-16 rounded-lg object-cover bg-tastelanc-surface-light"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-tastelanc-surface-light rounded-lg flex items-center justify-center">
                      <Store className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/admin/restaurants/${restaurant.id}`}
                        className="text-lg font-semibold text-white hover:text-tastelanc-accent"
                      >
                        {restaurant.name}
                      </Link>
                      {restaurant.is_verified && (
                        <CheckCircle className="w-4 h-4 text-lancaster-gold" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {restaurant.city}, {restaurant.state}
                      </span>
                      {restaurant.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {restaurant.phone}
                        </span>
                      )}
                      {restaurant.website && (
                        <a
                          href={restaurant.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-white"
                        >
                          <Globe className="w-3 h-3" />
                          Website
                        </a>
                      )}
                    </div>
                    {restaurant.categories && restaurant.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {restaurant.categories.slice(0, 3).map((cat: string) => (
                          <Badge key={cat} variant="default" className="text-xs capitalize">
                            {cat.replace('_', ' ')}
                          </Badge>
                        ))}
                        {restaurant.categories.length > 3 && (
                          <Badge variant="default" className="text-xs">
                            +{restaurant.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={restaurant.tiers?.name === 'premium' ? 'gold' : 'default'}
                      className="capitalize"
                    >
                      {restaurant.tiers?.display_name || restaurant.tiers?.name || 'Basic'}
                    </Badge>
                    {restaurant.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </div>
                  {restaurant.stripe_subscription_id && (
                    <p className="text-xs text-green-500">Stripe Linked ✓</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Joined {new Date(restaurant.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2 mt-2 justify-end">
                    <Link
                      href={`/admin/restaurants/${restaurant.id}`}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Details →
                    </Link>
                    <Link
                      href={`/dashboard?admin_mode=true&restaurant_id=${restaurant.id}`}
                      className="text-xs text-tastelanc-accent hover:underline flex items-center gap-1"
                    >
                      <LayoutDashboard className="w-3 h-3" />
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredRestaurants.length)} of{' '}
            {filteredRestaurants.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-tastelanc-surface border border-tastelanc-surface-light text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-white px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-tastelanc-surface border border-tastelanc-surface-light text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
