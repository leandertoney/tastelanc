'use client';

import type { PropsWithChildren } from 'react';
import { ThemeProvider } from 'next-themes';
import { MarketProvider } from '@/contexts/MarketContext';
import { RosieChatProvider } from '@/lib/contexts/RosieChatContext';

export default function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark">
      <MarketProvider>
        <RosieChatProvider>{children}</RosieChatProvider>
      </MarketProvider>
    </ThemeProvider>
  );
}
