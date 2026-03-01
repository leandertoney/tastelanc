'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Search,
  Loader2,
  Mail,
  Send,
  ArrowLeft,
  ExternalLink,
  Plus,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { toast } from 'sonner';
import InboxEmailComposer from '@/components/sales/InboxEmailComposer';
import { SENDER_IDENTITIES, type SenderIdentity } from '@/config/sender-identities';

interface Conversation {
  counterparty_email: string;
  counterparty_name: string | null;
  last_message_at: string;
  last_message_snippet: string | null;
  last_message_subject: string | null;
  last_message_direction: 'sent' | 'received';
  unread_count: number;
  lead_id: string | null;
  lead_business_name: string | null;
  message_count: number;
}

interface ThreadMessage {
  id: string;
  direction: 'sent' | 'received';
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  headline: string | null;
  timestamp: string;
  lead_id: string | null;
  resend_id: string | null;
  is_read: boolean;
}

function formatRelativeDate(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Thread view
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Compose
  const [showCompose, setShowCompose] = useState(false);

  // Reply
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyHeadline, setReplyHeadline] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [selectedSender, setSelectedSender] = useState<SenderIdentity>(SENDER_IDENTITIES[0]);
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  // Load sender preference
  useEffect(() => {
    const fetchPref = async () => {
      try {
        const res = await fetch('/api/sales/sender-preference');
        if (res.ok) {
          const data = await res.json();
          if (data.preferredSenderEmail) {
            const found = SENDER_IDENTITIES.find(s => s.email === data.preferredSenderEmail);
            if (found) setSelectedSender(found);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchPref();
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('filter', filter);
      const res = await fetch(`/api/sales/inbox?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching inbox:', error);
      toast.error('Failed to load inbox');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchConversations();
  }, [filter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchConversations();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch thread
  const openThread = async (convo: Conversation) => {
    setSelectedConvo(convo);
    setIsLoadingThread(true);
    setThreadMessages([]);

    // Pre-fill reply subject
    const lastSubject = convo.last_message_subject || '';
    setReplySubject(lastSubject.startsWith('Re: ') ? lastSubject : `Re: ${lastSubject}`);
    setReplyHeadline('');
    setReplyBody('');

    try {
      const res = await fetch(`/api/sales/inbox/thread?email=${encodeURIComponent(convo.counterparty_email)}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      const data = await res.json();
      setThreadMessages(data.messages || []);

      // Clear unread count locally
      setConversations(prev =>
        prev.map(c =>
          c.counterparty_email === convo.counterparty_email ? { ...c, unread_count: 0 } : c
        )
      );

      // Scroll to bottom after render
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Error fetching thread:', error);
      toast.error('Failed to load conversation');
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Send reply
  const handleSendReply = async () => {
    if (!selectedConvo || !replyBody.trim() || !replySubject.trim()) return;

    setIsSendingReply(true);
    try {
      // Find the last sent message to get threading info
      const lastSent = [...threadMessages].reverse().find(m => m.direction === 'sent');

      const res = await fetch('/api/sales/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: selectedConvo.counterparty_email,
          recipientName: selectedConvo.counterparty_name,
          subject: replySubject,
          headline: replyHeadline || replySubject,
          emailBody: replyBody,
          senderName: selectedSender.name,
          senderEmail: selectedSender.email,
          ...(lastSent?.resend_id && {
            inReplyToMessageId: lastSent.resend_id,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      toast.success('Reply sent');
      setReplyBody('');
      setReplyHeadline('');

      // Refresh thread
      openThread(selectedConvo);
      fetchConversations();
    } catch (error) {
      console.error('Send reply error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Inbox className="w-8 h-8 text-tastelanc-accent" />
            Inbox
          </h1>
          <p className="text-gray-400 mt-1">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            {totalUnread > 0 && <span className="text-blue-400 ml-2">{totalUnread} unread</span>}
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Compose
        </button>
      </div>

      {/* Main content */}
      <div className="flex gap-4 h-[calc(100%-80px)]">
        {/* Left: Conversation list */}
        <div className={`${selectedConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] md:min-w-[380px]`}>
          {/* Search + filters */}
          <Card className="p-3 mb-3">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'unread'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-tastelanc-surface-light text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f === 'all' ? 'All' : 'Unread'}
                </button>
              ))}
            </div>
          </Card>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
              </div>
            ) : conversations.length === 0 ? (
              <Card className="p-8 text-center">
                <Mail className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">No conversations</h3>
                <p className="text-xs text-gray-400">
                  {search ? 'Try a different search' : 'Send your first email to get started'}
                </p>
              </Card>
            ) : (
              conversations.map((convo) => {
                const isSelected = selectedConvo?.counterparty_email === convo.counterparty_email;
                const isUnread = convo.unread_count > 0;

                return (
                  <button
                    key={convo.counterparty_email}
                    onClick={() => openThread(convo)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-tastelanc-accent/20 ring-1 ring-tastelanc-accent/30'
                        : isUnread
                        ? 'bg-blue-500/5 hover:bg-blue-500/10'
                        : 'hover:bg-tastelanc-surface-light/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Unread dot */}
                      <div className="pt-1.5 w-3 flex-shrink-0">
                        {isUnread && (
                          <span className="block w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'text-gray-300'}`}>
                            {convo.counterparty_name || convo.counterparty_email}
                          </span>
                          <span className="text-[10px] text-gray-500 flex-shrink-0">
                            {formatRelativeDate(convo.last_message_at)}
                          </span>
                        </div>

                        {convo.last_message_subject && (
                          <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-gray-300' : 'text-gray-500'}`}>
                            {convo.last_message_subject}
                          </p>
                        )}

                        <p className="text-xs text-gray-600 truncate mt-0.5">
                          {convo.last_message_direction === 'sent' && (
                            <span className="text-gray-500">You: </span>
                          )}
                          {convo.last_message_snippet || 'No preview'}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          {convo.lead_business_name && (
                            <span className="text-[10px] bg-tastelanc-surface-light text-gray-400 px-1.5 py-0.5 rounded">
                              {convo.lead_business_name}
                            </span>
                          )}
                          {convo.message_count > 1 && (
                            <span className="text-[10px] text-gray-600">
                              {convo.message_count} messages
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Thread detail */}
        <div className={`${selectedConvo ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
          {!selectedConvo ? (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a conversation to view</p>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col overflow-hidden">
              {/* Thread header */}
              <div className="flex items-center gap-3 p-4 border-b border-tastelanc-surface-light">
                <button
                  onClick={() => setSelectedConvo(null)}
                  className="md:hidden p-1 text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">
                    {selectedConvo.counterparty_name || selectedConvo.counterparty_email}
                  </h2>
                  {selectedConvo.counterparty_name && (
                    <p className="text-xs text-gray-500 truncate">{selectedConvo.counterparty_email}</p>
                  )}
                </div>
                {selectedConvo.lead_id && (
                  <Link
                    href={`/sales/leads/${selectedConvo.lead_id}`}
                    className="flex items-center gap-1 text-xs text-tastelanc-accent hover:text-tastelanc-accent-hover transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {selectedConvo.lead_business_name || 'View Lead'}
                  </Link>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingThread ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
                  </div>
                ) : threadMessages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No messages yet</p>
                ) : (
                  threadMessages.map((msg) => (
                    <div
                      key={`${msg.direction}-${msg.id}`}
                      className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          msg.direction === 'sent'
                            ? 'bg-blue-600/20 border border-blue-500/20'
                            : 'bg-tastelanc-surface-light border border-tastelanc-surface-light'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.direction === 'sent' ? (
                            <Send className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Mail className="w-3 h-3 text-gray-400" />
                          )}
                          <span className="text-[10px] text-gray-500">
                            {msg.direction === 'sent' ? msg.from_name || 'You' : msg.from_name || msg.from_email}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className="text-xs font-medium text-gray-300 mb-1">{msg.subject}</p>
                        )}
                        {msg.body_text && (
                          <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {msg.body_text}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply bar */}
              <div className="border-t border-tastelanc-surface-light p-3 space-y-2">
                {/* Sender selector */}
                <div className="relative">
                  <button
                    onClick={() => setSenderDropdownOpen(!senderDropdownOpen)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <span>From: {selectedSender.name} &lt;{selectedSender.email}&gt;</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${senderDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {senderDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-1 bg-tastelanc-surface border border-gray-700 rounded-lg overflow-hidden z-10 min-w-[280px]">
                      {SENDER_IDENTITIES.map((sender) => (
                        <button
                          key={sender.email}
                          onClick={() => { setSelectedSender(sender); setSenderDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                            selectedSender.email === sender.email
                              ? 'bg-blue-600/10 text-white'
                              : 'text-gray-300 hover:bg-tastelanc-surface-light hover:text-white'
                          }`}
                        >
                          <span>{sender.name} &lt;{sender.email}&gt;</span>
                          {selectedSender.email === sender.email && <Check className="w-3 h-3 text-blue-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Subject..."
                  className="w-full px-3 py-1.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {/* Headline */}
                <input
                  type="text"
                  value={replyHeadline}
                  onChange={(e) => setReplyHeadline(e.target.value)}
                  placeholder="Headline (shown in email)..."
                  className="w-full px-3 py-1.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {/* Body + send */}
                <div className="flex gap-2">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your reply..."
                    rows={2}
                    className="flex-1 px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleSendReply();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={isSendingReply || !replyBody.trim() || !replySubject.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors self-end"
                    title="Send (Cmd+Enter)"
                  >
                    {isSendingReply ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <InboxEmailComposer
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
}
