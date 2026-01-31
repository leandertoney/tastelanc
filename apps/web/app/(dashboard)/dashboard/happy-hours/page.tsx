'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Beer, Loader2, Pencil, X } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { HappyHourWizard, HappyHourFormData } from '@/components/dashboard/forms';
import HappyHourImageUpload from '@/components/dashboard/forms/HappyHourImageUpload';
import DaySelector from '@/components/dashboard/forms/DaySelector';
import TimeRangePicker from '@/components/dashboard/forms/TimeRangePicker';
import TierGate from '@/components/TierGate';

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
  days_of_week: string[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  image_url?: string | null;
  happy_hour_items: HappyHourItem[];
}

export default function HappyHoursPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingHappyHour, setEditingHappyHour] = useState<HappyHour | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!confirm('Are you sure you want to delete this happy hour?')) return;

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-lancaster-gold" />
            Happy Hours
          </h2>
          <p className="text-gray-400 mt-1">Manage your happy hour specials</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Happy Hour
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Happy Hour Wizard */}
      {showWizard && restaurant && (
        <HappyHourWizard
          restaurantId={restaurant.id}
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreateHappyHour}
        />
      )}

      {/* Edit Happy Hour Modal */}
      {editingHappyHour && restaurant?.id && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Edit Happy Hour</h3>
            <button onClick={() => setEditingHappyHour(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Happy Hour Name *
              </label>
              <input
                type="text"
                value={editingHappyHour.name}
                onChange={(e) => setEditingHappyHour({ ...editingHappyHour, name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editingHappyHour.description || ''}
                onChange={(e) => setEditingHappyHour({ ...editingHappyHour, description: e.target.value })}
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
                value={editingHappyHour.days_of_week || []}
                onChange={(days) => setEditingHappyHour({ ...editingHappyHour, days_of_week: days })}
              />
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
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

      {/* List */}
      <div className="space-y-4">
        {happyHours.map((hh) => (
          <Card key={hh.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">{hh.name}</h3>
                  <Badge variant={hh.is_active ? 'accent' : 'default'}>
                    {hh.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {hh.description && <p className="text-gray-400 text-sm">{hh.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(hh.id, hh.is_active)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  {hh.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setEditingHappyHour(hh)}
                  className="text-gray-400 hover:text-white"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteHappyHour(hh.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-lancaster-gold" />
                <span className="text-gray-300">
                  {formatTime(hh.start_time)} - {formatTime(hh.end_time)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {hh.days_of_week?.map((day) => (
                  <Badge key={day} variant="gold" className="capitalize">
                    {day.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>

            {hh.happy_hour_items && hh.happy_hour_items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-tastelanc-surface-light">
                <p className="text-sm text-gray-400 mb-2">Specials:</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {hh.happy_hour_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-tastelanc-surface rounded"
                    >
                      <span className="text-white text-sm">{item.name}</span>
                      <span className="text-lancaster-gold text-sm">
                        <span className="line-through text-gray-500 mr-1">
                          ${item.original_price}
                        </span>
                        ${item.discounted_price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {happyHours.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <Beer className="w-12 h-12 text-lancaster-gold mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No happy hours yet</h3>
          <p className="text-gray-400 mb-4">
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
