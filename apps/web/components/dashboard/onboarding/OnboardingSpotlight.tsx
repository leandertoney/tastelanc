'use client';

import { useEffect, useState, useRef } from 'react';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingSpotlightProps {
  targetSelector?: string;
  isActive: boolean;
}

export default function OnboardingSpotlight({
  targetSelector,
  isActive,
}: OnboardingSpotlightProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (!isActive || !targetSelector) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const bounds = element.getBoundingClientRect();
        setRect({
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        });

        // Add the spotlight class to the element
        element.classList.add('onboarding-spotlight');
      }
    };

    // Initial measurement
    updateRect();

    // Update on scroll and resize
    window.addEventListener('scroll', updateRect);
    window.addEventListener('resize', updateRect);

    // Watch for DOM changes
    observerRef.current = new MutationObserver(updateRect);
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener('scroll', updateRect);
      window.removeEventListener('resize', updateRect);
      observerRef.current?.disconnect();

      // Remove spotlight class
      const element = document.querySelector(targetSelector);
      if (element) {
        element.classList.remove('onboarding-spotlight');
      }
    };
  }, [targetSelector, isActive]);

  if (!isActive) return null;

  return (
    <div className="onboarding-overlay pointer-events-none">
      {rect && (
        <div
          className="absolute bg-transparent pointer-events-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
            borderRadius: '8px',
          }}
        />
      )}
    </div>
  );
}
