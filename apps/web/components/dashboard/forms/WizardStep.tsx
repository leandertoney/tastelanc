'use client';

import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useState } from 'react';

interface WizardStepProps {
  children: ReactNode;
  isActive: boolean;
  direction?: 'forward' | 'backward';
  className?: string;
}

export default function WizardStep({
  children,
  isActive,
  direction = 'forward',
  className,
}: WizardStepProps) {
  const [shouldRender, setShouldRender] = useState(isActive);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
      // Small delay to trigger enter animation
      requestAnimationFrame(() => {
        setAnimationClass(
          direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'
        );
      });
    } else if (shouldRender) {
      // Trigger exit animation
      setAnimationClass(
        direction === 'forward' ? 'animate-slide-out-left' : 'animate-slide-out-right'
      );
      // Remove from DOM after animation
      const timer = setTimeout(() => {
        setShouldRender(false);
        setAnimationClass('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, direction, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        'w-full',
        animationClass,
        className
      )}
    >
      {children}
    </div>
  );
}
