'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, Loader2, Pencil, X, HelpCircle } from 'lucide-react';
import { Button, Card, Badge, Tooltip } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useModal } from '@/components/dashboard/ModalProvider';
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
  const modal = useModal();
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
    const confirmed = await modal.confirm({ title: 'Delete Special', description: 'Are you sure you want to delete this special?', confirmLabel: 'Delete', variant: 'danger' });
    if (!confirmed) return;

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-tastelanc-text-primary flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-tastelanc-accent" />
            Daily Specials
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-tastelanc-text-muted">Manage recurring weekly specials</p>
            <Tooltip content="Specials repeat weekly on the days you choose. Add a name, description, price, and image. Users see these when browsing your restaurant in the app." position="bottom">
              <HelpCircle className="w-4 h-4 text-tastelanc-text-faint hover:text-tastelanc-text-muted cursor-help" />
            </Tooltip>
          </div>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Special
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-zinc-900 border border-red-500/30 rounded-lg text-zinc-200">
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
            <h3 className="text-lg font-semibold text-tastelanc-text-primary">Edit Special</h3>
            <button onClick={() => setEditingSpecial(null)} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Special Name *
              </label>
              <input
                type="text"
                value={editingSpecial.name}
                onChange={(e) => setEditingSpecial({ ...editingSpecial, name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Description
              </label>
              <textarea
                value={editingSpecial.description || ''}
                onChange={(e) => setEditingSpecial({ ...editingSpecial, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold resize-none"
              />
            </div>

            {/* Days */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-3">
                Which days? *
              </label>
              <DaySelector
                value={editingSpecial.days_of_week || []}
                onChange={(days) => setEditingSpecial({ ...editingSpecial, days_of_week: days })}
              />
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Time Available
                <span className="text-tastelanc-text-faint font-normal ml-1">(leave blank for all day)</span>
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
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Custom Image
              </label>
              <SpecialImageUpload
                value={editingSpecial.image_url || undefined}
                onChange={(url) => setEditingSpecial({ ...editingSpecial, image_url: url || null })}
                restaurantId={restaurant.id}
              />
            </div>

            {/* Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                  Original Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tastelanc-text-faint">$</span>
                  <input
                    type="number"
                    value={editingSpecial.original_price ?? ''}
                    onChange={(e) => setEditingSpecial({ ...editingSpecial, original_price: e.target.value ? parseFloat(e.target.value) : null })}
                    step="0.01"
                    className="w-full pl-7 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                  Special Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tastelanc-text-faint">$</span>
                  <input
                    type="number"
                    value={editingSpecial.special_price ?? ''}
                    onChange={(e) => setEditingSpecial({ ...editingSpecial, special_price: e.target.value ? parseFloat(e.target.value) : null })}
                    step="0.01"
                    className="w-full pl-7 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
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

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {specials.map((special) => (
          <div key={special.id} className="group bg-tastelanc-surface rounded-lg overflow-hidden hover:bg-tastelanc-surface-light transition-colors">
            {/* Square image / placeholder */}
            <div className="aspect-square w-full bg-tastelanc-surface-light relative">
              {special.image_url ? (
                <img src={special.image_url} alt={special.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-tastelanc-text-faint" />
                </div>
              )}
              {/* Active badge overlay */}
              <div className="absolute top-2 left-2">
                <Badge variant={special.is_active ? 'accent' : 'default'} className="text-xs py-0">
                  {special.is_active ? 'Active' : 'Off'}
                </Badge>
              </div>
              {/* Action buttons — visible on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingSpecial(special)} className="p-1 bg-black/60 rounded text-white hover:bg-black/80">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => deleteSpecial(special.id)} className="p-1 bg-black/60 rounded text-white hover:text-red-400 hover:bg-black/80">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-2.5">
              <p className="text-sm font-medium text-tastelanc-text-primary truncate leading-tight">{special.name}</p>
              <p className="text-xs text-tastelanc-text-muted mt-0.5 truncate">
                {special.days_of_week?.map(d => d.slice(0, 3)).join(', ')}
              </p>
              <p className="text-xs text-tastelanc-text-faint truncate">
                {special.start_time && special.end_time
                  ? `${formatTime(special.start_time)} – ${formatTime(special.end_time)}`
                  : 'All Day'}
              </p>
              {special.special_price && (
                <p className="text-xs mt-1">
                  {special.original_price && (
                    <span className="line-through text-tastelanc-text-faint mr-1">${special.original_price.toFixed(2)}</span>
                  )}
                  <span className="text-green-400 font-semibold">${special.special_price.toFixed(2)}</span>
                </p>
              )}
              <button
                onClick={() => toggleActive(special.id, special.is_active)}
                className="mt-2 text-xs text-tastelanc-text-faint hover:text-tastelanc-text-primary"
              >
                {special.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {specials.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 text-tastelanc-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">No specials yet</h3>
          <p className="text-tastelanc-text-muted mb-4">Create weekly specials to bring in more customers</p>
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
