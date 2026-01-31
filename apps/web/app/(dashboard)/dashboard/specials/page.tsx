'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, Loader2, Pencil, X } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { SpecialWizard, SpecialFormData } from '@/components/dashboard/forms';
import SpecialImageUpload from '@/components/dashboard/forms/SpecialImageUpload';
import DaySelector from '@/components/dashboard/forms/DaySelector';
import TimeRangePicker from '@/components/dashboard/forms/TimeRangePicker';
import TierGate from '@/components/TierGate';
import type { DayOfWeek } from '@/types/database';

// Format time for display (handles midnight)
function formatTime(time: string | null): string {
  if (!time) return '';
  if (time === '00:00') return 'Midnight';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${h}:${minutes} ${ampm}`;
}

interface Special {
  id: string;
  name: string;
  description: string;
  days_of_week: DayOfWeek[];
  start_time: string | null;
  end_time: string | null;
  special_price: number | null;
  original_price: number | null;
  image_url: string | null;
  is_active: boolean;
}

export default function SpecialsPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [saving, setSaving] = useState(false);

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
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      special_price: formData.special_price ? parseFloat(formData.special_price) : null,
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image_url: formData.image_url || null,
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

  const handleUpdateSpecial = async () => {
    if (!editingSpecial) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/specials/${editingSpecial.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingSpecial.name,
          description: editingSpecial.description,
          days_of_week: editingSpecial.days_of_week,
          start_time: editingSpecial.start_time,
          end_time: editingSpecial.end_time,
          original_price: editingSpecial.original_price,
          special_price: editingSpecial.special_price,
          image_url: editingSpecial.image_url,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update special');
      }

      await fetchSpecials();
      setEditingSpecial(null);
    } catch (err) {
      console.error('Error updating special:', err);
      setError(err instanceof Error ? err.message : 'Failed to update special');
    } finally {
      setSaving(false);
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
      {showWizard && restaurant?.id && (
        <SpecialWizard
          restaurantId={restaurant.id}
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreateSpecial}
        />
      )}

      {/* Edit Special Modal */}
      {editingSpecial && restaurant?.id && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Edit Special</h3>
            <button onClick={() => setEditingSpecial(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Special Name *
              </label>
              <input
                type="text"
                value={editingSpecial.name}
                onChange={(e) => setEditingSpecial({ ...editingSpecial, name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editingSpecial.description || ''}
                onChange={(e) => setEditingSpecial({ ...editingSpecial, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold resize-none"
              />
            </div>

            {/* Days */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Which days? *
              </label>
              <DaySelector
                value={editingSpecial.days_of_week || []}
                onChange={(days) => setEditingSpecial({ ...editingSpecial, days_of_week: days })}
              />
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time Available
                <span className="text-gray-500 font-normal ml-1">(leave blank for all day)</span>
              </label>
              <TimeRangePicker
                startTime={editingSpecial.start_time || ''}
                endTime={editingSpecial.end_time || ''}
                onStartTimeChange={(time) => setEditingSpecial({ ...editingSpecial, start_time: time || null })}
                onEndTimeChange={(time) => setEditingSpecial({ ...editingSpecial, end_time: time || null })}
                startLabel="Start Time"
                endLabel="End Time"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Image
              </label>
              <SpecialImageUpload
                value={editingSpecial.image_url || undefined}
                onChange={(url) => setEditingSpecial({ ...editingSpecial, image_url: url || null })}
                restaurantId={restaurant.id}
              />
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Original Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={editingSpecial.original_price ?? ''}
                    onChange={(e) => setEditingSpecial({ ...editingSpecial, original_price: e.target.value ? parseFloat(e.target.value) : null })}
                    step="0.01"
                    className="w-full pl-7 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Special Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={editingSpecial.special_price ?? ''}
                    onChange={(e) => setEditingSpecial({ ...editingSpecial, special_price: e.target.value ? parseFloat(e.target.value) : null })}
                    step="0.01"
                    className="w-full pl-7 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingSpecial(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSpecial}
                disabled={saving || !editingSpecial.name.trim() || editingSpecial.days_of_week.length === 0}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      <div className="grid md:grid-cols-2 gap-4">
        {specials.map((special) => (
          <Card key={special.id} className="p-0 overflow-hidden">
            {/* Image */}
            {special.image_url && (
              <div className="aspect-video">
                <img
                  src={special.image_url}
                  alt={special.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6">
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
                    onClick={() => setEditingSpecial(special)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSpecial(special.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Time */}
                {special.start_time && special.end_time && (
                  <Badge variant="default">
                    {formatTime(special.start_time)} - {formatTime(special.end_time)}
                  </Badge>
                )}
                {special.start_time && !special.end_time && (
                  <Badge variant="default">
                    From {formatTime(special.start_time)}
                  </Badge>
                )}
                {!special.start_time && !special.end_time && (
                  <Badge variant="default">All Day</Badge>
                )}
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
            </div>
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
