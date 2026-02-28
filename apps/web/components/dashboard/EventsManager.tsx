'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Music, Mic2, HelpCircle, PartyPopper, Loader2, Tv, Laugh, Pencil, X, Grid3x3 } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { toast } from 'sonner';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { EventWizard, EventFormData } from '@/components/dashboard/forms';
import EventImageUpload from '@/components/dashboard/forms/EventImageUpload';
import DaySelector from '@/components/dashboard/forms/DaySelector';
import TimeRangePicker from '@/components/dashboard/forms/TimeRangePicker';
import TierGate from '@/components/TierGate';
import type { DayOfWeek } from '@/types/database';

// Entertainment = recurring nightlife/activities shown in "Entertainment Tonight"
const ENTERTAINMENT_TYPES = ['live_music', 'dj', 'trivia', 'karaoke', 'comedy', 'sports', 'bingo'];
// Events = one-off specials and promotions shown in "Upcoming Events"
const EVENT_ONLY_TYPES = ['other'];

const ALL_EVENT_TYPES = [
  { value: 'live_music', label: 'Live Music', icon: Music },
  { value: 'trivia', label: 'Trivia', icon: HelpCircle },
  { value: 'karaoke', label: 'Karaoke', icon: Mic2 },
  { value: 'dj', label: 'DJ Night', icon: Music },
  { value: 'comedy', label: 'Comedy Night', icon: Laugh },
  { value: 'sports', label: 'Sports Event', icon: Tv },
  { value: 'bingo', label: 'Bingo Night', icon: Grid3x3 },
  { value: 'other', label: 'Special Event / Other', icon: PartyPopper },
];

interface Event {
  id: string;
  name: string;
  event_type: string;
  description: string;
  performer_name: string;
  start_time: string;
  end_time: string | null;
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  event_date: string | null;
  is_active: boolean;
  image_url?: string | null;
}

interface EventsManagerProps {
  mode: 'entertainment' | 'events';
}

const MODE_CONFIG = {
  entertainment: {
    title: 'Entertainment',
    icon: Music,
    subtitle: 'Manage recurring entertainment like trivia, live music, and karaoke',
    addLabel: 'Add Entertainment',
    emptyTitle: 'No entertainment yet',
    emptyText: 'Add entertainment like trivia, live music, or karaoke to attract customers',
    tierFeature: 'Events & Entertainment',
    tierDescription: 'Upgrade to Premium to create and promote entertainment like trivia, live music, and karaoke nights.',
    allowedTypes: ENTERTAINMENT_TYPES,
  },
  events: {
    title: 'Events',
    icon: Calendar,
    subtitle: 'Manage special events and promotions',
    addLabel: 'Add Event',
    emptyTitle: 'No events yet',
    emptyText: 'Add special events and promotions to attract customers',
    tierFeature: 'Events & Entertainment',
    tierDescription: 'Upgrade to Premium to create and promote special events and promotions.',
    allowedTypes: EVENT_ONLY_TYPES,
  },
};

