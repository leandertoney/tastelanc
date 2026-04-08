'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calendar, Music, Music2, Mic2, HelpCircle, PartyPopper, Loader2, Tv, Laugh, Pencil, X, Grid3x3, Spade, Info, ChevronDown, ChevronUp, DollarSign, Clock, Power } from 'lucide-react';
import { Button, Card, Badge, Tooltip } from '@/components/ui';
import { toast } from 'sonner';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { EventWizard, EventFormData } from '@/components/dashboard/forms';
import EventImageUpload from '@/components/dashboard/forms/EventImageUpload';
import DaySelector from '@/components/dashboard/forms/DaySelector';
import TimeRangePicker from '@/components/dashboard/forms/TimeRangePicker';
import TierGate from '@/components/TierGate';
import EventAnalytics from '@/components/dashboard/EventAnalytics';
import type { DayOfWeek } from '@/types/database';

// Entertainment = recurring nightlife/activities shown in "Entertainment Tonight"
const ENTERTAINMENT_TYPES = ['live_music', 'dj', 'trivia', 'karaoke', 'comedy', 'sports', 'bingo', 'music_bingo', 'poker'];
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
  { value: 'music_bingo', label: 'Music Bingo', icon: Music2 },
  { value: 'poker', label: 'Poker', icon: Spade },
  { value: 'other', label: 'Special Event / Other', icon: PartyPopper },
];

const DAY_ORDER: Record<DayOfWeek, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

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
  cover_charge?: number | null;
}

interface EventsManagerProps {
  mode: 'entertainment' | 'events';
}

const MODE_CONFIG = {
  entertainment: {
    title: 'Entertainment',
    icon: Music,
    subtitle: 'Manage recurring entertainment like trivia, live music, and karaoke',
    hint: 'Entertainment listings repeat weekly (e.g. Trivia every Wednesday). Choose the type, days, time, and add an image. These show in the "Entertainment Tonight" section of the app.',
    tipText: 'Entertainment is for recurring weekly activities like trivia, live music, karaoke, poker nights, and bingo. These appear in the "Entertainment Tonight" section of the app and repeat on a weekly schedule.',
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
    hint: 'Events are one-time or limited-run occasions (wine dinners, holiday parties, etc.). Set a specific date, add details and an image. These appear in "Upcoming Events" in the app.',
    tipText: 'Events are for one-time or limited-run occasions like wine dinners, holiday parties, or special promotions. These appear in "Upcoming Events" in the app. For recurring weekly activities, use Entertainment instead.',
    addLabel: 'Add Event',
    emptyTitle: 'No events yet',
    emptyText: 'Add special events and promotions to attract customers',
    tierFeature: 'Events & Entertainment',
    tierDescription: 'Upgrade to Premium to create and promote special events and promotions.',
    allowedTypes: EVENT_ONLY_TYPES,
  },
};

/** Returns days until next occurrence for sorting. Lower = sooner. */
function getNextOccurrenceSort(event: Event): number {
  if (!event.is_recurring && event.event_date) {
    const diff = new Date(event.event_date + 'T00:00:00').getTime() - Date.now();
    // Past events sort to the end
    return diff < -86400000 ? 999 + Math.abs(diff / 86400000) : diff / 86400000;
  }
  if (event.is_recurring && event.days_of_week?.length > 0) {
    const today = new Date().getDay(); // 0=Sun
    let minDays = 7;
    for (const day of event.days_of_week) {
      const target = DAY_ORDER[day];
      const diff = (target - today + 7) % 7;
      if (diff < minDays) minDays = diff;
    }
    return minDays === 0 ? 0 : minDays;
  }
  return 500; // no date info — sort near end
}

