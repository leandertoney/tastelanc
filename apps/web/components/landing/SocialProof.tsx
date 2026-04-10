import { Star, UtensilsCrossed, MapPin } from 'lucide-react';
import { BRAND, MARKET_CONFIG } from '@/config/market';

const marketCount = Object.keys(MARKET_CONFIG).length;

const STATS = [
  {
    icon: Star,
    value: '4.9',
    label: 'App Store Rating',
  },
  {
    icon: UtensilsCrossed,
    value: '1,000+',
    label: 'Local Restaurants',
  },
  {
    icon: MapPin,
    value: `${marketCount}`,
    label: marketCount === 1 ? 'City' : 'Cities',
  },
];

export default function SocialProof() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6 text-center mb-16">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${BRAND.colors.accent}10` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: BRAND.colors.accent }} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <blockquote className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 italic leading-relaxed">
            &ldquo;Finally an app that actually knows what&apos;s going on in {BRAND.countyShort}. The happy hour feature alone is worth it.&rdquo;
          </blockquote>
          <p className="text-sm text-gray-400 mt-3">
            &mdash; App Store Review
          </p>
        </div>
      </div>
    </section>
  );
}
