'use client';

import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { BRAND } from '@/config/market';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        {BRAND.aiAvatarImage ? (
          <Image
            src={BRAND.aiAvatarImage}
            alt={BRAND.aiName}
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-tastelanc-accent/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-tastelanc-accent" />
          </div>
        )}
      </div>

      {/* Typing Dots */}
      <div className="bg-tastelanc-card rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-2 h-2 bg-tastelanc-muted rounded-full" />
          <span className="typing-dot w-2 h-2 bg-tastelanc-muted rounded-full" />
          <span className="typing-dot w-2 h-2 bg-tastelanc-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}
