'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { BRAND } from '@/config/market';
import { ChatMessage as ChatMessageType, ROSIE_STORAGE_KEYS } from '@/lib/rosie/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

// Parse [[Name|slug]] format and convert to clickable links
function parseRestaurantLinks(content: string): React.ReactNode[] {
  // Regex to match [[Name|slug]] pattern
  const linkPattern = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const [, name, slug] = match;

    // Add the clickable link
    parts.push(
      <Link
        key={`${slug}-${match.index}`}
        href={`/discover/${slug}`}
        onClick={() => {
          // Set Rosie access token to allow access to the discover page
          if (typeof window !== 'undefined') {
            const token = `rosie-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(ROSIE_STORAGE_KEYS.rosieAccessToken, token);
          }
        }}
        className="text-tastelanc-accent hover:text-tastelanc-accent/80 underline underline-offset-2 font-medium transition-colors"
      >
        {name}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}

export default function ChatMessage({
  message,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-tastelanc-accent text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

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
            className="rounded-full animate-ai-bounce"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-tastelanc-accent/20 flex items-center justify-center animate-ai-bounce">
            <Sparkles className="w-4 h-4 text-tastelanc-accent" />
          </div>
        )}
      </div>

      {/* Message Bubble */}
      <div className="bg-tastelanc-card rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        <p className="text-sm text-white whitespace-pre-wrap">
          {parseRestaurantLinks(message.content)}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-tastelanc-accent ml-0.5 animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}
