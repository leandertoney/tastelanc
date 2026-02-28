'use client';

import { useState, useEffect } from 'react';
import { BRAND } from '@/config/market';
import { Send, Mail, Bell, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PreviewData {
  emailRecipients: number;
  pushRecipients: number;
  email: { subject: string; headline: string; from: string };
  push: { title: string; message: string };
}

interface SendResult {
  success: boolean;
  emailsSent?: number;
  emailsFailed?: number;
  emailsTotal?: number;
  pushSent?: number;
  pushTotal?: number;
  message?: string;
}

export default function HiringAnnouncementPage() {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/hiring-announcement')
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => setError('Failed to load preview'))
      .finally(() => setLoading(false));
  }, []);

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/hiring-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(`Test email sent to ${testEmail}`);
      } else {
        setTestResult(`Error: ${data.error}`);
      }
    } catch {
      setTestResult('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendAll = async () => {
    setConfirmOpen(false);
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/hiring-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSendResult(data);
    } catch {
      setSendResult({ success: false, message: 'Failed to send announcement' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Hiring Announcement
        </h1>
        <p className="text-gray-400">
          Send the hiring announcement email and push notification to all
          subscribers and app users.
        </p>
      </div>

      {/* Recipient Counts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-tastelanc-card rounded-xl p-5 border border-tastelanc-surface-light">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-tastelanc-accent" />
            <h3 className="font-semibold text-white">Email Recipients</h3>
          </div>
          <p className="text-3xl font-bold text-white">
            {preview?.emailRecipients ?? 0}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            From: {preview?.email.from}
          </p>
        </div>
        <div className="bg-tastelanc-card rounded-xl p-5 border border-tastelanc-surface-light">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-5 h-5 text-lancaster-gold" />
            <h3 className="font-semibold text-white">Push Recipients</h3>
          </div>
          <p className="text-3xl font-bold text-white">
            {preview?.pushRecipients ?? 0}
          </p>
          <p className="text-sm text-gray-400 mt-1">All app users with tokens</p>
        </div>
      </div>

      {/* Email Preview */}
      <div className="bg-tastelanc-card rounded-xl border border-tastelanc-surface-light overflow-hidden">
        <div className="p-5 border-b border-tastelanc-surface-light">
          <h3 className="font-semibold text-white mb-1">Email Preview</h3>
          <p className="text-sm text-gray-400">
            Subject: {preview?.email.subject}
          </p>
        </div>
        <div className="p-5 bg-[#0D0D0D] space-y-4">
          <h2 className="text-2xl font-bold text-white">
            {preview?.email.headline}
          </h2>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            <p>
              We&apos;re growing! {BRAND.name} is looking for passionate,
              self-motivated people who love {BRAND.countyShort}&apos;s local food scene to
              join our team.
            </p>
            <p>We&apos;re currently hiring for:</p>
            <p className="font-semibold text-white">
              Restaurant Partnership Manager
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Commission-based role with uncapped earnings</li>
              <li>Flexible schedule, in-person in {BRAND.countyShort}, {BRAND.state}</li>
              <li>
                Build relationships with local restaurants and help them grow
              </li>
              <li>
                Be part of a fast-moving startup shaping how {BRAND.countyShort} discovers
                food
              </li>
            </ul>
            <p>
              This is a relationship-first role — not traditional sales. If
              you&apos;re a people person who loves local food and nightlife,
              this could be the perfect fit.
            </p>
            <p>
              Know someone who&apos;d be great? Share this with them!
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block bg-[#E63946] text-white font-semibold px-6 py-3 rounded-lg text-sm">
              View Open Positions &amp; Apply
            </span>
          </div>
        </div>
      </div>

      {/* Push Preview */}
      <div className="bg-tastelanc-card rounded-xl p-5 border border-tastelanc-surface-light">
        <h3 className="font-semibold text-white mb-3">Push Notification Preview</h3>
        <div className="bg-tastelanc-surface rounded-lg p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-tastelanc-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">
              {preview?.push.title}
            </p>
            <p className="text-gray-400 text-sm">{preview?.push.message}</p>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-tastelanc-card rounded-xl p-5 border border-tastelanc-surface-light">
        <h3 className="font-semibold text-white mb-3">Send Test Email</h3>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
          />
          <button
            onClick={handleSendTest}
            disabled={sendingTest || !testEmail}
            className="bg-tastelanc-surface-light hover:bg-gray-600 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            {sendingTest ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Test
          </button>
        </div>
        {testResult && (
          <p
            className={`mt-3 text-sm ${testResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}
          >
            {testResult}
          </p>
        )}
      </div>

      {/* Send Result */}
      {sendResult && (
        <div
          className={`rounded-xl p-5 border ${sendResult.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}
        >
          <div className="flex items-center gap-2 mb-3">
            {sendResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <h3
              className={`font-semibold ${sendResult.success ? 'text-green-400' : 'text-red-400'}`}
            >
              {sendResult.success
                ? 'Announcement Sent!'
                : 'Send Failed'}
            </h3>
          </div>
          {sendResult.success && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Emails Sent</p>
                <p className="text-white font-semibold">
                  {sendResult.emailsSent} / {sendResult.emailsTotal}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Push Sent</p>
                <p className="text-white font-semibold">
                  {sendResult.pushSent} / {sendResult.pushTotal}
                </p>
              </div>
              {(sendResult.emailsFailed ?? 0) > 0 && (
                <div>
                  <p className="text-red-400">Emails Failed</p>
                  <p className="text-red-300 font-semibold">
                    {sendResult.emailsFailed}
                  </p>
                </div>
              )}
            </div>
          )}
          {sendResult.message && !sendResult.success && (
            <p className="text-red-400 text-sm">{sendResult.message}</p>
          )}
        </div>
      )}

      {/* Send Button */}
      {!sendResult?.success && (
        <>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={sending}
            className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Announcement...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Announcement to Everyone
              </>
            )}
          </button>

          {/* Confirmation Dialog */}
          {confirmOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-tastelanc-card rounded-xl p-6 max-w-md w-full border border-tastelanc-surface-light">
                <h3 className="text-xl font-bold text-white mb-3">
                  Confirm Send
                </h3>
                <p className="text-gray-400 mb-6">
                  This will send the hiring announcement to{' '}
                  <span className="text-white font-semibold">
                    {preview?.emailRecipients} email subscribers
                  </span>{' '}
                  and{' '}
                  <span className="text-white font-semibold">
                    {preview?.pushRecipients} app users
                  </span>
                  . This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 bg-tastelanc-surface-light hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendAll}
                    className="flex-1 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Send Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
