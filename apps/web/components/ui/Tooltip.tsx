'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export function Tooltip({ content, children, position = 'right', delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + padding;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - padding;
        break;
      case 'top':
        top = rect.top - padding;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2;
        break;
    }

    setCoords({ top, left });
  }, [visible, position]);

  const transformClasses: Record<string, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    right: '-translate-y-1/2',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} ref={triggerRef}>
      {children}
      {visible && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`fixed z-[9999] ${transformClasses[position]} pointer-events-none`}
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            <div className="bg-gray-800 text-gray-100 text-xs rounded-lg px-3 py-2 shadow-lg min-w-[200px] sm:min-w-[280px] max-w-[calc(100vw-2rem)] sm:max-w-[380px] whitespace-normal leading-relaxed border border-gray-600">
              {content}
              <div className={`absolute w-0 h-0 border-[5px] ${arrowClasses[position]}`} />
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}
