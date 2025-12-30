'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Save,
  Mail,
  Users,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { PRE_BUILT_TEMPLATES } from '@/lib/email-templates/promotional-template';
import AIEmailComposer from '@/components/admin/AIEmailComposer';

interface RecipientCounts {
  all: number;
  unconverted: number;
  converted: number;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('https://tastelanc.com');
  const [segment, setSegment] = useState<'all' | 'unconverted' | 'converted'>('unconverted');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    const fetchRecipientCounts = async () => {
      try {
        const res = await fetch('/api/admin/email-campaigns');
        const data = await res.json();
        setRecipientCounts(data.recipientCounts || null);
      } catch (error) {
        console.error('Error fetching counts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecipientCounts();
  }, []);

  const loadTemplate = (templateKey: keyof typeof PRE_BUILT_TEMPLATES) => {
    const template = PRE_BUILT_TEMPLATES[templateKey];
    setName(template.name);
    setSubject(template.subject);
    setPreviewText(template.previewText);
    setHeadline(template.headline);
    setBody(template.body);
    setCtaText(template.ctaText);
    setCtaUrl(template.ctaUrl);
    setMessage({ type: 'success', text: `Loaded "${template.name}" template` });
    setTimeout(() => setMessage(null), 3000);
  };

  // Handle AI-generated email
  const handleUseAIEmail = (email: {
    subject: string;
    previewText: string;
    headline: string;
    body: string;
    ctaText?: string;
    ctaUrl?: string;
  }) => {
    setSubject(email.subject);
    setPreviewText(email.previewText);
    setHeadline(email.headline);
    setBody(email.body);
    setCtaText(email.ctaText || '');
    setCtaUrl(email.ctaUrl || '');
    // Auto-generate a name based on the subject
    if (!name) {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setName(`AI Campaign - ${today}`);
    }
    setMessage({ type: 'success', text: 'AI-generated email loaded!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveAsDraft = async () => {
    if (!name || !subject || !headline || !body) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          previewText,
          headline,
          body,
          ctaText,
          ctaUrl,
          segment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save campaign');
      }

      setMessage({ type: 'success', text: 'Campaign saved as draft!' });
      setTimeout(() => {
        router.push(`/admin/email-campaigns/${data.campaign.id}`);
      }, 1000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !subject || !headline || !body) {
      setMessage({ type: 'error', text: 'Please fill in the email content and test email address' });
      return;
    }

    setIsTesting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/email-campaigns/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail,
          subject,
          previewText,
          headline,
          body,
          ctaText,
          ctaUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test');
      }

      setMessage({ type: 'success', text: `Test email sent to ${testEmail}!` });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send test',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendNow = async () => {
    if (!name || !subject || !headline || !body) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const recipientCount = recipientCounts?.[segment] || 0;
    if (recipientCount === 0) {
      setMessage({ type: 'error', text: 'No recipients in this segment' });
      return;
    }

    if (!confirm(`Send this campaign to ${recipientCount} recipients?`)) {
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      // First save the campaign
      const createRes = await fetch('/api/admin/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          previewText,
          headline,
          body,
          ctaText,
          ctaUrl,
          segment,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create campaign');
      }

      // Then send it
      const sendRes = await fetch('/api/admin/email-campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: createData.campaign.id,
        }),
      });

      const sendData = await sendRes.json();

      if (!sendRes.ok) {
        throw new Error(sendData.error || 'Failed to send campaign');
      }

      setMessage({
        type: 'success',
        text: `Campaign sent to ${sendData.totalSent} recipients!`,
      });
      setTimeout(() => {
        router.push(`/admin/email-campaigns/${createData.campaign.id}`);
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/email-campaigns"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">New Campaign</h1>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* AI Email Generator */}
      <AIEmailComposer
        audienceType="consumer"
        onUseEmail={handleUseAIEmail}
        className="mb-6"
      />

      {/* Pre-built Templates */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-lancaster-gold" />
          <h2 className="text-lg font-semibold text-white">Quick Start Templates</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <button
            onClick={() => loadTemplate('anticipation')}
            className="p-4 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg text-left transition-colors"
          >
            <p className="font-semibold text-white mb-1">We're Almost Ready!</p>
            <p className="text-xs text-gray-400">Build anticipation for launch</p>
          </button>
          <button
            onClick={() => loadTemplate('benefits')}
            className="p-4 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg text-left transition-colors"
          >
            <p className="font-semibold text-white mb-1">Early Access Perks</p>
            <p className="text-xs text-gray-400">Remind them of their benefits</p>
          </button>
          <button
            onClick={() => loadTemplate('urgency')}
            className="p-4 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg text-left transition-colors"
          >
            <p className="font-semibold text-white mb-1">Don't Miss Out</p>
            <p className="text-xs text-gray-400">Create urgency before deadline</p>
          </button>
          <button
            onClick={() => loadTemplate('feedbackRoast')}
            className="p-4 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg text-left transition-colors"
          >
            <p className="font-semibold text-white mb-1">Request Feedback</p>
            <p className="text-xs text-gray-400">Ask testers to roast the app</p>
          </button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-tastelanc-accent" />
            Email Content
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Internal name (e.g., 'December Launch Announcement')"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line recipients will see"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Preview Text
              </label>
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Text shown in inbox preview (optional)"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>

            <hr className="border-tastelanc-surface-light" />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Headline *
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Main headline in the email"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Main content of your email. Use blank lines for paragraphs."
                rows={8}
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g., 'Learn More'"
                  className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  CTA Button URL
                </label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://tastelanc.com"
                  className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Segment Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-tastelanc-accent" />
              Recipients
            </h3>
            <div className="space-y-2">
              {(['unconverted', 'all', 'converted'] as const).map((seg) => (
                <label
                  key={seg}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    segment === seg
                      ? 'bg-tastelanc-accent/20 border border-tastelanc-accent'
                      : 'bg-tastelanc-surface-light hover:bg-tastelanc-surface border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="segment"
                      value={seg}
                      checked={segment === seg}
                      onChange={() => setSegment(seg)}
                      className="w-4 h-4 accent-tastelanc-accent"
                    />
                    <span className="text-white capitalize">
                      {seg === 'unconverted' ? 'Unconverted Only' : seg === 'all' ? 'All Waitlist' : 'Converted Only'}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {isLoading ? '...' : recipientCounts?.[seg] || 0}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Test Email */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Send Test Email</h3>
            <div className="space-y-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent text-sm"
              />
              <button
                onClick={handleSendTest}
                disabled={isTesting || !testEmail}
                className="w-full bg-tastelanc-surface-light hover:bg-tastelanc-surface disabled:opacity-50 text-white py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Test
                  </>
                )}
              </button>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <div className="space-y-3">
              <button
                onClick={handleSaveAsDraft}
                disabled={isSaving}
                className="w-full bg-tastelanc-surface-light hover:bg-tastelanc-surface disabled:opacity-50 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save as Draft
                  </>
                )}
              </button>
              <button
                onClick={handleSendNow}
                disabled={isSending || (recipientCounts?.[segment] || 0) === 0}
                className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send to {recipientCounts?.[segment] || 0} Recipients
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
