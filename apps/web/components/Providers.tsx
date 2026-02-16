'use client';

import type { PropsWithChildren } from 'react';
import { MarketProvider } from '@/contexts/MarketContext';
import { RosieChatProvider } from '@/lib/contexts/RosieChatContext';

export default function Providers({ children }: PropsWithChildren) {
  return (
    <MarketProvider>
      <RosieChatProvider>{children}</RosieChatProvider>
    </MarketProvider>
  );
}
