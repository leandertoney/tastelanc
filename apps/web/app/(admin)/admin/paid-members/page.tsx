import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { Store, MapPin, CheckCircle, CreditCard, Calendar, ExternalLink, Edit, LayoutDashboard, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

async function getPaidRestaurants() {
  const supabase = await createClient();

  // Get restaurants with active Stripe subscriptions
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      tiers(name, display_name)
    `)
    .not('stripe_subscription_id', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching paid restaurants:', error);
    return [];
  }

  return restaurants || [];
}

export default async function AdminPaidMembersPage() {
  const restaurants = await getPaidRestaurants();

  // Calculate revenue (Premium = $585/year)
  const monthlyRecurringRevenue = restaurants.length * (585 / 12);
  const annualRecurringRevenue = restaurants.length * 585;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Paid Members</h1>
            <p className="text-gray-400 mt-1">
              {restaurants.length} active paid restaurant{restaurants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-green-500" />
            <span className="text-gray-400">Paid Restaurants</span>
          </div>
          <p className="text-3xl font-bold text-white">{restaurants.length}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-lancaster-gold" />
            <span className="text-gray-400">Monthly Recurring</span>
          </div>
          <p className="text-3xl font-bold text-white">
            ${monthlyRecurringRevenue.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Based on $585/year Premium</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <span className="text-gray-400">Annual Recurring</span>
          </div>
          <p className="text-3xl font-bold text-white">
            ${annualRecurringRevenue.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Paid Restaurant List */}
      {restaurants.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No paid members yet</h3>
          <p className="text-gray-400">
            Paid restaurants will appear here as they subscribe.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {restaurants.map((restaurant) => {
            const tier = restaurant.tiers;
            return (
              <Card key={restaurant.id} className="p-6 hover:border-green-500/50 transition-colors">
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
                        <h3 className="text-lg font-semibold text-white">{restaurant.name}</h3>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {restaurant.city}, {restaurant.state}
                        </span>
                      </div>
                      {restaurant.stripe_subscription_id && (
                        <p className="text-xs text-gray-500 mt-2 font-mono">
                          {restaurant.stripe_subscription_id}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={tier?.name === 'premium' ? 'gold' : 'default'}
                        className="capitalize"
                      >
                        {tier?.display_name || tier?.name || 'Premium'}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      Joined {new Date(restaurant.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/restaurants/${restaurant.slug}`}
                        target="_blank"
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </Link>
                      <Link
                        href={`/admin/restaurants/${restaurant.id}`}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Details
                      </Link>
                      <Link
                        href={`/dashboard?admin_mode=true&restaurant_id=${restaurant.id}`}
                        className="text-xs text-tastelanc-accent hover:underline flex items-center gap-1"
                      >
                        <LayoutDashboard className="w-3 h-3" />
                        Edit Dashboard
                      </Link>
                      <Link
                        href={`/admin/sales?restaurantId=${restaurant.id}`}
                        className="text-xs text-green-400 hover:underline flex items-center gap-1"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        Upgrade
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
