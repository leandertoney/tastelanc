'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import {
  ChatMessage as ChatMessageType,
  ROSIE_STORAGE_KEYS,
  ROSIE_CONFIG,
} from '@/lib/rosie/types';
import { getWelcomeMessage } from '@/lib/rosie/system-prompt';

interface RosieChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RosieChatModal({ isOpen, onClose }: RosieChatModalProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session and load persisted data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if user is on waitlist
      const email = localStorage.getItem(ROSIE_STORAGE_KEYS.earlyAccessEmail);
      setIsOnWaitlist(!!email);

      // Get or create session ID
      let storedSessionId = localStorage.getItem(ROSIE_STORAGE_KEYS.sessionId);
      if (!storedSessionId) {
        storedSessionId = crypto.randomUUID();
        localStorage.setItem(ROSIE_STORAGE_KEYS.sessionId, storedSessionId);
      }
      setSessionId(storedSessionId);

      // Load persisted messages
      const storedMessages = localStorage.getItem(ROSIE_STORAGE_KEYS.chatHistory);
      if (storedMessages) {
        try {
          const parsed = JSON.parse(storedMessages);
          setMessages(parsed);
        } catch {
          // Invalid JSON, start fresh
        }
      }

      // Load message count
      const storedCount = localStorage.getItem(ROSIE_STORAGE_KEYS.messageCount);
      if (storedCount) {
        const count = parseInt(storedCount, 10);
        setMessageCount(count);
        if (!email && count >= ROSIE_CONFIG.maxMessages) {
          setLimitReached(true);
        }
      }
    }
  }, []);

  // Add welcome message if no messages exist
  useEffect(() => {
    if (messages.length === 0 && sessionId) {
      const welcomeMessage: ChatMessageType = {
        role: 'assistant',
        content: getWelcomeMessage(),
      };
      setMessages([welcomeMessage]);
    }
  }, [sessionId, messages.length]);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(ROSIE_STORAGE_KEYS.chatHistory, JSON.stringify(messages));
    }
  }, [messages]);

  // Persist message count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROSIE_STORAGE_KEYS.messageCount, messageCount.toString());
    }
  }, [messageCount]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || limitReached) return;

    const userMessage: ChatMessageType = {
      role: 'user',
      content: inputValue.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');

    // Increment message count
    const newCount = messageCount + 1;
    setMessageCount(newCount);

    // Check if limit reached (for non-waitlist users)
    if (!isOnWaitlist && newCount >= ROSIE_CONFIG.maxMessages) {
      setLimitReached(true);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          sessionId,
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setLimitReached(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  fullContent += data.text;
                  setStreamingContent(fullContent);
                }
              } catch {
                // Invalid JSON chunk, skip
              }
            }
          }
        }
      }

      // Add complete message
      const assistantMessage: ChatMessageType = {
        role: 'assistant',
        content: fullContent,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage: ChatMessageType = {
        role: 'assistant',
        content: "Oops! I had a little hiccup. Could you try that again?",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, limitReached, messages, messageCount, sessionId, isOnWaitlist]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:w-[400px] h-[85vh] sm:h-[600px] sm:max-h-[80vh] bg-tastelanc-surface border border-tastelanc-surface-light rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden sm:mr-4 sm:mb-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-tastelanc-surface-light bg-tastelanc-bg">
          {/* Rosie Video */}
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
            <video
              src="/images/rosie_dark_animated.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1">
            <h2 id="chat-title" className="text-white font-semibold">
              Chat with Rosie
            </h2>
            <p className="text-tastelanc-muted text-xs">
              Your Lancaster dining expert
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-tastelanc-muted hover:text-white hover:bg-tastelanc-surface-light rounded-full transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <ChatMessage
              message={{ role: 'assistant', content: streamingContent }}
              isStreaming
            />
          )}

          {/* Typing indicator */}
          {isLoading && !streamingContent && <TypingIndicator />}

          {/* Limit reached message */}
          {limitReached && !isOnWaitlist && (
            <div className="bg-tastelanc-card border border-lancaster-gold/30 rounded-xl p-4 text-center">
              <p className="text-white text-sm mb-2">
                Loving our chat?
              </p>
              <p className="text-gray-300 text-sm mb-4">
                Get unlimited Rosie + real-time happy hours, specials, and personalized recommendations in the TasteLanc app!
              </p>
              <Link
                href={ROSIE_CONFIG.redirectUrl}
                onClick={onClose}
                className="inline-flex items-center gap-2 bg-lancaster-gold hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Get the App - Early Access
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-tastelanc-surface-light bg-tastelanc-bg">
          {!limitReached || isOnWaitlist ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Rosie anything..."
                disabled={isLoading}
                className="flex-1 bg-tastelanc-card border border-tastelanc-surface-light rounded-xl px-4 py-3 text-white text-sm placeholder:text-tastelanc-muted focus:outline-none focus:ring-2 focus:ring-tastelanc-accent/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <p className="text-center text-tastelanc-muted text-sm">
              Sign up for early access to continue chatting with Rosie
            </p>
          )}

          {/* Message count indicator */}
          {!isOnWaitlist && !limitReached && (
            <p className="text-center text-tastelanc-muted text-xs mt-2">
              {ROSIE_CONFIG.maxMessages - messageCount} messages remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
