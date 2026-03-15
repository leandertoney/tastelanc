import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatTime, getCurrentDayOfWeek, capitalizeWords } from '@/lib/utils';
import type { Metadata } from 'next';
import type { DayOfWeek } from '@/types/database';
import { BRAND, MARKET_SLUG } from '@/config/market';
import { buildMeta } from '@/lib/seo/meta';
import { AppGateCTA } from '@/components/seo/AppGateCTA';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export async function generateMetadata(): Promise<Metadata> {
  return buildMeta({
    title: `Best Happy Hours in ${BRAND.countyShort}, ${BRAND.state} | ${BRAND.name}`,
    description: `Find the best happy hour deals in ${BRAND.countyShort}, ${BRAND.state}. Discover drink specials, food deals, and more at local restaurants and bars.`,
    url: `${siteUrl}/happy-hours`,
  });
}

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

  // Resolve market
  const { data: marketRow } = await supabase
    .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();
  if (!marketRow) throw new Error(`Market "${MARKET_SLUG}" not found`);

  const { data } = await supabase
    .from('happy_hours')
    .select('*, restaurant:restaurants!inner(*), happy_hour_items(*)')
    .eq('restaurant.market_id', marketRow.id)
    .eq('is_active', true)
    .contains('days_of_week', [targetDay])
    .order('start_time');

  return data || [];
}

export default async function HappyHoursPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentDay = params.day || getCurrentDayOfWeek();
  const happyHours = await getHappyHours(currentDay);

  const VISIBLE_COUNT = 6;
  const visible = happyHours.slice(0, VISIBLE_COUNT);
  const blurredPreview = happyHours.slice(VISIBLE_COUNT, VISIBLE_COUNT + 3);
  const hiddenCount = Math.max(0, happyHours.length - VISIBLE_COUNT);

  function renderCard(hh: (typeof happyHours)[number]) {
    return (
      <Link
        key={hh.id}
        href={`/restaurants/${hh.restaurant?.slug}`}
        className="bg-tastelanc-card rounded-xl overflow-hidden hover:ring-2 hover:ring-lancaster-gold transition-all"
      >
        {(hh.image_url || hh.restaurant?.cover_image_url) && (
          <div className="aspect-video relative">
            <img
              src={hh.image_url || hh.restaurant?.cover_image_url}
              alt={hh.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              <Badge variant="gold">
                {formatTime(hh.start_time)} - {formatTime(hh.end_time)}
              </Badge>
            </div>
          </div>
        )}
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-tastelanc-text-primary text-lg">{hh.restaurant?.name}</h3>
              <p className="text-tastelanc-text-muted text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {hh.restaurant?.address}
              </p>
            </div>
            {!(hh.image_url || hh.restaurant?.cover_image_url) && (
              <Badge variant="gold">
                {formatTime(hh.start_time)} - {formatTime(hh.end_time)}
              </Badge>
            )}
          </div>

          <h4 className="text-tastelanc-text-primary font-medium mb-2">{hh.name}</h4>

          {hh.description && (
            <p className="text-tastelanc-text-muted text-sm mb-3">{hh.description}</p>
          )}

          {hh.happy_hour_items && hh.happy_hour_items.length > 0 && (
            <div className="border-t border-tastelanc-surface-light pt-3 mt-3">
              <p className="text-sm text-tastelanc-text-faint mb-2">Deals:</p>
              <div className="flex flex-wrap gap-2">
                {hh.happy_hour_items.slice(0, 4).map((item: { id: string; name: string; discounted_price: number | null }) => (
                  <span key={item.id} className="text-sm text-lancaster-gold">
                    {item.name} {item.discounted_price && `$${item.discounted_price}`}
                  </span>
                ))}
                {hh.happy_hour_items.length > 4 && (
                  <span className="text-sm text-tastelanc-text-faint">+{hh.happy_hour_items.length - 4} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-tastelanc-text-primary mb-2 flex items-center gap-3">
            <Clock className="w-10 h-10 text-lancaster-gold" />
            Happy Hours
          </h1>
          <p className="text-tastelanc-text-muted">
            Find the best happy hour deals in {BRAND.countyShort}
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
                  : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-tastelanc-text-secondary hover:text-tastelanc-text-primary'
              }`}
            >
              {day.label}
            </a>
          ))}
        </div>

        {/* Results */}
        <p className="text-tastelanc-text-muted mb-6">
          {happyHours.length} happy hour{happyHours.length !== 1 ? 's' : ''} on {capitalizeWords(currentDay)}
        </p>

        {visible.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((hh) => renderCard(hh))}
            </div>

            {/* Content Gate */}
            <AppGateCTA hiddenCount={hiddenCount} contentType="happy hours">
              {blurredPreview.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blurredPreview.map((hh) => renderCard(hh))}
                </div>
              )}
            </AppGateCTA>
          </>
        ) : (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-tastelanc-text-faint mx-auto mb-4" />
            <p className="text-tastelanc-text-faint text-lg">No happy hours on {capitalizeWords(currentDay)}</p>
            <p className="text-tastelanc-text-faint mt-2">Try checking another day</p>
          </div>
        )}
      </div>
    </div>
  );
}
