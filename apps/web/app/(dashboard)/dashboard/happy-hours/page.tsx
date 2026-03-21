'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Beer, Loader2, Pencil, X, Copy, HelpCircle } from 'lucide-react';
import { Button, Card, Badge, Tooltip } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useModal } from '@/components/dashboard/ModalProvider';
import { HappyHourWizard, HappyHourFormData } from '@/components/dashboard/forms';
import HappyHourImageUpload from '@/components/dashboard/forms/HappyHourImageUpload';
import DaySelector from '@/components/dashboard/forms/DaySelector';
import TimeRangePicker from '@/components/dashboard/forms/TimeRangePicker';
import TierGate from '@/components/TierGate';
import type { DayOfWeek } from '@/types/database';

interface HappyHourItem {
  id: string;
  name: string;
  original_price: number;
  discounted_price: number;
}

interface HappyHour {
  id: string;
  name: string;
  description: string;
  days_of_week: DayOfWeek[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  image_url?: string | null;
  happy_hour_items: HappyHourItem[];
}

export default function HappyHoursPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const modal = useModal();
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingHappyHour, setEditingHappyHour] = useState<HappyHour | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicateData, setDuplicateData] = useState<HappyHourFormData | null>(null);
  const [showMultiSlotTip, setShowMultiSlotTip] = useState(true);

  // Fetch happy hours on mount
  useEffect(() => {
    if (restaurant?.id) {
      fetchHappyHours();
    }
  }, [restaurant?.id]);

  const fetchHappyHours = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/happy-hours'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch happy hours');
      }

      setHappyHours(data.happyHours || []);
    } catch (err) {
      console.error('Error fetching happy hours:', err);
      setError(err instanceof Error ? err.message : 'Failed to load happy hours');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHappyHour = async (formData: HappyHourFormData) => {
    const payload = {
      name: formData.name,
      description: formData.description,
      days_of_week: formData.days_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      image_url: formData.image_url,
    };

    const response = await fetch(buildApiUrl('/api/dashboard/happy-hours'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create happy hour');
    }

    // Refresh the list
    await fetchHappyHours();
  };

  const deleteHappyHour = async (id: string) => {
    const confirmed = await modal.confirm({ title: 'Delete Happy Hour', description: 'Are you sure you want to delete this happy hour?', confirmLabel: 'Delete', variant: 'danger' });
    if (!confirmed) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/happy-hours/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete happy hour');
      }

      setHappyHours((prev) => prev.filter((hh) => hh.id !== id));
    } catch (err) {
      console.error('Error deleting happy hour:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete happy hour');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/happy-hours/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update happy hour');
      }

      setHappyHours((prev) =>
        prev.map((hh) => (hh.id === id ? { ...hh, is_active: !currentActive } : hh))
      );
    } catch (err) {
      console.error('Error toggling happy hour:', err);
      setError(err instanceof Error ? err.message : 'Failed to update happy hour');
    }
  };

  const handleUpdateHappyHour = async () => {
    if (!editingHappyHour) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/happy-hours/${editingHappyHour.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingHappyHour.name,
          description: editingHappyHour.description,
          days_of_week: editingHappyHour.days_of_week,
          start_time: editingHappyHour.start_time,
          end_time: editingHappyHour.end_time,
          image_url: editingHappyHour.image_url,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update happy hour');
      }

      await fetchHappyHours();
      setEditingHappyHour(null);
    } catch (err) {
      console.error('Error updating happy hour:', err);
      setError(err instanceof Error ? err.message : 'Failed to update happy hour');
    } finally {
      setSaving(false);
    }
  };

  const duplicateHappyHour = (hh: HappyHour) => {
    setDuplicateData({
      name: `${hh.name} (Copy)`,
      description: hh.description || '',
      days_of_week: [...hh.days_of_week],
      start_time: hh.start_time,
      end_time: hh.end_time,
      image_url: hh.image_url || undefined,
    });
    setShowWizard(true);
  };

  const formatTime = (time: string) => {
    if (time === '00:00') return 'Midnight';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-lancaster-gold animate-spin" />
      </div>
    );
  }

  return (
    <TierGate
      requiredTier="premium"
      feature="Happy Hours"
      description="Upgrade to Premium to create and manage happy hour specials that bring in more customers."
    >
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-tastelanc-text-primary flex items-center gap-2">
            <Clock className="w-6 h-6 text-lancaster-gold" />
            Happy Hours
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-tastelanc-text-muted">Manage your happy hour specials</p>
            <Tooltip content="Happy hours are one of the most viewed features in the app. Add drink and food deals with prices, select the days and times, and upload an eye-catching image to attract more customers." position="bottom">
              <HelpCircle className="w-4 h-4 text-tastelanc-text-faint hover:text-tastelanc-text-muted cursor-help" />
            </Tooltip>
          </div>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Happy Hour
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-zinc-900 border border-red-500/30 rounded-lg text-zinc-200">
          {error}
        </div>
      )}

      {/* Happy Hour Wizard */}
      {showWizard && restaurant && (
        <HappyHourWizard
          restaurantId={restaurant.id}
          onClose={() => {
            setShowWizard(false);
            setDuplicateData(null);
          }}
          onSubmit={handleCreateHappyHour}
          initialData={duplicateData || undefined}
        />
      )}

      {/* Edit Happy Hour Modal */}
      {editingHappyHour && restaurant?.id && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-tastelanc-text-primary">Edit Happy Hour</h3>
            <button onClick={() => setEditingHappyHour(null)} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Happy Hour Name *
              </label>
              <input
                type="text"
                value={editingHappyHour.name}
                onChange={(e) => setEditingHappyHour({ ...editingHappyHour, name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Description
              </label>
              <textarea
                value={editingHappyHour.description || ''}
                onChange={(e) => setEditingHappyHour({ ...editingHappyHour, description: e.target.value })}
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
                value={editingHappyHour.days_of_week || []}
                onChange={(days) => setEditingHappyHour({ ...editingHappyHour, days_of_week: days })}
              />
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Time *
              </label>
              <TimeRangePicker
                startTime={editingHappyHour.start_time || ''}
                endTime={editingHappyHour.end_time || ''}
                onStartTimeChange={(time) => setEditingHappyHour({ ...editingHappyHour, start_time: time })}
                onEndTimeChange={(time) => setEditingHappyHour({ ...editingHappyHour, end_time: time })}
                startLabel="Start Time"
                endLabel="End Time"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Custom Image
              </label>
              <HappyHourImageUpload
                value={editingHappyHour.image_url || undefined}
                onChange={(url) => setEditingHappyHour({ ...editingHappyHour, image_url: url || null })}
                restaurantId={restaurant.id}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingHappyHour(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateHappyHour}
                disabled={saving || !editingHappyHour.name.trim() || editingHappyHour.days_of_week.length === 0 || !editingHappyHour.start_time || !editingHappyHour.end_time}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Multi-time-slot tip */}
      {showMultiSlotTip && happyHours.length >= 1 && happyHours.length <= 3 && !showWizard && !editingHappyHour && (
        <div className="flex items-start gap-3 p-4 bg-lancaster-gold/5 border border-lancaster-gold/20 rounded-lg">
          <Clock className="w-5 h-5 text-lancaster-gold flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-tastelanc-text-secondary">
              <span className="text-tastelanc-text-primary font-medium">Multiple time slots?</span>{' '}
              Create a separate entry for each time window (e.g., 4-6pm weekdays and 9-11pm Thu-Sat).
              Tap the <Copy className="w-3 h-3 inline" /> icon to quickly duplicate an existing entry.
            </p>
          </div>
          <button onClick={() => setShowMultiSlotTip(false)} className="text-tastelanc-text-faint hover:text-tastelanc-text-primary flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {happyHours.map((hh) => (
          <div key={hh.id} className="group bg-tastelanc-surface rounded-lg overflow-hidden hover:bg-tastelanc-surface-light transition-colors">
            {/* Square artwork — image or styled time block */}
            <div className="aspect-square w-full relative">
              {hh.image_url ? (
                <img src={hh.image_url} alt={hh.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-lancaster-gold/20 to-tastelanc-surface-light flex flex-col items-center justify-center gap-1">
                  <Beer className="w-7 h-7 text-lancaster-gold" />
                  <span className="text-xs text-lancaster-gold font-semibold text-center px-2 leading-tight">
                    {formatTime(hh.start_time)} – {formatTime(hh.end_time)}
                  </span>
                </div>
              )}
              {/* Active badge */}
              <div className="absolute top-2 left-2">
                <Badge variant={hh.is_active ? 'accent' : 'default'} className="text-xs py-0">
                  {hh.is_active ? 'Active' : 'Off'}
                </Badge>
              </div>
              {/* Actions on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingHappyHour(hh)} title="Edit" className="p-1 bg-black/60 rounded text-white hover:bg-black/80">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => duplicateHappyHour(hh)} title="Duplicate" className="p-1 bg-black/60 rounded text-white hover:bg-black/80">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={() => deleteHappyHour(hh.id)} title="Delete" className="p-1 bg-black/60 rounded text-white hover:text-red-400 hover:bg-black/80">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-2.5">
              <p className="text-sm font-medium text-tastelanc-text-primary truncate leading-tight">{hh.name}</p>
              <p className="text-xs text-tastelanc-text-muted mt-0.5 truncate">
                {hh.days_of_week?.map(d => d.slice(0, 3)).join(', ')}
              </p>
              {hh.image_url && (
                <p className="text-xs text-tastelanc-text-faint flex items-center gap-1">
                  <Clock className="w-3 h-3" />{formatTime(hh.start_time)} – {formatTime(hh.end_time)}
                </p>
              )}
              {hh.happy_hour_items?.length > 0 && (
                <p className="text-xs text-tastelanc-text-faint mt-0.5">
                  {hh.happy_hour_items.length} deal{hh.happy_hour_items.length !== 1 ? 's' : ''}
                </p>
              )}
              <button
                onClick={() => toggleActive(hh.id, hh.is_active)}
                className="mt-2 text-xs text-tastelanc-text-faint hover:text-tastelanc-text-primary"
              >
                {hh.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {happyHours.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <Beer className="w-12 h-12 text-lancaster-gold mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">No happy hours yet</h3>
          <p className="text-tastelanc-text-muted mb-4">
            Create your first happy hour to attract more customers
          </p>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Happy Hour
          </Button>
        </Card>
      )}
    </div>
    </TierGate>
  );
}
