'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Ticket, Loader2, Pencil, X, HelpCircle, BarChart3, Eye, EyeOff } from 'lucide-react';
import { Button, Card, Badge, Tooltip } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useModal } from '@/components/dashboard/ModalProvider';
import { CouponWizard, CouponFormData } from '@/components/dashboard/forms';

function formatDiscountBadge(coupon: Coupon): string {
  switch (coupon.discount_type) {
    case 'percent_off':
      return coupon.discount_value ? `${coupon.discount_value}% Off` : '% Off';
    case 'dollar_off':
      return coupon.discount_value ? `$${coupon.discount_value} Off` : '$ Off';
    case 'bogo':
      return 'BOGO';
    case 'free_item':
      return 'Free Item';
    case 'custom':
      return 'Deal';
    default:
      return '';
  }
}

interface Coupon {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  original_price: number | null;
  image_url: string | null;
  start_date: string;
  end_date: string | null;
  days_of_week: string[];
  start_time: string | null;
  end_time: string | null;
  max_claims_total: number | null;
  max_claims_per_user: number;
  claims_count: number;
  is_active: boolean;
  created_at: string;
}

interface Analytics {
  total_claimed: number;
  total_redeemed: number;
  conversion_rate: number;
  avg_redemption_minutes: number;
}

export default function CouponsPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const modal = useModal();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, Analytics>>({});
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant?.id) {
      fetchCoupons();
    }
  }, [restaurant?.id]);

  const fetchCoupons = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/coupons'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch coupons');
      }

      setCoupons(data.coupons || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError(err instanceof Error ? err.message : 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (couponId: string) => {
    if (analyticsMap[couponId]) {
      setShowAnalytics(showAnalytics === couponId ? null : couponId);
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/coupons/${couponId}/analytics`));
      const data = await response.json();

      if (response.ok) {
        setAnalyticsMap(prev => ({ ...prev, [couponId]: data.analytics }));
        setShowAnalytics(couponId);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const handleCreateCoupon = async (formData: CouponFormData) => {
    const payload = {
      title: formData.title,
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value || null,
      original_price: formData.original_price || null,
      image_url: formData.image_url || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      days_of_week: formData.days_of_week,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      max_claims_total: formData.max_claims_total || null,
      max_claims_per_user: formData.max_claims_per_user || '1',
    };

    const response = await fetch(buildApiUrl('/api/dashboard/coupons'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create coupon');
    }

    await fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    const confirmed = await modal.confirm({
      title: 'Delete Deal',
      description: 'Are you sure you want to delete this deal? Active claims will still be valid.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/coupons/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete coupon');
      }

      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting coupon:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete coupon');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/coupons/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update coupon');
      }

      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentActive } : c))
      );
    } catch (err) {
      console.error('Error toggling coupon:', err);
      setError(err instanceof Error ? err.message : 'Failed to update coupon');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-tastelanc-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-tastelanc-text-primary flex items-center gap-2">
            <Ticket className="w-6 h-6 text-tastelanc-accent" />
            Deals
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-tastelanc-text-muted">Create deals for your customers</p>
            <Tooltip content="Deals are redeemable in the app. Users must sign in to claim. You see anonymized analytics — total claims and redemptions — but never individual user data." position="bottom">
              <HelpCircle className="w-4 h-4 text-tastelanc-text-faint hover:text-tastelanc-text-muted cursor-help" />
            </Tooltip>
          </div>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-zinc-900 border border-red-500/30 rounded-lg text-zinc-200">
          {error}
        </div>
      )}

      {showWizard && restaurant?.id && (
        <CouponWizard
          restaurantId={restaurant.id}
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreateCoupon}
        />
      )}

      {/* Coupon List */}
      <div className="grid md:grid-cols-2 gap-4">
        {coupons.map((coupon) => {
          const analytics = analyticsMap[coupon.id];
          const isAnalyticsOpen = showAnalytics === coupon.id;

          return (
            <Card key={coupon.id} className="p-0 overflow-hidden">
              {coupon.image_url && (
                <div className="aspect-video">
                  <img
                    src={coupon.image_url}
                    alt={coupon.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-tastelanc-text-primary">{coupon.title}</h3>
                      <Badge variant={coupon.is_active ? 'accent' : 'default'}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {coupon.description && (
                      <p className="text-tastelanc-text-muted text-sm">{coupon.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAnalytics(coupon.id)}
                      className="text-tastelanc-text-muted hover:text-tastelanc-accent"
                      title="View Analytics"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCoupon(coupon.id)}
                      className="text-tastelanc-text-muted hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="accent" className="font-semibold">
                    {formatDiscountBadge(coupon)}
                  </Badge>

                  {coupon.days_of_week && coupon.days_of_week.length > 0 ? (
                    coupon.days_of_week.map((day) => (
                      <Badge key={day} className="capitalize">
                        {day.slice(0, 3)}
                      </Badge>
                    ))
                  ) : (
                    <Badge>Every Day</Badge>
                  )}

                  {coupon.end_date && (
                    <Badge variant="default">
                      Expires {new Date(coupon.end_date).toLocaleDateString()}
                    </Badge>
                  )}

                  <span className="text-xs text-tastelanc-text-faint">
                    {coupon.claims_count} claimed
                    {coupon.max_claims_total ? ` / ${coupon.max_claims_total} max` : ''}
                  </span>
                </div>

                {/* Analytics Panel */}
                {isAnalyticsOpen && analytics && (
                  <div className="mt-3 p-4 bg-tastelanc-bg rounded-lg border border-tastelanc-surface-light">
                    <h4 className="text-sm font-semibold text-tastelanc-text-primary mb-3">Analytics</h4>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold text-tastelanc-accent">{analytics.total_claimed}</p>
                        <p className="text-xs text-tastelanc-text-muted">Claimed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">{analytics.total_redeemed}</p>
                        <p className="text-xs text-tastelanc-text-muted">Redeemed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-tastelanc-text-primary">{analytics.conversion_rate}%</p>
                        <p className="text-xs text-tastelanc-text-muted">Conversion</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-tastelanc-text-primary">
                          {analytics.avg_redemption_minutes > 60
                            ? `${Math.round(analytics.avg_redemption_minutes / 60)}h`
                            : `${analytics.avg_redemption_minutes}m`}
                        </p>
                        <p className="text-xs text-tastelanc-text-muted">Avg. Time to Redeem</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => toggleActive(coupon.id, coupon.is_active)}
                  className="mt-3 text-sm text-tastelanc-text-muted hover:text-tastelanc-text-primary flex items-center gap-1"
                >
                  {coupon.is_active ? (
                    <><EyeOff className="w-3.5 h-3.5" /> Deactivate</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> Activate</>
                  )}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {coupons.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <Ticket className="w-12 h-12 text-tastelanc-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">No deals yet</h3>
          <p className="text-tastelanc-text-muted mb-4">Create deals to drive foot traffic and new customers</p>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Deal
          </Button>
        </Card>
      )}
    </div>
  );
}
