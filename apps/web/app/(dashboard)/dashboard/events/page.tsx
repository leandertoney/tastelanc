'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Music, Mic2, HelpCircle, PartyPopper, Loader2, Tv, Laugh } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { EventWizard, EventFormData } from '@/components/dashboard/forms';
import TierGate from '@/components/TierGate';

const EVENT_TYPES = [
  { value: 'live_music', label: 'Live Music', icon: Music },
  { value: 'trivia', label: 'Trivia', icon: HelpCircle },
  { value: 'karaoke', label: 'Karaoke', icon: Mic2 },
  { value: 'dj', label: 'DJ Night', icon: Music },
  { value: 'comedy', label: 'Comedy Night', icon: Laugh },
  { value: 'sports', label: 'Sports Event', icon: Tv },
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
  days_of_week: string[];
  event_date: string | null;
  is_active: boolean;
}

export default function EventsPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const [events, setEvents] = useState<Event[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      setEvents(data.events || []);
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

    // Refresh the list
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/events/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete event');
      }

      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
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
    const eventType = EVENT_TYPES.find((t) => t.value === type);
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
      feature="Events & Entertainment"
      description="Upgrade to Premium to create and promote events like trivia, live music, and karaoke nights."
    >
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-tastelanc-accent" />
            Events
          </h2>
          <p className="text-gray-400 mt-1">Manage recurring and one-time events</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Event
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
        />
      )}

      {/* List */}
      <div className="space-y-4">
        {events.map((event) => (
          <Card key={event.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="p-3 bg-tastelanc-surface rounded-lg text-tastelanc-accent">
                  {getEventTypeIcon(event.event_type)}
                </div>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {events.length === 0 && !showWizard && (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-tastelanc-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No events yet</h3>
          <p className="text-gray-400 mb-4">
            Add events like trivia, live music, or karaoke to attract customers
          </p>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </Card>
      )}
    </div>
    </TierGate>
  );
}
