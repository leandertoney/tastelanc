'use client';

import { Clock, Sparkles, Tag } from 'lucide-react';
import { BRAND } from '@/config/market';
import { useRef, useEffect, useState } from 'react';

const FEATURES = [
  {
    icon: Clock,
    title: 'Happy Hours & Events',
    description: "See what's happening tonight, updated in real time.",
  },
  {
    icon: Sparkles,
    title: 'AI Recommendations',
    description: `Ask ${BRAND.aiName} for personalized picks based on your mood.`,
  },
  {
    icon: Tag,
    title: 'Deals & Specials',
    description: 'Exclusive offers from local restaurants and bars.',
  },
];

export default function FeatureStrip() {
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
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`text-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div
                className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${BRAND.colors.accent}15` }}
              >
                <feature.icon
                  className="w-6 h-6"
                  style={{ color: BRAND.colors.accent }}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
