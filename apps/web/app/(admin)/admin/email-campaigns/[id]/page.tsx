'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Send,
  Eye,
  MousePointer,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  TestTube,
  RefreshCw,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  preview_text: string;
  headline: string;
  body: string;
  cta_text: string;
  cta_url: string;
  segment: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailSend {
  id: string;
  recipient_email: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sends, setSends] = useState<EmailSend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/admin/email-campaigns/${params.id}`);
      if (!res.ok) {
        router.push('/admin/email-campaigns');
        return;
      }
      const data = await res.json();
      setCampaign(data.campaign);
      setSends(data.sends || []);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      router.push('/admin/email-campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  const handleSendTest = async () => {
    if (!testEmail) return;

    setIsTestingSend(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/email-campaigns/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign?.id,
          email: testEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTestResult({ success: true, message: 'Test email sent successfully!' });
        setTimeout(() => {
          setShowTestModal(false);
          setTestResult(null);
          setTestEmail('');
        }, 2000);
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'An error occurred' });
    } finally {
      setIsTestingSend(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaign || campaign.status !== 'draft') return;

    if (!confirm(`Are you sure you want to send this campaign to ${campaign.total_recipients} recipients?`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/admin/email-campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({
          success: true,
          message: `Campaign sent! ${data.sent} emails delivered.`,
        });
        // Refresh campaign data
        fetchCampaign();
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send campaign' });
      }
    } catch (error) {
      setSendResult({ success: false, message: 'An error occurred' });
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="accent" className="bg-green-500/20 text-green-400">Sent</Badge>;
      case 'sending':
        return <Badge variant="accent" className="bg-yellow-500/20 text-yellow-400">Sending</Badge>;
      case 'draft':
      default:
        return <Badge variant="default">Draft</Badge>;
    }
  };

  const getSendStatusBadge = (send: EmailSend) => {
    if (send.bounced_at) {
      return <span className="text-red-400 text-xs">Bounced</span>;
    }
    if (send.clicked_at) {
      return <span className="text-green-400 text-xs">Clicked</span>;
    }
    if (send.opened_at) {
      return <span className="text-purple-400 text-xs">Opened</span>;
    }
    if (send.status === 'delivered') {
      return <span className="text-blue-400 text-xs">Delivered</span>;
    }
    return <span className="text-gray-400 text-xs">Sent</span>;
  };

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'all':
        return 'All Waitlist';
      case 'unconverted':
        return 'Unconverted';
      case 'converted':
        return 'Converted';
      default:
        return segment;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Campaign not found</p>
        <Link href="/admin/email-campaigns" className="text-tastelanc-accent hover:underline mt-2 inline-block">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const openRate = campaign.total_sent > 0
    ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1)
    : '0';
  const clickRate = campaign.total_sent > 0
    ? ((campaign.total_clicked / campaign.total_sent) * 100).toFixed(1)
    : '0';
  const bounceRate = campaign.total_sent > 0
    ? ((campaign.total_bounced / campaign.total_sent) * 100).toFixed(1)
    : '0';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/email-campaigns"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-gray-400 text-sm">{campaign.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestModal(true)}
              className="inline-flex items-center gap-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              Send Test
            </button>
            {campaign.status === 'draft' && (
              <button
                onClick={handleSendCampaign}
                disabled={isSending || campaign.total_recipients === 0}
                className="inline-flex items-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Campaign
                  </>
                )}
              </button>
            )}
            {campaign.status === 'sent' && (
              <button
                onClick={fetchCampaign}
                className="inline-flex items-center gap-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Stats
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Send Result Message */}
      {sendResult && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            sendResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {sendResult.success ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {sendResult.message}
        </div>
      )}

      {/* Stats Cards (for sent campaigns) */}
      {campaign.status === 'sent' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.total_sent}</p>
                <p className="text-xs text-gray-500">Sent</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.total_opened}</p>
                <p className="text-xs text-gray-500">Opened ({openRate}%)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.total_clicked}</p>
                <p className="text-xs text-gray-500">Clicked ({clickRate}%)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.total_bounced}</p>
                <p className="text-xs text-gray-500">Bounced ({bounceRate}%)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.total_recipients}</p>
                <p className="text-xs text-gray-500">Recipients</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Campaign Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-tastelanc-accent" />
            Campaign Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Segment</dt>
              <dd className="text-white">{getSegmentLabel(campaign.segment)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Recipients</dt>
              <dd className="text-white">{campaign.total_recipients}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Created</dt>
              <dd className="text-white">{formatDate(campaign.created_at)}</dd>
            </div>
            {campaign.sent_at && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Sent</dt>
                <dd className="text-white">{formatDate(campaign.sent_at)}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Email Preview */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Email Preview</h2>
          <div className="bg-[#1A1A1A] rounded-lg p-4 space-y-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Subject</p>
              <p className="text-white font-medium">{campaign.subject}</p>
            </div>
            {campaign.preview_text && (
              <div>
                <p className="text-gray-500 text-xs mb-1">Preview</p>
                <p className="text-gray-400">{campaign.preview_text}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs mb-1">Headline</p>
              <p className="text-white font-semibold">{campaign.headline}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Body</p>
              <p className="text-gray-300 whitespace-pre-wrap">{campaign.body}</p>
            </div>
            {campaign.cta_text && (
              <div>
                <p className="text-gray-500 text-xs mb-1">CTA</p>
                <a
                  href={campaign.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-tastelanc-accent hover:underline"
                >
                  {campaign.cta_text}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Send History */}
      {sends.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-tastelanc-accent" />
            Send History ({sends.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-tastelanc-surface-light">
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Sent</th>
                  <th className="pb-3 font-medium">Opened</th>
                  <th className="pb-3 font-medium">Clicked</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {sends.slice(0, 50).map((send) => (
                  <tr key={send.id} className="border-b border-tastelanc-surface-light/50">
                    <td className="py-3 pr-4">
                      <span className="truncate max-w-[200px] block">{send.recipient_email}</span>
                    </td>
                    <td className="py-3 pr-4">{getSendStatusBadge(send)}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{formatDate(send.sent_at)}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{formatDate(send.opened_at)}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{formatDate(send.clicked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sends.length > 50 && (
              <p className="text-gray-500 text-sm mt-4 text-center">
                Showing 50 of {sends.length} recipients
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Draft state - no sends yet */}
      {campaign.status === 'draft' && sends.length === 0 && (
        <Card className="p-12 text-center">
          <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Ready to send</h3>
          <p className="text-gray-400 mb-6">
            This campaign will be sent to {campaign.total_recipients} recipients in the{' '}
            {getSegmentLabel(campaign.segment).toLowerCase()} segment.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowTestModal(true)}
              className="inline-flex items-center gap-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white px-6 py-3 rounded-lg transition-colors"
            >
              <TestTube className="w-5 h-5" />
              Send Test First
            </button>
            <button
              onClick={handleSendCampaign}
              disabled={isSending || campaign.total_recipients === 0}
              className="inline-flex items-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Campaign
                </>
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-tastelanc-surface rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Send Test Email</h3>
            <p className="text-gray-400 text-sm mb-4">
              Send a test version of this email to preview how it looks.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-tastelanc-accent mb-4"
            />
            {testResult && (
              <div
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {testResult.message}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                  setTestEmail('');
                }}
                className="flex-1 px-4 py-3 bg-tastelanc-surface-light hover:bg-tastelanc-bg text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={isTestingSend || !testEmail}
                className="flex-1 px-4 py-3 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                {isTestingSend ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
