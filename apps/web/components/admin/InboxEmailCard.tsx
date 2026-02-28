'use client';

import { useState } from 'react';
import {
  Mail,
  MailOpen,
  Archive,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react';
import type { InboundEmail } from '@/lib/ai/expansion-types';

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  inquiry: { label: 'Inquiry', className: 'bg-blue-500/20 text-blue-400' },
  lead: { label: 'Lead', className: 'bg-green-500/20 text-green-400' },
  spam: { label: 'Spam', className: 'bg-red-500/20 text-red-400' },
  other: { label: 'Other', className: 'bg-gray-500/20 text-gray-400' },
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface InboxEmailCardProps {
  email: InboundEmail;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onCategoryChange: (id: string, category: string) => void;
}

export default function InboxEmailCard({
  email,
  onMarkRead,
  onArchive,
  onCategoryChange,
}: InboxEmailCardProps) {
  const [expanded, setExpanded] = useState(false);
  const category = CATEGORY_CONFIG[email.category] || CATEGORY_CONFIG.other;
  const hasAttachments = email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0;

  function handleExpand() {
    setExpanded(!expanded);
    if (!email.is_read) {
      onMarkRead(email.id);
    }
  }

  return (
    <div
      className={`bg-tastelanc-surface rounded-xl border transition-colors ${
        email.is_read
          ? 'border-tastelanc-surface-light'
          : 'border-tastelanc-accent/40'
      }`}
    >
      {/* Header row */}
      <button
        onClick={handleExpand}
        className="w-full p-4 text-left flex items-start gap-3"
      >
        <div className="mt-0.5 shrink-0">
          {email.is_read ? (
            <MailOpen className="w-4 h-4 text-gray-500" />
          ) : (
            <Mail className="w-4 h-4 text-tastelanc-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-medium truncate ${email.is_read ? 'text-gray-300' : 'text-white'}`}>
              {email.from_name || email.from_email}
            </span>
            {!email.is_read && (
              <span className="w-2 h-2 rounded-full bg-tastelanc-accent shrink-0" />
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${category.className}`}>
              {category.label}
            </span>
            {hasAttachments && (
              <Paperclip className="w-3 h-3 text-gray-500 shrink-0" />
            )}
          </div>

          <p className={`text-sm truncate ${email.is_read ? 'text-gray-400' : 'text-gray-200'}`}>
            {email.subject || '(no subject)'}
          </p>

          {!expanded && email.body_text && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {email.body_text.slice(0, 120)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500">{getRelativeTime(email.created_at)}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-tastelanc-surface-light pt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
            <span>From: <span className="text-gray-300">{email.from_email}</span></span>
            <span>To: <span className="text-gray-300">{email.to_email}</span></span>
            <span>{new Date(email.created_at).toLocaleString()}</span>
          </div>

          <div className="bg-tastelanc-surface-light rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap max-h-80 overflow-y-auto">
            {email.body_text || email.body_html || '(empty body)'}
          </div>

          {hasAttachments && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Attachments:</p>
              <div className="flex flex-wrap gap-2">
                {(email.attachments as Array<{ filename: string; size: number }>).map((att, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 bg-tastelanc-surface-light rounded text-xs text-gray-300">
                    <Paperclip className="w-3 h-3" />
                    {att.filename}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <select
              value={email.category}
              onChange={(e) => onCategoryChange(email.id, e.target.value)}
              className="px-2 py-1 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:border-tastelanc-accent"
            >
              <option value="inquiry">Inquiry</option>
              <option value="lead">Lead</option>
              <option value="spam">Spam</option>
              <option value="other">Other</option>
            </select>

            <button
              onClick={() => onArchive(email.id)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded transition-colors"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
