'use client';

import { useState, useEffect } from 'react';
import { Save, Clock, AlertCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import type { DayOfWeek } from '@/types/database';

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

interface HoursEntry {
  day_of_week: DayOfWeek;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

// Default hours for new restaurants
const defaultHours: HoursEntry[] = DAYS.map((day) => ({
  day_of_week: day,
  is_closed: day === 'sunday',
  open_time: '11:00',
  close_time: '22:00',
}));

export default function HoursPage() {
  const { restaurantId, isLoading: contextLoading, buildApiUrl } = useRestaurant();
  const [hours, setHours] = useState<HoursEntry[]>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch hours on mount
  useEffect(() => {
    async function fetchHours() {
      if (!restaurantId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildApiUrl('/api/dashboard/hours'));

        if (!response.ok) {
          throw new Error('Failed to fetch hours');
        }

        const data = await response.json();

        if (data.hours && data.hours.length > 0) {
          // Map fetched hours to our format
          const fetchedHours = DAYS.map((day) => {
            const existing = data.hours.find((h: { day_of_week: DayOfWeek }) => h.day_of_week === day);
            return existing
              ? {
                  day_of_week: day,
                  is_closed: existing.is_closed,
                  open_time: existing.open_time || '11:00',
                  close_time: existing.close_time || '22:00',
                }
              : {
                  day_of_week: day,
                  is_closed: false,
                  open_time: '11:00',
                  close_time: '22:00',
                };
          });
          setHours(fetchedHours);
        }
      } catch (err) {
        console.error('Error fetching hours:', err);
        setError('Failed to load hours');
      } finally {
        setLoading(false);
      }
    }

    fetchHours();
  }, [restaurantId]);

  const updateHours = (day: DayOfWeek, field: keyof HoursEntry, value: string | boolean) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) {
      setError('No restaurant found');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/hours'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hours }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save hours');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  const capitalizeDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

  if (contextLoading || loading) {
    return (
      <div className="max-w-3xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Business Hours
          </h2>
          <p className="text-gray-400 mt-1">Loading...</p>
        </div>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-12 bg-tastelanc-surface-light rounded" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Business Hours
        </h2>
        <p className="text-gray-400 mt-1">Set your regular operating hours</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="space-y-4">
            {hours.map((entry) => (
              <div
                key={entry.day_of_week}
                className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-tastelanc-surface-light last:border-0"
              >
                <div className="w-32">
                  <span className="text-white font-medium">
                    {capitalizeDay(entry.day_of_week)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`closed-${entry.day_of_week}`}
                    checked={entry.is_closed}
                    onChange={(e) =>
                      updateHours(entry.day_of_week, 'is_closed', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-tastelanc-surface-light bg-tastelanc-surface text-tastelanc-accent focus:ring-tastelanc-accent"
                  />
                  <label
                    htmlFor={`closed-${entry.day_of_week}`}
                    className="text-sm text-gray-400"
                  >
                    Closed
                  </label>
                </div>

                {!entry.is_closed && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={entry.open_time}
                      onChange={(e) =>
                        updateHours(entry.day_of_week, 'open_time', e.target.value)
                      }
                      className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={entry.close_time}
                      onChange={(e) =>
                        updateHours(entry.day_of_week, 'close_time', e.target.value)
                      }
                      className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    />
                  </div>
                )}

                {entry.is_closed && (
                  <span className="text-gray-500 italic">Closed</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-4 mt-6 pt-6 border-t border-tastelanc-surface-light">
            {saved && (
              <span className="text-green-400 text-sm">Hours saved successfully!</span>
            )}
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Hours'}
            </Button>
          </div>
        </Card>
      </form>

      {/* Tips */}
      <Card className="p-6 bg-tastelanc-surface">
        <h3 className="font-semibold text-white mb-2">Tips</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Keep your hours up to date, especially during holidays</li>
          <li>• Customers rely on accurate hours to plan their visits</li>
          <li>• Consider extending hours during busy seasons</li>
        </ul>
      </Card>
    </div>
  );
}
