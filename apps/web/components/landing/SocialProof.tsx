'use client';

import { Star, UtensilsCrossed, Clock, Calendar } from 'lucide-react';
import { BRAND } from '@/config/market';
import { useRef, useEffect, useState } from 'react';

const STATS = [
  {
    icon: Star,
    value: '5.0',
    label: 'App Store Rating',
  },
  {
    icon: UtensilsCrossed,
    value: '600+',
    label: `${BRAND.countyShort} Restaurants`,
  },
  {
    icon: Clock,
    value: '30+',
    label: 'Happy Hours Daily',
  },
  {
    icon: Calendar,
    value: '90+',
    label: 'Weekly Events',
  },
];

export default function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="py-20 px-4 sm:px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        {/* Stats row — staggered reveal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center mb-16">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
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

        {/* Tagline — fade in */}
        <div className={`text-center max-w-2xl mx-auto transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '500ms' }}>
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            Real data from real restaurants, updated daily.
          </p>
        </div>
      </div>
    </section>
  );
}
