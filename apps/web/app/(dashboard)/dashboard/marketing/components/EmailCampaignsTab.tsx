'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Send, Eye, Trash2, Loader2, X, Mail } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import UsageMeter from './UsageMeter';
import { useModal } from '@/components/dashboard/ModalProvider';

interface Campaign {
  id: string;
  subject: string;
  preview_text: string | null;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  status: string;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  sent_at: string | null;
  created_at: string;
}

interface EmailCampaignsTabProps {
  restaurantId: string;
  tierName: string | null;
}

const TIER_LIMITS: Record<string, number> = { premium: 4, elite: 8 };

export default function EmailCampaignsTab({ restaurantId, tierName }: EmailCampaignsTabProps) {
  const modal = useModal();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Composer state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const limit = TIER_LIMITS[tierName || ''] || 0;

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/marketing/email-campaigns?restaurant_id=${restaurantId}`);
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns);
        setMonthlyUsage(data.monthlyUsage);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const resetComposer = () => {
    setSubject('');
    setBody('');
    setPreviewText('');
    setCtaText('');
    setCtaUrl('');
    setEditingId(null);
    setShowComposer(false);
  };

  const handleSaveDraft = async () => {
    if (!subject || !body) return;
    setSaving(true);

    try {
      const payload = {
        subject,
        body,
        preview_text: previewText || null,
        cta_text: ctaText || null,
        cta_url: ctaUrl || null,
      };

      const url = editingId
        ? `/api/dashboard/marketing/email-campaigns/${editingId}?restaurant_id=${restaurantId}`
        : `/api/dashboard/marketing/email-campaigns?restaurant_id=${restaurantId}`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetComposer();
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Error saving campaign:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSend = async () => {
    if (!subject || !body) return;
    setSaving(true);

    try {
      const payload = {
        subject,
        body,
        preview_text: previewText || null,
        cta_text: ctaText || null,
        cta_url: ctaUrl || null,
      };

      const url = editingId
        ? `/api/dashboard/marketing/email-campaigns/${editingId}?restaurant_id=${restaurantId}`
        : `/api/dashboard/marketing/email-campaigns?restaurant_id=${restaurantId}`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        modal.alert({ type: 'error', text: 'Failed to save campaign' });
        return;
      }

      const data = await res.json();
      const campaignId = editingId || data.campaign?.id;
      if (!campaignId) {
        modal.alert({ type: 'error', text: 'Failed to save campaign' });
        return;
      }

      // Now trigger send flow
      resetComposer();
      await fetchCampaigns();
      await handleSend(campaignId);
    } catch (err) {
      console.error('Error saving campaign:', err);
      modal.alert({ type: 'error', text: 'Failed to save campaign' });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    const confirmed = await modal.confirm({
      title: 'Send Email Campaign',
      description: 'This will send your campaign to all active contacts. Unsubscribed contacts will be excluded.',
      details: campaign ? [{ label: 'Subject', value: campaign.subject }] : [],
      warning: 'This cannot be undone. Emails will be delivered immediately.',
      confirmLabel: 'Send Campaign',
    });
    if (!confirmed) return;

    setSending(id);
    try {
      const res = await fetch(
        `/api/dashboard/marketing/email-campaigns/${id}/send?restaurant_id=${restaurantId}`,
        { method: 'POST' }
      );
      const data = await res.json();

      if (res.ok) {
        modal.alert({ type: 'success', text: `Campaign sent to ${data.sent} contact${data.sent === 1 ? '' : 's'}!` });
        fetchCampaigns();
      } else {
        modal.alert({ type: 'error', text: data.error || 'Failed to send campaign' });
      }
    } catch (err) {
      console.error('Error sending campaign:', err);
      modal.alert({ type: 'error', text: 'Failed to send campaign. Please try again.' });
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await modal.confirm({
      title: 'Delete Draft Campaign',
      description: 'Are you sure you want to delete this draft? This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeleting(id);
    try {
      const res = await fetch(
        `/api/dashboard/marketing/email-campaigns/${id}?restaurant_id=${restaurantId}`,
        { method: 'DELETE' }
      );
      if (res.ok) fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
    } finally {
      setDeleting(null);
    }
  };

  const editCampaign = (c: Campaign) => {
    setEditingId(c.id);
    setSubject(c.subject);
    setBody(c.body);
    setPreviewText(c.preview_text || '');
    setCtaText(c.cta_text || '');
    setCtaUrl(c.cta_url || '');
    setShowComposer(true);
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-tastelanc-surface-light text-tastelanc-text-secondary',
      sending: 'bg-yellow-600 text-yellow-100',
      sent: 'bg-green-600 text-green-100',
      failed: 'bg-red-600 text-white',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${variants[status] || variants.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Usage Meter */}
      <UsageMeter used={monthlyUsage} limit={limit} label="Email campaigns this month" />

      {/* Composer */}
      {showComposer ? (
        <div className="bg-tastelanc-surface-light rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-tastelanc-text-primary font-medium">
              {editingId ? 'Edit Campaign' : 'New Campaign'}
            </h3>
            <button onClick={resetComposer} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tips */}
          <div className="bg-tastelanc-accent/10 border border-tastelanc-accent/20 rounded-lg px-4 py-3 text-xs text-tastelanc-text-muted space-y-1">
            <p className="font-medium text-tastelanc-accent">Tips for a great campaign:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Keep subject lines short and action-oriented (e.g. &quot;This Weekend: Live Music + Drink Specials&quot;)</li>
              <li>Write like you&apos;re talking to a regular — friendly and personal works best</li>
              <li>Add a button linking to your website, menu, or reservation page</li>
              <li>Emails are sent to all active contacts in your imported list</li>
            </ul>
          </div>

          <div>
            <label className="text-xs text-tastelanc-text-muted mb-1 block">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. This Friday: Half-Price Apps & Live Jazz"
              className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent"
            />
          </div>

          <div>
            <label className="text-xs text-tastelanc-text-muted mb-1 block">Preview Text</label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="e.g. Don't miss our biggest happy hour of the month (shown in inbox preview)"
              className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent"
            />
          </div>

          <div>
            <label className="text-xs text-tastelanc-text-muted mb-1 block">Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hey there!\n\nWe've got something special for you this weekend — join us Friday night for half-price appetizers, craft cocktail specials, and live jazz from 7–10pm.\n\nBring a friend and enjoy the vibe. See you there!"}
              rows={8}
              className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-tastelanc-text-muted mb-1 block">Button Text (optional)</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Reserve a Table"
                className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent"
              />
            </div>
            <div>
              <label className="text-xs text-tastelanc-text-muted mb-1 block">Button URL (optional)</label>
              <input
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="e.g. https://yourrestaurant.com/reservations"
                className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSaveAndSend}
              disabled={!subject || !body || saving || monthlyUsage >= limit}
              className="bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Now
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={!subject || !body || saving}
              className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-tastelanc-text-primary disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Draft
            </Button>
            <Button
              onClick={resetComposer}
              className="bg-transparent border border-tastelanc-border text-tastelanc-text-muted hover:text-tastelanc-text-primary"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowComposer(true)}
          disabled={monthlyUsage >= limit}
          className="bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-white disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-tastelanc-text-faint animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-3" />
          <p className="text-tastelanc-text-primary font-medium mb-1">No campaigns yet</p>
          <p className="text-tastelanc-text-muted text-sm max-w-md mx-auto">
            Create your first email campaign to reach your contact list. Promote events, specials, new menu items, or just stay top of mind.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-tastelanc-surface-light rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-tastelanc-text-primary font-medium text-sm truncate">{campaign.subject}</p>
                  {statusBadge(campaign.status)}
                </div>
                <div className="flex items-center gap-4 text-xs text-tastelanc-text-faint">
                  {campaign.status === 'sent' && (
                    <>
                      <span>Sent to {campaign.sent_count}</span>
                      <span>Opened {campaign.opened_count}</span>
                      <span>
                        {campaign.sent_at
                          ? new Date(campaign.sent_at).toLocaleDateString()
                          : ''}
                      </span>
                    </>
                  )}
                  {campaign.status === 'draft' && (
                    <span>
                      Created {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {campaign.status === 'draft' && (
                  <>
                    <button
                      onClick={() => editCampaign(campaign)}
                      className="text-tastelanc-text-muted hover:text-tastelanc-text-primary p-1"
                      title="Edit"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSend(campaign.id)}
                      disabled={sending === campaign.id || monthlyUsage >= limit}
                      className="text-tastelanc-accent hover:text-tastelanc-accent/80 p-1 disabled:opacity-50"
                      title="Send"
                    >
                      {sending === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      disabled={deleting === campaign.id}
                      className="text-tastelanc-text-muted hover:text-red-400 p-1"
                      title="Delete"
                    >
                      {deleting === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
                {campaign.status === 'sent' && (
                  <button
                    onClick={() => setPreviewId(campaign.id)}
                    className="text-tastelanc-text-muted hover:text-tastelanc-text-primary p-1"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900">Email Preview</h3>
              <button onClick={() => setPreviewId(null)} className="text-tastelanc-text-muted hover:text-tastelanc-text-faint">
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src={`/api/dashboard/marketing/email-campaigns/${previewId}/preview?restaurant_id=${restaurantId}`}
              className="w-full h-[60vh]"
              title="Email Preview"
            />
          </div>
        </div>
      )}

    </div>
  );
}
