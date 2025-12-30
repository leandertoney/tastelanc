'use client';

import { cn } from '@/lib/utils';
import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:ring-offset-2 focus:ring-offset-tastelanc-bg disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white': variant === 'primary',
            'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-white': variant === 'secondary',
            'border border-tastelanc-surface-light hover:bg-tastelanc-surface text-white': variant === 'outline',
            'hover:bg-tastelanc-surface text-gray-300 hover:text-white': variant === 'ghost',
            'px-3 py-1.5 text-sm rounded-md': size === 'sm',
            'px-4 py-2 text-sm rounded-lg': size === 'md',
            'px-6 py-3 text-base rounded-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
