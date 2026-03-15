import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'gold';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        {
          'bg-tastelanc-surface text-tastelanc-text-muted': variant === 'default',
          'bg-tastelanc-accent text-white': variant === 'accent',
          'bg-green-500/15 text-green-600': variant === 'success',
          'bg-yellow-500/15 text-yellow-600': variant === 'warning',
          'bg-lancaster-gold/20 text-lancaster-gold': variant === 'gold',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
