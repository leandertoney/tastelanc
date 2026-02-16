'use client';

import Image from 'next/image';
import { MessageCircle } from 'lucide-react';
import RosieChatModal from './RosieChatModal';
import { useRosieChat } from '@/lib/contexts/RosieChatContext';
import { BRAND } from '@/config/market';

export default function RosieChatBubble() {
  const { isOpen, openChat, closeChat } = useRosieChat();

  return (
    <>
      {/* Floating Bubble */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgb(var(--brand-accent)/0.4)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:ring-offset-2 focus:ring-offset-tastelanc-bg animate-chat-pulse"
          aria-label={`Chat with ${BRAND.aiName}`}
        >
          {BRAND.aiAvatarImage ? (
            <Image
              src={BRAND.aiAvatarImage}
              alt={`Chat with ${BRAND.aiName}`}
              width={64}
              height={64}
              className="w-full h-full object-cover animate-ai-bounce"
            />
          ) : (
            <div className="w-full h-full bg-tastelanc-accent flex items-center justify-center animate-ai-bounce">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          )}
        </button>
      )}

      {/* Chat Modal */}
      <RosieChatModal isOpen={isOpen} onClose={closeChat} />
    </>
  );
}
