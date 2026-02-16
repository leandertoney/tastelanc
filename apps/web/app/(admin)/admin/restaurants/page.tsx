import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { Store, CheckCircle } from 'lucide-react';
import RestaurantList from '@/components/admin/RestaurantList';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

async function getRestaurants(scopedMarketId: string | null) {
  const supabase = await createClient();

  let query = supabase
    .from('restaurants')
    .select(`
      *,
      tiers(name, display_name)
    `)
    .order('name', { ascending: true });

  if (scopedMarketId) {
    query = query.eq('market_id', scopedMarketId);
  }

  const { data: restaurants, error } = await query;

  if (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }

  return restaurants || [];
}

export default async function AdminRestaurantsPage() {
  const supabase = await createClient();
  const admin = await verifyAdminAccess(supabase);
  const restaurants = await getRestaurants(admin.scopedMarketId);
  const activeCount = restaurants.filter((r) => r.is_active).length;
  const verifiedCount = restaurants.filter((r) => r.is_verified).length;
  const paidCount = restaurants.filter((r) => r.stripe_subscription_id).length;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">All Restaurants</h1>
            <p className="text-gray-400 mt-1">
              {restaurants.length} total • {activeCount} active • {verifiedCount} verified • {paidCount} paid
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-5 h-5 text-blue-500" />
            <span className="text-gray-400 text-sm">Total</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{restaurants.length}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-400 text-sm">Active</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{activeCount}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-lancaster-gold" />
            <span className="text-gray-400 text-sm">Verified</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{verifiedCount}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-tastelanc-accent" />
            <span className="text-gray-400 text-sm">Paid</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{paidCount}</p>
        </Card>
      </div>

      {/* Restaurant List with Search and Pagination */}
      <RestaurantList restaurants={restaurants} />
    </div>
  );
}
