'use client';

import { ReactNode } from 'react';
import { RosieChatProvider } from '@/lib/contexts/RosieChatContext';

export default function Providers({ children }: { children: ReactNode }) {
  return <RosieChatProvider>{children}</RosieChatProvider>;
}
