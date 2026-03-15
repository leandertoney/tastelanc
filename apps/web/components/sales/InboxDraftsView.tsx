'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  FileEdit,
  Trash2,
  ArrowLeft,
  Inbox,
} from 'lucide-react';
import InboxEmailComposer from '@/components/sales/InboxEmailComposer';
import type { SenderIdentity } from '@/config/sender-identities';

interface Draft {
  id: string;
  draft_type: 'new' | 'reply';
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string | null;
  headline: string | null;
  body: string | null;
  cta_text: string | null;
  cta_url: string | null;
  sender_email: string | null;
  sender_name: string | null;
  reply_to_email: string | null;
  in_reply_to_message_id: string | null;
  attachments: Array<{ url?: string; filename: string; size: number; contentType?: string; content_type?: string }>;
  inbox_type: string;
  created_at: string;
  updated_at: string;
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

interface InboxDraftsViewProps {
  isAdmin?: boolean;
  defaultSender?: SenderIdentity;
  onDraftSent?: () => void;
}

export default function InboxDraftsView({ isAdmin, defaultSender, onDraftSent }: InboxDraftsViewProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sales/inbox/drafts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    setDeletingId(draftId);
    try {
      const res = await fetch(`/api/sales/inbox/drafts/${draftId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      if (selectedDraft?.id === draftId) setSelectedDraft(null);
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleDraftSent = () => {
    // Delete the draft from list and close composer
    if (selectedDraft) {
      setDrafts(prev => prev.filter(d => d.id !== selectedDraft.id));
    }
    setSelectedDraft(null);
    onDraftSent?.();
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Draft list */}
      <div className={`${selectedDraft ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] md:min-w-[380px]`}>
        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-8 text-center">
              <FileEdit className="w-10 h-10 text-tastelanc-text-faint mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-tastelanc-text-primary mb-1">No drafts</h3>
              <p className="text-xs text-tastelanc-text-muted">
                Drafts are auto-saved when you compose or reply to emails
              </p>
            </div>
          ) : (
            drafts.map((draft) => {
              const isSelected = selectedDraft?.id === draft.id;
              return (
                <button
                  key={draft.id}
                  onClick={() => setSelectedDraft(draft)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-tastelanc-accent/20 ring-1 ring-tastelanc-accent/30'
                      : 'hover:bg-tastelanc-surface-light/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="pt-1 w-3 flex-shrink-0">
                      <FileEdit className="w-3 h-3 text-tastelanc-text-faint" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-tastelanc-text-secondary truncate">
                          {draft.recipient_email ? `To: ${draft.recipient_email}` : '(No recipient)'}
                        </span>
                        <span className="text-[10px] text-tastelanc-text-faint flex-shrink-0">
                          {formatRelativeDate(draft.updated_at)}
                        </span>
                      </div>
                      {draft.subject && (
                        <p className="text-xs text-tastelanc-text-faint truncate mt-0.5">{draft.subject}</p>
                      )}
                      <p className="text-xs text-tastelanc-text-faint truncate mt-0.5">
                        {draft.body?.substring(0, 100) || 'Empty draft'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          draft.draft_type === 'reply'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-tastelanc-surface-light text-tastelanc-text-muted'
                        }`}>
                          {draft.draft_type === 'reply' ? 'Reply' : 'New'}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, draft.id)}
                          disabled={deletingId === draft.id}
                          className="text-tastelanc-text-faint hover:text-red-400 transition-colors p-0.5"
                          title="Delete draft"
                        >
                          {deletingId === draft.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Draft editor */}
      <div className={`${selectedDraft ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {!selectedDraft ? (
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-3" />
              <p className="text-tastelanc-text-faint text-sm">Select a draft to continue editing</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedDraft(null)}
              className="md:hidden flex items-center gap-1 text-tastelanc-text-muted hover:text-tastelanc-text-primary mb-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to drafts
            </button>
            <div className="flex-1">
              <InboxEmailComposer
                key={selectedDraft.id}
                onClose={() => {
                  setSelectedDraft(null);
                  fetchDrafts();
                }}
                onSent={handleDraftSent}
                isAdmin={isAdmin}
                defaultSender={
                  selectedDraft.sender_email && selectedDraft.sender_name
                    ? { email: selectedDraft.sender_email, name: selectedDraft.sender_name, title: '', replyEmail: selectedDraft.reply_to_email || selectedDraft.sender_email } as SenderIdentity
                    : defaultSender
                }
                draftId={selectedDraft.id}
                initialDraft={{
                  recipientEmail: selectedDraft.recipient_email || '',
                  recipientName: selectedDraft.recipient_name || '',
                  subject: selectedDraft.subject || '',
                  body: selectedDraft.body || '',
                  attachments: selectedDraft.attachments || [],
                }}
                replyTo={selectedDraft.draft_type === 'reply' && selectedDraft.recipient_email ? {
                  recipientEmail: selectedDraft.recipient_email,
                  recipientName: selectedDraft.recipient_name || undefined,
                  subject: selectedDraft.subject || '',
                  inReplyToMessageId: selectedDraft.in_reply_to_message_id || undefined,
                } : undefined}
                embedded
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
