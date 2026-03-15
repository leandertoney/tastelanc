'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export function Tooltip({ content, children, position = 'right', delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-tastelanc-surface border-x-transparent border-b-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-tastelanc-surface border-y-transparent border-l-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-tastelanc-surface border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-tastelanc-surface border-y-transparent border-r-transparent',
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`absolute z-[100] ${positionClasses[position]} pointer-events-none`}
          role="tooltip"
        >
          <div className="bg-tastelanc-surface text-tastelanc-text-secondary text-xs rounded-lg px-3 py-2 shadow-lg min-w-[200px] sm:min-w-[280px] max-w-[calc(100vw-2rem)] sm:max-w-[380px] whitespace-normal leading-relaxed border border-tastelanc-border">
            {content}
            <div className={`absolute w-0 h-0 border-[5px] ${arrowClasses[position]}`} />
          </div>
        </div>
      )}
    </div>
  );
}