function getScheduleSummary(event: Event): string {
  if (event.is_recurring && event.days_of_week?.length > 0) {
    const days = event.days_of_week
      .sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b])
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
      .join(', ');
    return `Every ${days}`;
  }
  if (event.event_date) {
    const d = new Date(event.event_date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return '';
}

export default function EventsManager({ mode }: EventsManagerProps) {
  const config = MODE_CONFIG[mode];
  const { restaurant, buildApiUrl } = useRestaurant();
  const [events, setEvents] = useState<Event[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`tip-dismissed-${mode}`) === 'true';
    }
    return false;
  });

  const filteredEventTypes = ALL_EVENT_TYPES.filter((t) => config.allowedTypes.includes(t.value));
  const TitleIcon = config.icon;

  // Sort events: active first, then by next occurrence date
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // Active events first
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      // Then by next occurrence
      return getNextOccurrenceSort(a) - getNextOccurrenceSort(b);
    });
  }, [events]);

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
      cover_charge: formData.cover_charge && parseFloat(formData.cover_charge) > 0
        ? parseFloat(formData.cover_charge)
        : null,
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
      if (expandedId === id) {
        setExpandedId(null);
        setEditingEvent(null);
      }
      toast.success('Deleted');
    } catch (err) {
      console.error('Error deleting event:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete event';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleStartEdit = (event: Event) => {
    setExpandedId(event.id);
    setEditingEvent({ ...event });
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
    // Keep expanded to show details, just stop editing
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
          cover_charge: editingEvent.cover_charge != null && editingEvent.cover_charge > 0
            ? editingEvent.cover_charge
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update event');
      }

      await fetchEvents();
      setEditingEvent(null);
      setExpandedId(null);
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
    return <Icon className="w-4 h-4" />;
  };

  const getEventTypeLabel = (type: string) => {
    return ALL_EVENT_TYPES.find((t) => t.value === type)?.label || type;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-tastelanc-text-primary flex items-center gap-2">
            <TitleIcon className="w-6 h-6 text-tastelanc-accent" />
            {config.title}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-tastelanc-text-muted">{config.subtitle}</p>
            <Tooltip content={config.hint} position="bottom">
              <HelpCircle className="w-4 h-4 text-tastelanc-text-faint hover:text-tastelanc-text-muted cursor-help" />
            </Tooltip>
          </div>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {config.addLabel}
        </Button>
      </div>

      {/* Info Tip Banner */}
      {!tipDismissed && (
        <div className="relative z-50 flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300 flex-1">{config.tipText}</p>
          <button
            onClick={() => {
              setTipDismissed(true);
              localStorage.setItem(`tip-dismissed-${mode}`, 'true');
            }}
            className="p-1 text-blue-400 hover:text-tastelanc-text-primary flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Event Analytics */}
      <EventAnalytics />

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

      {/* Compact Event List */}
      <div className="space-y-2">
        {sortedEvents.map((event) => {
          const isExpanded = expandedId === event.id;
          const isEditing = isExpanded && editingEvent?.id === event.id;

          return (
            <Card key={event.id} className={`overflow-hidden transition-all ${!event.is_active ? 'opacity-60' : ''}`}>
              {/* Compact Row — always visible */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-tastelanc-surface/50 transition-colors"
              >
                {/* Thumbnail */}
                {event.image_url ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.image_url}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-tastelanc-surface flex items-center justify-center flex-shrink-0 text-tastelanc-accent">
                    {getEventTypeIcon(event.event_type)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-tastelanc-text-primary truncate">{event.name}</h3>
                    {!event.is_active && (
                      <Badge variant="default" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-tastelanc-text-muted mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {getScheduleSummary(event)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {event.cover_charge != null && event.cover_charge > 0
                        ? `$${Number(event.cover_charge).toFixed(2)}`
                        : 'Free'}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <div className="flex-shrink-0 text-tastelanc-text-faint">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Expanded Section */}
              {isExpanded && (
                <div className="border-t border-tastelanc-surface-light">
                  {isEditing && editingEvent ? (
                    /* ── Inline Edit Form ── */
                    <div className="p-4 space-y-4">
                      {/* Row 1: Type + Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-tastelanc-text-secondary mb-1">Type</label>
                          <select
                            value={editingEvent.event_type}
                            onChange={(e) => setEditingEvent({ ...editingEvent, event_type: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                          >
                            {filteredEventTypes.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-tastelanc-text-secondary mb-1">Name *</label>
                          <input
                            type="text"
                            value={editingEvent.name}
                            onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                          />
                        </div>
                      </div>

                      {/* Row 2: Performer + Cover Charge */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-tastelanc-text-secondary mb-1">Performer / Host</label>
                          <input
                            type="text"
                            value={editingEvent.performer_name || ''}
                            onChange={(e) => setEditingEvent({ ...editingEvent, performer_name: e.target.value })}
                            placeholder="e.g., The Jazz Quartet"
                            className="w-full px-3 py-2 text-sm bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-tastelanc-text-secondary mb-1">
                            Cover Charge <span className="text-tastelanc-text-faint font-normal">(blank = free)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tastelanc-text-muted text-sm">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingEvent.cover_charge ?? ''}
                              onChange={(e) => setEditingEvent({ ...editingEvent, cover_charge: e.target.value ? parseFloat(e.target.value) : null })}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-2 text-sm bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-tastelanc-text-secondary mb-1">Description</label>
                        <textarea
                          value={editingEvent.description || ''}
                          onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 text-sm bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold resize-none"
                        />
                      </div>

                      {/* Schedule Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={editingEvent.is_recurring}
                              onChange={(e) => setEditingEvent({ ...editingEvent, is_recurring: e.target.checked })}
                              className="w-4 h-4 rounded border-tastelanc-border bg-tastelanc-surface text-lancaster-gold focus:ring-lancaster-gold"
                            />
                            <span className="text-xs font-medium text-tastelanc-text-secondary">Recurring weekly</span>
                          </label>
                          {editingEvent.is_recurring ? (
                            <DaySelector
                              value={editingEvent.days_of_week || []}
                              onChange={(days) => setEditingEvent({ ...editingEvent, days_of_week: days })}
                            />
                          ) : (
                            <input
                              type="date"
                              value={editingEvent.event_date || ''}
                              onChange={(e) => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                              className="w-full px-3 py-2 text-sm bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-tastelanc-text-secondary mb-1">Time</label>
                          <TimeRangePicker
                            startTime={editingEvent.start_time || ''}
                            endTime={editingEvent.end_time || ''}
                            onStartTimeChange={(time) => setEditingEvent({ ...editingEvent, start_time: time })}
                            onEndTimeChange={(time) => setEditingEvent({ ...editingEvent, end_time: time || null })}
                            startLabel="Start"
                            endLabel="End"
                          />
                        </div>
                      </div>

                      {/* Artwork */}
                      {restaurant?.id && (
                        <div>
                          <label className="block text-xs font-medium text-tastelanc-text-secondary mb-1">Artwork</label>
                          <EventImageUpload
                            value={editingEvent.image_url || undefined}
                            onChange={(url) => setEditingEvent({ ...editingEvent, image_url: url || null })}
                            restaurantId={restaurant.id}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" onClick={handleCancelEdit} className="flex-1" size="sm">
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUpdateEvent}
                          disabled={saving || !editingEvent.name.trim() || !editingEvent.start_time || (editingEvent.is_recurring ? editingEvent.days_of_week.length === 0 : !editingEvent.event_date)}
                          className="flex-1"
                          size="sm"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Read-Only Expanded Details ── */
                    <div className="p-4">
                      {/* Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-tastelanc-text-secondary">
                          {getEventTypeIcon(event.event_type)}
                          <span>{getEventTypeLabel(event.event_type)}</span>
                        </div>
                        {event.performer_name && (
                          <p className="text-sm text-tastelanc-accent">{event.performer_name}</p>
                        )}
                        {event.description && (
                          <p className="text-sm text-tastelanc-text-muted">{event.description}</p>
                        )}
                        {event.is_recurring && event.days_of_week?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {event.days_of_week
                              .sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b])
                              .map((day) => (
                                <Badge key={day} className="capitalize text-xs">{day.slice(0, 3)}</Badge>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleStartEdit(event)}>
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(event.id, event.is_active);
                          }}
                        >
                          <Power className="w-3.5 h-3.5 mr-1.5" />
                          {event.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEvent(event.id);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {events.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <TitleIcon className="w-12 h-12 text-tastelanc-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">{config.emptyTitle}</h3>
          <p className="text-tastelanc-text-muted mb-6 max-w-md mx-auto">
            {config.emptyText}
          </p>
          <div className="max-w-sm mx-auto mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-tastelanc-accent/20 text-tastelanc-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <p className="text-sm text-tastelanc-text-secondary">Pick a template or start from scratch</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-tastelanc-accent/20 text-tastelanc-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <p className="text-sm text-tastelanc-text-secondary">Add details, schedule, and optional artwork</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-tastelanc-accent/20 text-tastelanc-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
              <p className="text-sm text-tastelanc-text-secondary">Your event goes live on TasteLanc instantly</p>
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
