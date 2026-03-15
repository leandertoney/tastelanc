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
  Wand2,
  Paperclip,
  FileEdit,
  Trash2,
  MailOpen,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import InboxEmailComposer from '@/components/sales/InboxEmailComposer';
import InboxSentView from '@/components/sales/InboxSentView';
import InboxDraftsView from '@/components/sales/InboxDraftsView';
import { SENDER_IDENTITIES, type SenderIdentity } from '@/config/sender-identities';
import { useFileAttachments } from '@/hooks/useFileAttachments';
import { EditableAttachmentChips, ReadonlyAttachmentChips } from '@/components/sales/AttachmentChips';
import { ALLOWED_EXTENSIONS } from '@/lib/types/attachments';

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
  body_html: string | null;
  headline: string | null;
  timestamp: string;
  lead_id: string | null;
  resend_id: string | null;
  is_read: boolean;
  delivery_status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  attachments?: Array<{ url?: string; filename: string; size: number; contentType?: string; content_type?: string }>;
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

/** Strip quoted reply content from an email, returning only the new message */
function stripQuotedReply(text: string): string {
  const lines = text.split('\n');
  const cutLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^On .+ wrote:$/i.test(line)) { cutLines.push(i); break; }
    if (/^-{2,}\s*(Forwarded|Original) Message/i.test(line)) { cutLines.push(i); break; }
    if (/^_{5,}/.test(line) || /^-{5,}$/.test(line)) { cutLines.push(i); break; }
    if (/^From:\s/.test(line) && i + 1 < lines.length && /^(Sent|Date):\s/.test(lines[i + 1].trim())) { cutLines.push(i); break; }
  }

  const result = cutLines.length > 0
    ? lines.slice(0, cutLines[0]).join('\n')
    : text;

  return result.replace(/(\n\s*>.*)+\s*$/, '').trim();
}

/** Extract just the reply text from an HTML email body */
function extractReplyFromHtml(html: string, plainText: string | null): string {
  if (plainText) return stripQuotedReply(plainText);

  const cleaned = html
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/<div class="gmail_quote"[\s\S]*$/gi, '')
    .replace(/<div id="(appendonsend|divRplyFwdMsg)"[\s\S]*$/gi, '')
    .replace(/<hr[\s/>][\s\S]*$/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  return stripQuotedReply(cleaned);
}

