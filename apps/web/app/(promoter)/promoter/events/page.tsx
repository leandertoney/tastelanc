'use client';

import { useState, useEffect } from 'react';
import { useSelfPromoter } from '@/contexts/SelfPromoterContext';
import { Card } from '@/components/ui';
import {
  Calendar,
  Plus,
  AlertCircle,
  Loader2,
  Trash2,
  Music,
  Mic2,
  Laugh,
} from 'lucide-react';
import PromoterEventWizard from '@/components/promoter/PromoterEventWizard';

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string;
  end_time: string | null;
  performer_name: string | null;
  cover_charge: number | null;
  image_url: string | null;
  is_active: boolean;
}

const EVENT_TYPE_ICONS: Record<string, React.ElementType> = {
  live_music: Music,
  dj: Music,
  karaoke: Mic2,
  comedy: Laugh,
};

export default function PromoterEventsPage() {
  const { selfPromoter, isLoading: contextLoading, error: contextError, buildApiUrl } = useSelfPromoter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!selfPromoter?.id) return;

    try {
      const res = await fetch(buildApiUrl('/api/dashboard/promoter/events'));
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (selfPromoter) {
      fetchEvents();
    }
  }, [selfPromoter]);

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    setDeletingId(eventId);
    try {
      const res = await fetch(buildApiUrl(`/api/dashboard/promoter/events/${eventId}`), {
        method: 'DELETE',
      });

      if (res.ok) {
        setEvents(events.filter(e => e.id !== eventId));
      } else {
        alert('Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEventCreated = () => {
    setShowWizard(false);
    fetchEvents();
  };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (contextError) {
    return (
      <Card className="p-6 border-red-500/30">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>{contextError}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-gray-400 mt-1">Create and manage your performances</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* Event Wizard Modal */}
      {showWizard && (
        <PromoterEventWizard
          selfPromoterId={selfPromoter?.id || ''}
          onClose={() => setShowWizard(false)}
          onSuccess={handleEventCreated}
        />
      )}

      {/* Events List */}
      <Card className="overflow-hidden">
        {isLoadingEvents ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-white mb-2">No events yet</h3>
            <p className="text-gray-400 mb-4">Create your first event to start promoting</p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        ) : (
          <div className="divide-y divide-tastelanc-surface-light">
            {events.map((event) => {
              const Icon = EVENT_TYPE_ICONS[event.event_type] || Calendar;
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 hover:bg-tastelanc-surface-light/50 transition-colors"
                >
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.name}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-8 h-8 text-purple-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium truncate">{event.name}</h3>
                      {!event.is_active && (
                        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {event.event_date
                        ? new Date(event.event_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'No date set'}{' '}
                      • {event.start_time}
                      {event.end_time && ` - ${event.end_time}`}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full capitalize">
                        {event.event_type.replace('_', ' ')}
                      </span>
                      {event.cover_charge && (
                        <span className="text-gray-500 text-xs">
                          ${event.cover_charge} cover
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={deletingId === event.id}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingId === event.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
