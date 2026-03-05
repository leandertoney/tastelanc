'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  Send,
  Check,
  ArrowLeft,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import Link from 'next/link';
import { ReadonlyAttachmentChips } from '@/components/sales/AttachmentChips';

interface SentEmail {
  id: string;
  recipient_email: string;
  subject: string | null;
  body_text: string | null;
  headline: string | null;
  sender_name: string;
  sender_email: string;
  sent_at: string;
  status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  lead_id: string | null;
  lead_business_name: string | null;
  attachments: Array<{ url?: string; filename: string; size: number; contentType?: string; content_type?: string }>;
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

function DeliveryBadge({ status, openedAt }: { status: string | null; openedAt: string | null }) {
  if (!status) return null;
  const isOpened = status === 'opened' || status === 'clicked';
  const isDelivered = status === 'delivered';
  const isBounced = status === 'bounced';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
      isOpened ? 'bg-green-500/15 text-green-400'
        : isDelivered ? 'bg-blue-500/15 text-blue-400'
        : isBounced ? 'bg-red-500/15 text-red-400'
        : 'bg-gray-500/15 text-gray-400'
    }`}>
      {isOpened ? (
        <><Check className="w-2.5 h-2.5" /> Opened{openedAt ? ` ${formatRelativeDate(openedAt)}` : ''}</>
      ) : isDelivered ? (
        <><Check className="w-2.5 h-2.5" /> Delivered</>
      ) : isBounced ? 'Bounced' : 'Sent'}
    </span>
  );
}

export default function InboxSentView() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  const fetchSent = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/sales/inbox/sent?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEmails(data.emails || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSent();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchSent(), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Sent email list */}
      <div className={`${selectedEmail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] md:min-w-[380px]`}>
        {/* Search */}
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sent emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
            </div>
          ) : emails.length === 0 ? (
            <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-8 text-center">
              <Send className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">No sent emails</h3>
              <p className="text-xs text-gray-400">
                {search ? 'Try a different search' : 'Sent emails will appear here'}
              </p>
            </div>
          ) : (
            emails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              return (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-tastelanc-accent/20 ring-1 ring-tastelanc-accent/30'
                      : 'hover:bg-tastelanc-surface-light/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="pt-1 w-3 flex-shrink-0">
                      <Send className="w-3 h-3 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-300 truncate">
                          To: {email.recipient_email}
                        </span>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">
                          {formatRelativeDate(email.sent_at)}
                        </span>
                      </div>
                      {email.subject && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{email.subject}</p>
                      )}
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {email.body_text?.substring(0, 100) || 'No preview'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <DeliveryBadge status={email.status} openedAt={email.opened_at} />
                        {email.lead_business_name && (
                          <span className="text-[10px] bg-tastelanc-surface-light text-gray-400 px-1.5 py-0.5 rounded">
                            {email.lead_business_name}
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

      {/* Right: Sent email detail */}
      <div className={`${selectedEmail ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {!selectedEmail ? (
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select a sent email to view</p>
            </div>
          </div>
        ) : (
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-tastelanc-surface-light">
              <button
                onClick={() => setSelectedEmail(null)}
                className="md:hidden p-1 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-white truncate">
                  {selectedEmail.subject || '(No subject)'}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  To: {selectedEmail.recipient_email}
                </p>
              </div>
              {selectedEmail.lead_id && (
                <Link
                  href={`/sales/leads/${selectedEmail.lead_id}`}
                  className="flex items-center gap-1 text-xs text-tastelanc-accent hover:text-tastelanc-accent-hover transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {selectedEmail.lead_business_name || 'View Lead'}
                </Link>
              )}
            </div>

            {/* Email detail */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Meta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">From:</span>
                    {selectedEmail.sender_name} &lt;{selectedEmail.sender_email}&gt;
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">To:</span>
                    {selectedEmail.recipient_email}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Date:</span>
                    {formatTimestamp(selectedEmail.sent_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-300">Status:</span>
                    <DeliveryBadge status={selectedEmail.status} openedAt={selectedEmail.opened_at} />
                    {selectedEmail.clicked_at && (
                      <span className="text-[10px] text-green-400">
                        Clicked {formatRelativeDate(selectedEmail.clicked_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject */}
                {selectedEmail.subject && (
                  <div className="border-t border-tastelanc-surface-light pt-3">
                    <h3 className="text-sm font-medium text-white">{selectedEmail.subject}</h3>
                  </div>
                )}

                {/* Body */}
                {selectedEmail.body_text && (
                  <div className="border-t border-tastelanc-surface-light pt-3">
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {selectedEmail.body_text}
                    </p>
                  </div>
                )}

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="border-t border-tastelanc-surface-light pt-3">
                    <ReadonlyAttachmentChips attachments={selectedEmail.attachments} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
