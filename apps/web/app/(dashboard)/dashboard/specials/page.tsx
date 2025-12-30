'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { SpecialWizard, SpecialFormData } from '@/components/dashboard/forms';
import TierGate from '@/components/TierGate';

interface Special {
  id: string;
  name: string;
  description: string;
  days_of_week: string[];
  special_price: number | null;
  original_price: number | null;
  is_active: boolean;
}

export default function SpecialsPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch specials on mount
  useEffect(() => {
    if (restaurant?.id) {
      fetchSpecials();
    }
  }, [restaurant?.id]);

  const fetchSpecials = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/specials'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch specials');
      }

      setSpecials(data.specials || []);
    } catch (err) {
      console.error('Error fetching specials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load specials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpecial = async (formData: SpecialFormData) => {
    const payload = {
      name: formData.name,
      description: formData.description,
      days_of_week: formData.days_of_week,
      special_price: formData.special_price ? parseFloat(formData.special_price) : null,
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      is_recurring: true,
    };

    const response = await fetch(buildApiUrl('/api/dashboard/specials'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create special');
    }

    // Refresh the list
    await fetchSpecials();
  };

  const deleteSpecial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this special?')) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/specials/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete special');
      }

      setSpecials((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Error deleting special:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete special');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/specials/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update special');
      }

      setSpecials((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
      );
    } catch (err) {
      console.error('Error toggling special:', err);
      setError(err instanceof Error ? err.message : 'Failed to update special');
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
    <TierGate
      requiredTier="premium"
      feature="Daily Specials"
      description="Upgrade to Premium to create and manage weekly specials that attract more customers."
    >
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-tastelanc-accent" />
            Daily Specials
          </h2>
          <p className="text-gray-400 mt-1">Manage recurring weekly specials</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Special
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Special Wizard */}
      {showWizard && (
        <SpecialWizard
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreateSpecial}
        />
      )}

      {/* List */}
      <div className="grid md:grid-cols-2 gap-4">
        {specials.map((special) => (
          <Card key={special.id} className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">{special.name}</h3>
                  <Badge variant={special.is_active ? 'accent' : 'default'}>
                    {special.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {special.description && (
                  <p className="text-gray-400 text-sm">{special.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteSpecial(special.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {special.days_of_week?.map((day) => (
                <Badge key={day} className="capitalize">
                  {day}
                </Badge>
              ))}
              {special.original_price && special.special_price && (
                <span className="text-sm">
                  <span className="line-through text-gray-500 mr-1">
                    ${special.original_price.toFixed(2)}
                  </span>
                  <span className="text-green-400 font-semibold">
                    ${special.special_price.toFixed(2)}
                  </span>
                </span>
              )}
              {!special.original_price && special.special_price && (
                <span className="text-tastelanc-accent font-semibold">
                  ${special.special_price.toFixed(2)}
                </span>
              )}
            </div>

            <button
              onClick={() => toggleActive(special.id, special.is_active)}
              className="mt-4 text-sm text-gray-400 hover:text-white"
            >
              {special.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </Card>
        ))}
      </div>

      {specials.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 text-tastelanc-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No specials yet</h3>
          <p className="text-gray-400 mb-4">Create weekly specials to bring in more customers</p>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Special
          </Button>
        </Card>
      )}
    </div>
    </TierGate>
  );
}
