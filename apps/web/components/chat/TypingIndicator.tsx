'use client';

import Image from 'next/image';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      {/* Rosie Avatar */}
      <div className="flex-shrink-0">
        <Image
          src="/images/rosie_dark_new.png"
          alt="Rosie"
          width={36}
          height={36}
          className="rounded-full"
        />
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
