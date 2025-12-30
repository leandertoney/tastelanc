import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatTime, getCurrentDayOfWeek, capitalizeWords } from '@/lib/utils';
import type { Metadata } from 'next';
import type { DayOfWeek } from '@/types/database';

export const metadata: Metadata = {
  title: 'Happy Hours | TasteLanc',
  description: 'Find the best happy hour deals in Lancaster, PA. Discover drink specials, food deals, and more at local restaurants and bars.',
};

interface PageProps {
  searchParams: Promise<{ day?: string }>;
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

async function getHappyHours(day?: string) {
  const supabase = await createClient();
  const targetDay = day || getCurrentDayOfWeek();

  const { data } = await supabase
    .from('happy_hours')
    .select('*, restaurant:restaurants(*), happy_hour_items(*)')
    .eq('is_active', true)
    .contains('days_of_week', [targetDay])
    .order('start_time');

  return data || [];
}

export default async function HappyHoursPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentDay = params.day || getCurrentDayOfWeek();
  const happyHours = await getHappyHours(currentDay);

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Clock className="w-10 h-10 text-lancaster-gold" />
            Happy Hours
          </h1>
          <p className="text-gray-400">
            Find the best happy hour deals in Lancaster
          </p>
        </div>

        {/* Day Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DAYS.map((day) => (
            <a
              key={day.value}
              href={`/happy-hours?day=${day.value}`}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                currentDay === day.value
                  ? 'bg-lancaster-gold text-black font-medium'
                  : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white'
              }`}
            >
              {day.label}
            </a>
          ))}
        </div>

        {/* Results */}
        <p className="text-gray-400 mb-6">
          {happyHours.length} happy hour{happyHours.length !== 1 ? 's' : ''} on {capitalizeWords(currentDay)}
        </p>

        {happyHours.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {happyHours.map((hh) => (
              <Link
                key={hh.id}
                href={`/restaurants/${hh.restaurant?.slug}`}
                className="bg-tastelanc-card rounded-xl p-6 hover:ring-2 hover:ring-lancaster-gold transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{hh.restaurant?.name}</h3>
                    <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {hh.restaurant?.address}
                    </p>
                  </div>
                  <Badge variant="gold">
                    {formatTime(hh.start_time)} - {formatTime(hh.end_time)}
                  </Badge>
                </div>

                <h4 className="text-white font-medium mb-2">{hh.name}</h4>

                {hh.description && (
                  <p className="text-gray-400 text-sm mb-3">{hh.description}</p>
                )}

                {hh.happy_hour_items && hh.happy_hour_items.length > 0 && (
                  <div className="border-t border-tastelanc-surface-light pt-3 mt-3">
                    <p className="text-sm text-gray-500 mb-2">Deals:</p>
                    <div className="flex flex-wrap gap-2">
                      {hh.happy_hour_items.slice(0, 4).map((item: { id: string; name: string; discounted_price: number | null }) => (
                        <span key={item.id} className="text-sm text-lancaster-gold">
                          {item.name} {item.discounted_price && `$${item.discounted_price}`}
                        </span>
                      ))}
                      {hh.happy_hour_items.length > 4 && (
                        <span className="text-sm text-gray-500">+{hh.happy_hour_items.length - 4} more</span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No happy hours on {capitalizeWords(currentDay)}</p>
            <p className="text-gray-600 mt-2">Try checking another day</p>
          </div>
        )}
      </div>
    </div>
  );
}
