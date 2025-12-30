'use client';

import type { PropsWithChildren } from 'react';
import { RosieChatProvider } from '@/lib/contexts/RosieChatContext';

export default function Providers({ children }: PropsWithChildren) {
  return <RosieChatProvider>{children}</RosieChatProvider>;
}
