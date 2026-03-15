import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { Store, CheckCircle } from 'lucide-react';
import RestaurantList from '@/components/admin/RestaurantList';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import AdminMarketFilter from '@/components/admin/AdminMarketFilter';

async function getRestaurants(marketId: string | null) {
  const supabase = await createClient();

  let query = supabase
    .from('restaurants')
    .select(`
      *,
      tiers(name, display_name)
    `, { count: 'exact' })
    .order('name', { ascending: true })
    .range(0, 4999);

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data: restaurants, count, error } = await query;

  if (error) {
    console.error('Error fetching restaurants:', error);
    return { restaurants: [], count: 0 };
  }

  return { restaurants: restaurants || [], count: count ?? (restaurants?.length || 0) };
}

async function getMarkets() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('markets')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true });
  return data || [];
}

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const supabase = await createClient();
  const admin = await verifyAdminAccess(supabase);
  const params = await searchParams;

  // Market scoping: admin.scopedMarketId for market_admins, or URL param for super_admins
  const effectiveMarketId = admin.scopedMarketId || (params.market && params.market !== 'all' ? params.market : null);

  const [{ restaurants, count }, markets] = await Promise.all([
    getRestaurants(effectiveMarketId),
    admin.scopedMarketId ? Promise.resolve([]) : getMarkets(),
  ]);

  const activeCount = restaurants.filter((r) => r.is_active).length;
  const verifiedCount = restaurants.filter((r) => r.is_verified).length;
  const paidCount = restaurants.filter((r) => r.stripe_subscription_id).length;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-tastelanc-text-primary">All Restaurants</h1>
            <p className="text-tastelanc-text-muted mt-1">
              {count} total • {activeCount} active • {verifiedCount} verified • {paidCount} paid
            </p>
          </div>
          {/* Market filter for super admins */}
          {!admin.scopedMarketId && markets.length > 1 && (
            <AdminMarketFilter markets={markets} currentMarket={params.market || 'all'} basePath="/admin/restaurants" />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-5 h-5 text-blue-500" />
            <span className="text-tastelanc-text-muted text-sm">Total</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{count}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-tastelanc-text-muted text-sm">Active</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{activeCount}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-lancaster-gold" />
            <span className="text-tastelanc-text-muted text-sm">Verified</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{verifiedCount}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-tastelanc-accent" />
            <span className="text-tastelanc-text-muted text-sm">Paid</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{paidCount}</p>
        </Card>
      </div>

      {/* Restaurant List with Search and Pagination */}
      <RestaurantList restaurants={restaurants} />
    </div>
  );
}