export default function AdminInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeInbox, setActiveInbox] = useState<'crm' | 'info'>('crm');
  const [activeView, setActiveView] = useState<'all' | 'unread' | 'sent' | 'drafts'>('all');

  // Tab unread counts
  const [crmUnreadCount, setCrmUnreadCount] = useState(0);
  const [infoUnreadCount, setInfoUnreadCount] = useState(0);

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

  // AI enhance for reply bar
  const [isImprovingReply, setIsImprovingReply] = useState(false);

  // Attachments for reply
  const {
    attachments: replyAttachments, isUploading: isUploadingAttachment,
    openFilePicker, removeAttachment, clearAttachments,
    fileInputRef, handleFileChange,
  } = useFileAttachments();

  const threadEndRef = useRef<HTMLDivElement>(null);

  // Multi-select
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isBulkActioning, setIsBulkActioning] = useState(false);

  const isAllSelected = conversations.length > 0 && selectedEmails.size === conversations.length;
  const hasSelection = selectedEmails.size > 0;

  const toggleSelect = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(conversations.map(c => c.counterparty_email)));
    }
  };

  const clearSelection = () => setSelectedEmails(new Set());

  const handleBulkAction = async (action: 'mark_read' | 'mark_unread' | 'delete') => {
    if (selectedEmails.size === 0) return;

    if (action === 'delete') {
      if (!confirm(`Delete ${selectedEmails.size} conversation${selectedEmails.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    }

    setIsBulkActioning(true);
    try {
      const res = await fetch('/api/sales/inbox/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          emails: Array.from(selectedEmails),
          inbox: activeInbox,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }

      const labels = { mark_read: 'Marked as read', mark_unread: 'Marked as unread', delete: 'Deleted' };
      toast.success(`${labels[action]} (${selectedEmails.size})`);

      if (action === 'mark_read') {
        setConversations(prev =>
          prev.map(c => selectedEmails.has(c.counterparty_email) ? { ...c, unread_count: 0 } : c)
        );
      } else if (action === 'mark_unread') {
        setConversations(prev =>
          prev.map(c => selectedEmails.has(c.counterparty_email) && c.unread_count === 0 ? { ...c, unread_count: 1 } : c)
        );
      } else if (action === 'delete') {
        setConversations(prev => prev.filter(c => !selectedEmails.has(c.counterparty_email)));
        if (selectedConvo && selectedEmails.has(selectedConvo.counterparty_email)) {
          setSelectedConvo(null);
        }
      }

      clearSelection();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsBulkActioning(false);
    }
  };

  // Fetch tab unread counts (every 30s)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/sales/inbox/unread-count');
        if (res.ok) {
          const data = await res.json();
          setCrmUnreadCount(data.crmCount || 0);
          setInfoUnreadCount(data.infoCount || 0);
        }
      } catch {
        // Ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch conversations from the sales inbox API (admins have access)
  const fetchConversations = async (retries = 2) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeView === 'unread') params.set('filter', 'unread');
      if (activeInbox === 'info') params.set('inbox', 'info');
      const res = await fetch(`/api/sales/inbox?${params}`);
      if (!res.ok) {
        if (res.status === 401 && retries > 0) {
          await new Promise(r => setTimeout(r, 1000));
          return fetchConversations(retries - 1);
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setConversations(data.conversations || []);
      if (data.userIdentity) {
        const found = SENDER_IDENTITIES.find(s => s.email === data.userIdentity.email);
        if (found) setSelectedSender(found);
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
      toast.error('Failed to load inbox');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'sent' || activeView === 'drafts') return;
    setIsLoading(true);
    setSelectedConvo(null);
    clearSelection();
    fetchConversations();
  }, [activeInbox, activeView]);

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

    const lastSubject = convo.last_message_subject || '';
    setReplySubject(lastSubject.startsWith('Re: ') ? lastSubject : `Re: ${lastSubject}`);
    setReplyHeadline('');
    setReplyBody('');
    clearAttachments();

    try {
      const threadParams = new URLSearchParams({ email: convo.counterparty_email });
      if (activeInbox === 'info') threadParams.set('inbox', 'info');
      const res = await fetch(`/api/sales/inbox/thread?${threadParams}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      const data = await res.json();
      setThreadMessages(data.messages || []);

      setConversations(prev =>
        prev.map(c =>
          c.counterparty_email === convo.counterparty_email ? { ...c, unread_count: 0 } : c
        )
      );

      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Error fetching thread:', error);
      toast.error('Failed to load conversation');
    } finally {
      setIsLoadingThread(false);
    }
  };

  // AI enhance reply body
  const handleImproveReply = async (instruction: string) => {
    if (!replyBody.trim()) {
      toast.error('Write some content first');
      return;
    }
    setIsImprovingReply(true);
    try {
      const res = await fetch('/api/sales/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'improve',
          content: replyBody,
          instruction,
          audienceType: 'b2b',
        }),
      });
      if (!res.ok) throw new Error('Failed to enhance');
      const data = await res.json();
      setReplyBody(data.improved);
      toast.success('Reply enhanced by AI');
    } catch {
      toast.error('Failed to enhance reply');
    } finally {
      setIsImprovingReply(false);
    }
  };

  // Send reply
  const handleSendReply = async () => {
    if (!selectedConvo || !replyBody.trim() || !replySubject.trim()) return;

    setIsSendingReply(true);
    try {
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
          ...(replyAttachments.length > 0 && { attachments: replyAttachments }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      toast.success('Reply sent');
      setReplyBody('');
      setReplyHeadline('');
      clearAttachments();

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
          <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary flex items-center gap-3">
            <Inbox className="w-8 h-8 text-tastelanc-accent" />
            Inbox
          </h1>
          <p className="text-tastelanc-text-muted mt-1">
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

      {/* Inbox tabs */}
      <div className="flex gap-1 mb-3 bg-tastelanc-surface rounded-lg p-1 w-fit">
        <button
          onClick={() => { setActiveInbox('crm'); setActiveView('all'); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeInbox === 'crm'
              ? 'bg-tastelanc-surface-light text-tastelanc-text-primary'
              : 'text-tastelanc-text-faint hover:text-tastelanc-text-secondary'
          }`}
        >
          <span className="flex items-center gap-1.5">
            CRM Inbox
            {crmUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500 text-white rounded-full min-w-[18px] text-center">
                {crmUnreadCount}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => { setActiveInbox('info'); setActiveView('all'); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeInbox === 'info'
              ? 'bg-tastelanc-surface-light text-tastelanc-text-primary'
              : 'text-tastelanc-text-faint hover:text-tastelanc-text-secondary'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            info@tastelanc.com
            {infoUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500 text-white rounded-full min-w-[18px] text-center">
                {infoUnreadCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Main content */}
      {activeView === 'sent' ? (
        <div className="h-[calc(100%-120px)]">
          <InboxSentView />
        </div>
      ) : activeView === 'drafts' ? (
        <div className="h-[calc(100%-120px)]">
          <InboxDraftsView isAdmin onDraftSent={() => fetchConversations()} />
        </div>
      ) : (
      <div className="flex gap-4 h-[calc(100%-120px)]">
        {/* Left: Conversation list */}
        <div className={`${selectedConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] md:min-w-[380px]`}>
          {/* Search + filters */}
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-3 mb-3">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div className="flex gap-1">
              {([
                { key: 'all' as const, label: 'All' },
                { key: 'unread' as const, label: 'Unread' },
                { key: 'sent' as const, label: 'Sent', icon: Send },
                { key: 'drafts' as const, label: 'Drafts', icon: FileEdit },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveView(tab.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeView === tab.key
                      ? 'bg-tastelanc-surface-light text-tastelanc-text-primary'
                      : 'text-tastelanc-text-faint hover:text-tastelanc-text-secondary'
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3 h-3" />}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Select all + bulk action toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg">
            <button
              onClick={toggleSelectAll}
              className="p-1 text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors"
              title={isAllSelected ? 'Deselect all' : 'Select all'}
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-tastelanc-accent" /> : <Square className="w-4 h-4" />}
            </button>
            <span className="text-xs text-tastelanc-text-muted">
              {hasSelection ? `${selectedEmails.size} selected` : 'Select all'}
            </span>
            <div className="flex-1" />
            {hasSelection && (
              isBulkActioning ? (
                <Loader2 className="w-4 h-4 animate-spin text-tastelanc-text-muted" />
              ) : (
                <>
                  <button
                    onClick={() => handleBulkAction('mark_read')}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded transition-colors"
                    title="Mark as read"
                  >
                    <MailOpen className="w-3.5 h-3.5" />
                    Read
                  </button>
                  <button
                    onClick={() => handleBulkAction('mark_unread')}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded transition-colors"
                    title="Mark as unread"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Unread
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={clearSelection}
                    className="p-1 text-tastelanc-text-faint hover:text-tastelanc-text-primary transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-8 text-center">
                <Mail className="w-10 h-10 text-tastelanc-text-faint mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-tastelanc-text-primary mb-1">No conversations</h3>
                <p className="text-xs text-tastelanc-text-muted">
                  {search ? 'Try a different search' : activeInbox === 'info' ? 'No emails to info@tastelanc.com yet' : 'Send your first email to get started'}
                </p>
              </div>
            ) : (
              conversations.map((convo) => {
                const isActive = selectedConvo?.counterparty_email === convo.counterparty_email;
                const isUnread = convo.unread_count > 0;
                const isChecked = selectedEmails.has(convo.counterparty_email);

                return (
                  <div
                    key={convo.counterparty_email}
                    className={`group relative flex items-start gap-0 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-tastelanc-accent/20 ring-1 ring-tastelanc-accent/30'
                        : isChecked
                        ? 'bg-tastelanc-accent/10'
                        : isUnread
                        ? 'bg-blue-500/5 hover:bg-blue-500/10'
                        : 'hover:bg-tastelanc-surface-light/50'
                    }`}
                  >
                    {/* Checkbox — always visible */}
                    <button
                      onClick={(e) => toggleSelect(convo.counterparty_email, e)}
                      className="flex-shrink-0 p-3 pb-0 pt-3.5"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-tastelanc-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-tastelanc-text-faint hover:text-tastelanc-text-muted" />
                      )}
                    </button>

                    {/* Conversation content */}
                    <button
                      onClick={() => openThread(convo)}
                      className="flex-1 text-left p-3 pl-0 min-w-0"
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
                            <span className={`text-sm truncate ${isUnread ? 'font-semibold text-tastelanc-text-primary' : 'text-tastelanc-text-secondary'}`}>
                              {convo.counterparty_name || convo.counterparty_email}
                            </span>
                            <span className="text-[10px] text-tastelanc-text-faint flex-shrink-0">
                              {formatRelativeDate(convo.last_message_at)}
                            </span>
                          </div>

                          {convo.last_message_subject && (
                            <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-tastelanc-text-secondary' : 'text-tastelanc-text-faint'}`}>
                              {convo.last_message_subject}
                            </p>
                          )}

                          <p className="text-xs text-tastelanc-text-faint truncate mt-0.5">
                            {convo.last_message_direction === 'sent' && (
                              <span className="text-tastelanc-text-faint">You: </span>
                            )}
                            {convo.last_message_snippet || 'No preview'}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            {convo.lead_business_name && (
                              <span className="text-[10px] bg-tastelanc-surface-light text-tastelanc-text-muted px-1.5 py-0.5 rounded">
                                {convo.lead_business_name}
                              </span>
                            )}
                            {convo.message_count > 1 && (
                              <span className="text-[10px] text-tastelanc-text-faint">
                                {convo.message_count} messages
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Thread detail */}
        <div className={`${selectedConvo ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
          {!selectedConvo ? (
            <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light flex-1 flex items-center justify-center">
              <div className="text-center">
                <Inbox className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-3" />
                <p className="text-tastelanc-text-faint text-sm">Select a conversation to view</p>
              </div>
            </div>
          ) : (
            <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light flex-1 flex flex-col overflow-hidden">
              {/* Thread header */}
              <div className="flex items-center gap-3 p-4 border-b border-tastelanc-surface-light">
                <button
                  onClick={() => setSelectedConvo(null)}
                  className="md:hidden p-1 text-tastelanc-text-muted hover:text-tastelanc-text-primary"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-tastelanc-text-primary truncate">
                    {selectedConvo.counterparty_name || selectedConvo.counterparty_email}
                  </h2>
                  {selectedConvo.counterparty_name && (
                    <p className="text-xs text-tastelanc-text-faint truncate">{selectedConvo.counterparty_email}</p>
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
                  <p className="text-center text-tastelanc-text-faint text-sm py-8">No messages yet</p>
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
                            <Mail className="w-3 h-3 text-tastelanc-text-muted" />
                          )}
                          <span className="text-[10px] text-tastelanc-text-faint">
                            {msg.direction === 'sent' ? msg.from_name || 'You' : msg.from_name || msg.from_email}
                          </span>
                          <span className="text-[10px] text-tastelanc-text-faint">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className="text-xs font-medium text-tastelanc-text-secondary mb-1">{msg.subject}</p>
                        )}
                        {(() => {
                          const cleanText = msg.direction === 'received'
                            ? extractReplyFromHtml(msg.body_html || '', msg.body_text)
                            : msg.body_text ? stripQuotedReply(msg.body_text) : '';
                          return cleanText ? (
                            <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.direction === 'received' ? 'text-tastelanc-text-primary' : 'text-tastelanc-text-secondary'}`}>
                              {cleanText}
                            </p>
                          ) : null;
                        })()}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <ReadonlyAttachmentChips attachments={msg.attachments} />
                        )}
                        {msg.direction === 'sent' && msg.delivery_status && (
                          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-white/5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              msg.delivery_status === 'opened' || msg.delivery_status === 'clicked'
                                ? 'bg-green-500/15 text-green-400'
                                : msg.delivery_status === 'delivered'
                                ? 'bg-blue-500/15 text-blue-400'
                                : msg.delivery_status === 'bounced'
                                ? 'bg-red-500/15 text-red-400'
                                : 'bg-tastelanc-surface-light/50 text-tastelanc-text-muted'
                            }`}>
                              {msg.delivery_status === 'opened' || msg.delivery_status === 'clicked' ? (
                                <><Check className="w-2.5 h-2.5" /> Opened{msg.opened_at ? ` ${formatRelativeDate(msg.opened_at)}` : ''}</>
                              ) : msg.delivery_status === 'delivered' ? (
                                <><Check className="w-2.5 h-2.5" /> Delivered</>
                              ) : msg.delivery_status === 'bounced' ? (
                                'Bounced'
                              ) : (
                                'Sent'
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply bar */}
              <div className="border-t border-tastelanc-surface-light p-3 space-y-2">
                {/* Sender dropdown (admin always sees this) */}
                <div className="relative">
                  <button
                    onClick={() => setSenderDropdownOpen(!senderDropdownOpen)}
                    className="flex items-center gap-1.5 text-xs text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors"
                  >
                    <span>From: {selectedSender.name} &lt;{selectedSender.email}&gt;</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${senderDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {senderDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-1 bg-tastelanc-surface border border-tastelanc-border rounded-lg overflow-hidden z-10 min-w-[280px]">
                      {SENDER_IDENTITIES.map((sender) => (
                        <button
                          key={sender.email}
                          onClick={() => { setSelectedSender(sender); setSenderDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                            selectedSender.email === sender.email
                              ? 'bg-blue-600/10 text-tastelanc-text-primary'
                              : 'text-tastelanc-text-secondary hover:bg-tastelanc-surface-light hover:text-tastelanc-text-primary'
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
                  className="w-full px-3 py-1.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded text-xs text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {/* Headline */}
                <input
                  type="text"
                  value={replyHeadline}
                  onChange={(e) => setReplyHeadline(e.target.value)}
                  placeholder="Headline (shown in email)..."
                  className="w-full px-3 py-1.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded text-xs text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {/* Body + send */}
                <div className="flex gap-2">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your reply..."
                    rows={2}
                    className="flex-1 px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleSendReply();
                      }
                    }}
                  />
                  <button
                    onClick={openFilePicker}
                    disabled={isUploadingAttachment}
                    className="px-2 py-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors self-end"
                    title="Attach files"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
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
                {/* Attachment chips */}
                <EditableAttachmentChips
                  attachments={replyAttachments}
                  onRemove={removeAttachment}
                  isUploading={isUploadingAttachment}
                />
                {/* AI enhance chips */}
                {replyBody.trim() && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {isImprovingReply ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-purple-400">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Enhancing...
                      </span>
                    ) : (
                      [
                        { label: 'Professional', instruction: 'Rewrite this to sound more professional and polished while keeping the core message.' },
                        { label: 'Friendly', instruction: 'Rewrite this to sound warmer and more approachable while keeping the core message.' },
                        { label: 'Concise', instruction: 'Make this shorter and more concise. Remove filler words.' },
                        { label: 'Expand', instruction: 'Expand with more detail and context while keeping a professional tone.' },
                        { label: 'Persuasive', instruction: 'Make this more compelling. Focus on value for the recipient.' },
                        { label: 'Fix Grammar', instruction: 'Fix grammar, spelling, and punctuation errors. Do not change tone.' },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => handleImproveReply(opt.instruction)}
                          className="flex items-center gap-0.5 px-2 py-0.5 bg-purple-600/10 text-purple-400 text-[10px] rounded-full hover:bg-purple-600/20 transition-colors"
                        >
                          <Wand2 className="w-2 h-2" />
                          {opt.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <InboxEmailComposer
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false);
            fetchConversations();
          }}
          isAdmin={true}
          defaultSender={selectedSender}
        />
      )}

      {/* Hidden file input for reply attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
