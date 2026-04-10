'use client';

import { useState, useEffect, useRef } from 'react';
import PhoneMockup from './PhoneMockup';
import MockupHomeScreen from './MockupHomeScreen';
import MockupHappyHoursScreen from './MockupHappyHoursScreen';
import MockupChatScreen from './MockupChatScreen';
import MockupRecommendScreen from './MockupRecommendScreen';
import { BRAND } from '@/config/market';

const SCREENS = [
  { label: 'Discover', description: "Tonight's best spots at a glance" },
  { label: 'Happy Hours', description: 'Every deal, every day, every bar' },
  { label: `Ask ${BRAND.aiName}`, description: 'Your personal dining concierge' },
  { label: 'Recommend', description: 'Share your favorite bites with the community' },
];

const SCREEN_COMPONENTS = [MockupHomeScreen, MockupHappyHoursScreen, MockupChatScreen, MockupRecommendScreen];

export default function AppShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Auto-cycle on mobile (only when not hovered/focused)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SCREENS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-[#0D0D0D]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            See the app in action
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-base max-w-lg mx-auto">
            Everything you need to explore {BRAND.countyShort}&apos;s food and nightlife scene.
          </p>
        </div>

        {/* Desktop: 4 phones side by side with 3D perspective — staggered entrance */}
        <div className="hidden lg:flex justify-center items-start gap-6">
          {SCREENS.map((screen, i) => {
            const ScreenComponent = SCREEN_COMPONENTS[i];
            const tilts: ('right' | 'none' | 'left')[] = ['right', 'none', 'none', 'left'];
            const tilt = tilts[i];
            return (
              <div
                key={screen.label}
                className={`flex flex-col items-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${200 + i * 200}ms` }}
              >
                <PhoneMockup size="sm" tilt={tilt}>
                  <ScreenComponent />
                </PhoneMockup>
                <div className="mt-6 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {screen.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {screen.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile/Tablet: Single phone with crossfade + dots */}
        <div className="lg:hidden flex flex-col items-center">
          <div className="relative">
            {SCREENS.map((_, i) => {
              const ScreenComponent = SCREEN_COMPONENTS[i];
              return (
                <div
                  key={i}
                  className="transition-opacity duration-500"
                  style={{
                    opacity: i === activeIndex ? 1 : 0,
                    position: i === 0 ? 'relative' : 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  <PhoneMockup size="lg">
                    <ScreenComponent />
                  </PhoneMockup>
                </div>
              );
            })}
          </div>

          {/* Caption */}
          <div className="mt-6 text-center h-12">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {SCREENS[activeIndex].label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {SCREENS[activeIndex].description}
            </p>
          </div>

          {/* Dot indicators */}
          <div className="flex gap-2 mt-4">
            {SCREENS.map((_, i) => (
              <button
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor: i === activeIndex ? BRAND.colors.accent : '#D1D5DB',
                }}
                onClick={() => setActiveIndex(i)}
                aria-label={`View ${SCREENS[i].label}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
