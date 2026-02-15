'use client';

import { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Loader2,
  Globe,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface Restaurant {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  is_active: boolean;
  tiers: { name: string } | null;
}

export default function SalesRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRestaurants = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/sales/restaurants?${params}`);
      const data = await res.json();
      setRestaurants(data.restaurants || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRestaurants();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Store className="w-8 h-8 text-tastelanc-accent" />
          Restaurant Directory
        </h1>
        <p className="text-gray-400 mt-1">Reference directory of all restaurants on the platform</p>
      </div>

      {/* Search */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
        </div>
      ) : restaurants.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No restaurants found</h3>
          <p className="text-gray-400">Try adjusting your search</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white truncate">{restaurant.name}</h3>
                    {restaurant.tiers && (
                      <Badge className={
                        restaurant.tiers.name === 'elite'
                          ? 'bg-lancaster-gold/20 text-lancaster-gold'
                          : restaurant.tiers.name === 'premium'
                          ? 'bg-tastelanc-accent/20 text-tastelanc-accent'
                          : 'bg-tastelanc-surface-light text-gray-400'
                      }>
                        {restaurant.tiers.name}
                      </Badge>
                    )}
                    <Badge className={restaurant.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {restaurant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    {restaurant.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {restaurant.city}, {restaurant.state}
                      </span>
                    )}
                    {restaurant.phone && (
                      <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1 hover:text-white">
                        <Phone className="w-3 h-3" />
                        {restaurant.phone}
                      </a>
                    )}
                    {restaurant.website && (
                      <a
                        href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <Globe className="w-3 h-3" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
