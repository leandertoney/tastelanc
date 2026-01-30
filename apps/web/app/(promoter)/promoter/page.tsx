'use client';

import { useState, useEffect } from 'react';
import { useSelfPromoter } from '@/contexts/SelfPromoterContext';
import { Card } from '@/components/ui';
import { Calendar, Music, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  event_type: string;
  event_date: string | null;
  start_time: string;
  image_url: string | null;
  is_active: boolean;
}

export default function PromoterOverviewPage() {
  const { selfPromoter, isLoading: contextLoading, error: contextError, buildApiUrl } = useSelfPromoter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
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
    }

    if (selfPromoter) {
      fetchEvents();
    }
  }, [selfPromoter, buildApiUrl]);

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

  const upcomingEvents = events.filter(e => {
    if (!e.event_date) return false;
    return new Date(e.event_date) >= new Date();
  }).slice(0, 5);

  const activeEventsCount = events.filter(e => e.is_active).length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {selfPromoter?.name}
        </h1>
        <p className="text-gray-400 mt-1">Manage your events and profile</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-gray-400 text-sm">Total Events</span>
          </div>
          <p className="text-2xl font-bold text-white">{events.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-400 text-sm">Active Events</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeEventsCount}</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/promoter/events"
            className="flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">Create Event</p>
              <p className="text-gray-400 text-sm">Add a new performance</p>
            </div>
          </Link>

          <Link
            href="/promoter/profile"
            className="flex items-center gap-3 p-4 bg-tastelanc-surface-light hover:bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">Edit Profile</p>
              <p className="text-gray-400 text-sm">Update your info</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Upcoming Events */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Upcoming Events</h2>
          <Link
            href="/promoter/events"
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            View all →
          </Link>
        </div>

        {isLoadingEvents ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No upcoming events</p>
            <Link
              href="/promoter/events"
              className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
            >
              Create your first event →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-4 p-3 bg-tastelanc-surface-light rounded-lg"
              >
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{event.name}</p>
                  <p className="text-gray-400 text-sm">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'No date set'}{' '}
                    • {event.start_time}
                  </p>
                </div>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full capitalize">
                  {event.event_type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
