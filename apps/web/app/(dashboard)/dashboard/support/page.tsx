'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Mail, Send, CheckCircle, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import TypingIndicator from '@/components/chat/TypingIndicator';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const ROSE_WELCOME =
  "Hi, I'm Rose. I can help you navigate the dashboard, understand your subscription options, or walk you through any feature. What would you like to know?";

const SUBJECT_OPTIONS = [
  'General Question',
  'Bug Report',
  'Feature Request',
  'Billing',
  'Other',
];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SupportPage() {
  const { restaurant, restaurantId, isLoading: restaurantLoading } = useRestaurant();

  // — Rose chat state —
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: ROSE_WELCOME },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // — Contact form state —
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Init session ID
  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming || limitReached) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/dashboard/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId }),
      });

      if (response.status === 429) {
        setLimitReached(true);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              "You've reached the message limit for this session. For additional help, please use the contact form on the right.",
          },
        ]);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

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

      setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
      setStreamingContent('');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Something went wrong. Please try again or use the contact form.',
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [inputValue, isStreaming, limitReached, messages, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    setFile(selected);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message.trim() || !restaurantId) return;

    setIsSubmitting(true);
    try {
      let attachmentBase64: string | undefined;
      let attachmentName: string | undefined;

      if (file) {
        attachmentBase64 = await readFileAsBase64(file);
        attachmentName = file.name;
      }

      const response = await fetch('/api/dashboard/support-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          subject,
          message,
          attachmentBase64,
          attachmentName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send');
      }

      setSubmitted(true);
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubject('');
    setMessage('');
    setFile(null);
  };

  if (restaurantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-tastelanc-text-muted" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-tastelanc-text-muted text-sm">No restaurant selected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-tastelanc-text-primary">Help &amp; Support</h1>
        <p className="text-sm text-tastelanc-text-muted mt-1">
          Ask Rose anything about the dashboard, or send us a message directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── LEFT: Rose AI Chat ── */}
        <Card className="flex flex-col" style={{ height: 620 }}>
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-tastelanc-surface-light shrink-0">
            <div className="w-9 h-9 rounded-full bg-tastelanc-accent/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-tastelanc-accent" />
            </div>
            <div>
              <p className="font-semibold text-tastelanc-text-primary text-sm">Rose</p>
              <p className="text-xs text-tastelanc-text-muted">Dashboard assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-tastelanc-accent text-white rounded-br-sm'
                      : 'bg-tastelanc-surface text-tastelanc-text-primary rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Streaming bubble */}
            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-tastelanc-surface text-tastelanc-text-primary text-sm leading-relaxed">
                  {streamingContent}
                  <span className="inline-block w-0.5 h-3.5 bg-tastelanc-accent ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {isStreaming && !streamingContent && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="p-4 border-t border-tastelanc-surface-light shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={limitReached ? 'Message limit reached — use the contact form' : 'Ask about dashboard features...'}
                disabled={isStreaming || limitReached}
                className="flex-1 bg-tastelanc-bg border border-tastelanc-surface-light rounded-xl px-4 py-2.5 text-sm text-tastelanc-text-primary placeholder:text-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent/40 disabled:opacity-50"
              />
              <Button
                type="button"
                size="sm"
                onClick={sendMessage}
                disabled={!inputValue.trim() || isStreaming || limitReached}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* ── RIGHT: Contact Form ── */}
        <Card>
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-tastelanc-surface-light">
            <div className="w-9 h-9 rounded-full bg-tastelanc-accent/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-tastelanc-accent" />
            </div>
            <div>
              <p className="font-semibold text-tastelanc-text-primary text-sm">Contact Support</p>
              <p className="text-xs text-tastelanc-text-muted">We typically respond within 1 business day</p>
            </div>
          </div>

          <div className="p-4">
            {!submitted ? (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-xs font-medium text-tastelanc-text-muted mb-1.5 uppercase tracking-wide">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg px-3 py-2.5 text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent/40"
                  >
                    <option value="">Select a topic...</option>
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium text-tastelanc-text-muted mb-1.5 uppercase tracking-wide">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={7}
                    placeholder="Describe your question or issue in detail..."
                    className="w-full bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg px-3 py-2.5 text-sm text-tastelanc-text-primary placeholder:text-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent/40 resize-none"
                  />
                </div>

                {/* Screenshot upload */}
                <div>
                  <label className="block text-xs font-medium text-tastelanc-text-muted mb-1.5 uppercase tracking-wide">
                    Screenshot <span className="normal-case text-tastelanc-text-faint font-normal">(optional)</span>
                  </label>
                  {file ? (
                    <div className="flex items-center gap-2 border border-tastelanc-surface-light rounded-lg px-3 py-2.5">
                      <Paperclip className="w-4 h-4 text-tastelanc-text-muted shrink-0" />
                      <span className="text-sm text-tastelanc-text-primary flex-1 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-tastelanc-text-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center gap-2 border border-dashed border-tastelanc-surface-light rounded-lg px-3 py-2.5 hover:border-tastelanc-accent transition-colors">
                      <Paperclip className="w-4 h-4 text-tastelanc-text-muted" />
                      <span className="text-sm text-tastelanc-text-muted">Attach a screenshot (PNG, JPG, max 5MB)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!subject || !message.trim() || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-12 px-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-tastelanc-text-primary font-semibold mb-2">Message Sent</h3>
                <p className="text-tastelanc-text-muted text-sm mb-6">
                  We&apos;ve received your message and will respond to your account email within 1 business day.
                </p>
                <Button variant="outline" onClick={resetForm}>
                  Send Another Message
                </Button>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
