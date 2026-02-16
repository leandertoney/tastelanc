import { createClient } from '@/lib/supabase/server';
import RestaurantCard from '@/components/restaurants/RestaurantCard';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Restaurant } from '@/types/database';
import type { Metadata } from 'next';
import { CATEGORIES_BY_GROUP, CATEGORY_GROUPS, getCategoryLabel } from '@/lib/constants/categories';
import { MARKET_SLUG } from '@/config/market';

export const metadata: Metadata = {
  title: 'Restaurants | TasteLanc',
  description: 'Browse restaurants, bars, and dining spots in Lancaster, PA. Filter by category, cuisine, and more.',
  alternates: {
    canonical: 'https://tastelanc.com/restaurants',
  },
};

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

async function getRestaurants(category?: string, query?: string) {
  const supabase = await createClient();

  // Resolve market
  const { data: marketRow } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', MARKET_SLUG)
    .eq('is_active', true)
    .single();
  if (!marketRow) throw new Error(`Market "${MARKET_SLUG}" not found`);

  let queryBuilder = supabase
    .from('restaurants')
    .select('*')
    .eq('market_id', marketRow.id)
    .eq('is_active', true)
    .order('name');

  if (category) {
    queryBuilder = queryBuilder.contains('categories', [category]);
  }

  if (query) {
    queryBuilder = queryBuilder.ilike('name', `%${query}%`);
  }

  const { data } = await queryBuilder;
  return data || [];
}

export default async function RestaurantsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const restaurants = await getRestaurants(params.category, params.q);

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Restaurants</h1>
          <p className="text-gray-400">
            Discover the best dining spots in Lancaster, PA
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <form>
              <input
                type="text"
                name="q"
                defaultValue={params.q}
                placeholder="Search restaurants..."
                className="w-full pl-10 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </form>
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400 text-sm">Filter:</span>
          </div>
        </div>

        {/* Category Filters - Grouped */}
        <div className="space-y-4 mb-8">
          {/* All Button */}
          <div className="flex flex-wrap gap-2">
            <a
              href="/restaurants"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !params.category
                  ? 'bg-tastelanc-accent text-white'
                  : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
              }`}
            >
              All Restaurants
            </a>
          </div>

          {/* Cuisines */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{CATEGORY_GROUPS.cuisines}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_BY_GROUP.cuisines.map((cat) => (
                <a
                  key={cat.value}
                  href={`/restaurants?category=${cat.value}`}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    params.category === cat.value
                      ? 'bg-tastelanc-accent text-white'
                      : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </a>
              ))}
            </div>
          </div>

          {/* Meal Time */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{CATEGORY_GROUPS.meal_time}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_BY_GROUP.meal_time.map((cat) => (
                <a
                  key={cat.value}
                  href={`/restaurants?category=${cat.value}`}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    params.category === cat.value
                      ? 'bg-tastelanc-accent text-white'
                      : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </a>
              ))}
            </div>
          </div>

          {/* Drinks & Bars */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{CATEGORY_GROUPS.drinks}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_BY_GROUP.drinks.map((cat) => (
                <a
                  key={cat.value}
                  href={`/restaurants?category=${cat.value}`}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    params.category === cat.value
                      ? 'bg-tastelanc-accent text-white'
                      : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </a>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{CATEGORY_GROUPS.features}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_BY_GROUP.features.map((cat) => (
                <a
                  key={cat.value}
                  href={`/restaurants?category=${cat.value}`}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    params.category === cat.value
                      ? 'bg-tastelanc-accent text-white'
                      : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-400 mb-6">
          {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
          {params.category && ` in ${getCategoryLabel(params.category as any)}`}
        </p>

        {/* Restaurant Grid */}
        {restaurants.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {restaurants.map((restaurant: Restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No restaurants found</p>
            <p className="text-gray-600 mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
