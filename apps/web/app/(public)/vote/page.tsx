import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Trophy, Award, Star, Crown } from 'lucide-react';
import { Badge } from '@/components/ui';
import { MARKET_SLUG, BRAND } from '@/config/market';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Vote | ${BRAND.name}`,
  description: `Vote for your favorite ${BRAND.countyShort} restaurants and bars. See the leaderboards and help crown the best of ${BRAND.countyShort}!`,
  alternates: {
    canonical: `https://${BRAND.domain}/vote`,
  },
};

const VOTE_CATEGORIES = [
  { id: 'best_happy_hour', name: 'Best Happy Hour', icon: <Trophy className="w-5 h-5" /> },
  { id: 'best_wings', name: 'Best Wings', icon: <Award className="w-5 h-5" /> },
  { id: 'best_burgers', name: 'Best Burgers', icon: <Award className="w-5 h-5" /> },
  { id: 'best_pizza', name: 'Best Pizza', icon: <Award className="w-5 h-5" /> },
  { id: 'best_brunch', name: 'Best Brunch', icon: <Star className="w-5 h-5" /> },
  { id: 'best_date_night', name: 'Best Date Night', icon: <Star className="w-5 h-5" /> },
  { id: 'best_late_night', name: 'Best Late Night', icon: <Crown className="w-5 h-5" /> },
  { id: 'best_cocktails', name: 'Best Cocktails', icon: <Crown className="w-5 h-5" /> },
];

async function getLeaderboards() {
  const supabase = await createClient();

  // Resolve market
  const { data: marketRow } = await supabase
    .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();
  if (!marketRow) return [];

  // Get top restaurants by favorites count as a proxy for popularity
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, cover_image_url, categories')
    .eq('market_id', marketRow.id)
    .eq('is_active', true)
    .limit(10);

  return restaurants || [];
}

export default async function VotePage() {
  const topRestaurants = await getLeaderboards();

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Trophy className="w-16 h-16 text-lancaster-gold mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Vote for {BRAND.countyShort}&apos;s Best</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Help crown the best restaurants and bars in {BRAND.countyShort}! Cast your votes each month to support your favorite local spots.
          </p>
        </div>

        {/* Vote CTA */}
        <div className="bg-gradient-to-r from-lancaster-gold/20 to-tastelanc-accent/20 rounded-xl p-8 mb-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Vote?</h2>
          <p className="text-gray-300 mb-6">
            Sign in to cast your votes. Premium members get 4 votes per month!
          </p>
          <Link
            href="/login"
            className="inline-block bg-lancaster-gold hover:bg-yellow-600 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Sign In to Vote
          </Link>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Vote Categories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VOTE_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="bg-tastelanc-card rounded-xl p-6 hover:ring-2 hover:ring-lancaster-gold transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-lancaster-gold">{category.icon}</div>
                  <h3 className="font-semibold text-white">{category.name}</h3>
                </div>
                <p className="text-sm text-gray-400">View leaderboard &rarr;</p>
              </div>
            ))}
          </div>
        </div>

        {/* Current Leaders */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Crown className="w-6 h-6 text-lancaster-gold" />
            Featured Restaurants
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topRestaurants.map((restaurant, index) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.slug}`}
                className="bg-tastelanc-card rounded-xl overflow-hidden hover:ring-2 hover:ring-tastelanc-accent transition-all"
              >
                <div className="aspect-[16/9] bg-tastelanc-surface relative">
                  {restaurant.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={restaurant.cover_image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl font-bold text-tastelanc-surface-light">
                        {restaurant.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="gold" className="text-sm font-bold">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{restaurant.name}</h3>
                  {restaurant.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {restaurant.categories.slice(0, 2).map((cat: string) => (
                        <Badge key={cat} variant="default">
                          {cat.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 bg-tastelanc-card rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">How Voting Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-tastelanc-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">1</span>
              </div>
              <h3 className="font-semibold text-white mb-2">Create an Account</h3>
              <p className="text-gray-400 text-sm">Sign up for free to start voting for your favorites</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-tastelanc-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <h3 className="font-semibold text-white mb-2">Cast Your Votes</h3>
              <p className="text-gray-400 text-sm">Vote in different categories each month (premium gets 4 votes!)</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-tastelanc-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <h3 className="font-semibold text-white mb-2">See the Winners</h3>
              <p className="text-gray-400 text-sm">Watch the leaderboards update and see who comes out on top</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