export default function EventsManager({ mode }: EventsManagerProps) {
  const config = MODE_CONFIG[mode];
  const { restaurant, buildApiUrl } = useRestaurant();
  const [events, setEvents] = useState<Event[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredEventTypes = ALL_EVENT_TYPES.filter((t) => config.allowedTypes.includes(t.value));
  const TitleIcon = config.icon;

  // Fetch events on mount
  useEffect(() => {
    if (restaurant?.id) {
      fetchEvents();
    }
  }, [restaurant?.id]);

  const fetchEvents = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/events'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      // Filter events by type based on mode
      const allEvents: Event[] = data.events || [];
      setEvents(allEvents.filter((e) => config.allowedTypes.includes(e.event_type)));
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (formData: EventFormData) => {
    const payload = {
      name: formData.name,
      event_type: formData.event_type,
      description: formData.description,
      performer_name: formData.performer_name,
      start_time: formData.start_time,
      end_time: formData.end_time || null,
      is_recurring: formData.is_recurring,
      event_date: formData.is_recurring ? null : formData.event_date,
      days_of_week: formData.is_recurring ? formData.days_of_week : [],
      image_url: formData.image_url,
    };

    const response = await fetch(buildApiUrl('/api/dashboard/events'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create event');
    }

    await fetchEvents();
    toast.success(`${mode === 'entertainment' ? 'Entertainment' : 'Event'} created`);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/events/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update event');
      }

      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_active: !currentActive } : e))
      );
      toast.success(!currentActive ? 'Activated' : 'Deactivated');
    } catch (err) {
      console.error('Error toggling event:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update event';
      setError(msg);
      toast.error(msg);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/events/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete event');
      }

      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      toast.success('Deleted');
    } catch (err) {
      console.error('Error deleting event:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete event';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/events/${editingEvent.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingEvent.name,
          event_type: editingEvent.event_type,
          description: editingEvent.description,
          performer_name: editingEvent.performer_name,
          start_time: editingEvent.start_time,
          end_time: editingEvent.end_time,
          is_recurring: editingEvent.is_recurring,
          days_of_week: editingEvent.days_of_week,
          event_date: editingEvent.event_date,
          image_url: editingEvent.image_url,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update event');
      }

      await fetchEvents();
      setEditingEvent(null);
      toast.success('Changes saved');
    } catch (err) {
      console.error('Error updating event:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update event';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getEventTypeIcon = (type: string) => {
    const eventType = ALL_EVENT_TYPES.find((t) => t.value === type);
    const Icon = eventType?.icon || Calendar;
    return <Icon className="w-5 h-5" />;
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
      feature={config.tierFeature}
      description={config.tierDescription}
    >
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TitleIcon className="w-6 h-6 text-tastelanc-accent" />
            {config.title}
          </h2>
          <p className="text-gray-400 mt-1">{config.subtitle}</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {config.addLabel}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Event Wizard */}
      {showWizard && restaurant?.id && (
        <EventWizard
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreateEvent}
          restaurantId={restaurant.id}
          allowedTypes={config.allowedTypes}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && restaurant?.id && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Edit {mode === 'entertainment' ? 'Entertainment' : 'Event'}</h3>
            <button onClick={() => setEditingEvent(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-5">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type *
              </label>
              <select
                value={editingEvent.event_type}
                onChange={(e) => setEditingEvent({ ...editingEvent, event_type: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              >
                {filteredEventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={editingEvent.name}
                onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>

            {/* Performer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Performer/Host Name
              </label>
              <input
                type="text"
                value={editingEvent.performer_name || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, performer_name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editingEvent.description || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold resize-none"
              />
            </div>

            {/* Recurring Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingEvent.is_recurring}
                  onChange={(e) => setEditingEvent({ ...editingEvent, is_recurring: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-tastelanc-surface text-lancaster-gold focus:ring-lancaster-gold"
                />
                <span className="text-gray-300">Recurring (repeats weekly)</span>
              </label>
            </div>

            {/* Days or Date */}
            {editingEvent.is_recurring ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Which days? *
                </label>
                <DaySelector
                  value={editingEvent.days_of_week || []}
                  onChange={(days) => setEditingEvent({ ...editingEvent, days_of_week: days })}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={editingEvent.event_date || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                  className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                />
              </div>
            )}

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time *
              </label>
              <TimeRangePicker
                startTime={editingEvent.start_time || ''}
                endTime={editingEvent.end_time || ''}
                onStartTimeChange={(time) => setEditingEvent({ ...editingEvent, start_time: time })}
                onEndTimeChange={(time) => setEditingEvent({ ...editingEvent, end_time: time || null })}
                startLabel="Start Time"
                endLabel="End Time (optional)"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Artwork
              </label>
              <EventImageUpload
                value={editingEvent.image_url || undefined}
                onChange={(url) => setEditingEvent({ ...editingEvent, image_url: url || null })}
                restaurantId={restaurant.id}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingEvent(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateEvent}
                disabled={saving || !editingEvent.name.trim() || !editingEvent.start_time || (editingEvent.is_recurring ? editingEvent.days_of_week.length === 0 : !editingEvent.event_date)}
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
        {events.map((event) => (
          <Card key={event.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                {event.image_url ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.image_url}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-tastelanc-surface rounded-lg text-tastelanc-accent">
                    {getEventTypeIcon(event.event_type)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                    <Badge variant={event.is_active ? 'accent' : 'default'}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {event.is_recurring && <Badge>Recurring</Badge>}
                  </div>
                  {event.performer_name && (
                    <p className="text-tastelanc-accent text-sm mb-1">{event.performer_name}</p>
                  )}
                  {event.description && (
                    <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                    <span>
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </span>
                    {event.is_recurring ? (
                      <div className="flex gap-1">
                        {event.days_of_week?.map((day) => (
                          <Badge key={day} className="capitalize">
                            {day.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span>{event.event_date}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => toggleActive(event.id, event.is_active)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  {event.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {events.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <TitleIcon className="w-12 h-12 text-tastelanc-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">{config.emptyTitle}</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {config.emptyText}
          </p>
          <div className="max-w-sm mx-auto mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-tastelanc-accent/20 text-tastelanc-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <p className="text-sm text-gray-300">Pick a template or start from scratch</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-tastelanc-accent/20 text-tastelanc-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <p className="text-sm text-gray-300">Add details, schedule, and optional artwork</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-tastelanc-accent/20 text-tastelanc-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
              <p className="text-sm text-gray-300">Your event goes live on TasteLanc instantly</p>
            </div>
          </div>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {config.addLabel}
          </Button>
        </Card>
      )}
    </div>
    </TierGate>
  );
}
