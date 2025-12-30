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
          'bg-tastelanc-surface text-gray-400': variant === 'default',
          'bg-tastelanc-accent text-white': variant === 'accent',
          'bg-green-900/50 text-green-400': variant === 'success',
          'bg-yellow-900/50 text-yellow-400': variant === 'warning',
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
