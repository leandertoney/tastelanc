'use client';

import { BRAND } from '@/config/market';
import StoreBadges from './StoreBadges';
import { useRef, useEffect, useState } from 'react';

export default function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-20 px-4 sm:px-6 text-center text-white"
      style={{
        background: `linear-gradient(135deg, ${BRAND.colors.accent}, ${BRAND.colors.accentHover})`,
      }}
    >
      <div className={`max-w-2xl mx-auto transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}`}>
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Download {BRAND.name} Free
        </h2>
        <p className="text-white/80 text-base mb-8">
          Available on iOS and Android. No account required to browse.
        </p>
        <StoreBadges size="lg" className="justify-center" />
      </div>
    </section>
  );
}
