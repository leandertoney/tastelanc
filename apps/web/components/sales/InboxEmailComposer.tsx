'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Send,
  Loader2,
  ChevronDown,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { SENDER_IDENTITIES, type SenderIdentity } from '@/config/sender-identities';
import { toast } from 'sonner';

interface InboxEmailComposerProps {
  onClose: () => void;
  onSent: () => void;
  replyTo?: {
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    inReplyToMessageId?: string;
  };
}

type Step = 'compose' | 'confirm';

export default function InboxEmailComposer({ onClose, onSent, replyTo }: InboxEmailComposerProps) {
  const isReply = !!replyTo;
  const [step, setStep] = useState<Step>('compose');

  // Sender
  const [selectedSender, setSelectedSender] = useState<SenderIdentity>(SENDER_IDENTITIES[0]);
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);

  // Recipient
  const [recipientEmail, setRecipientEmail] = useState(replyTo?.recipientEmail || '');
  const [recipientName, setRecipientName] = useState(replyTo?.recipientName || '');

  // Email fields
  const [subject, setSubject] = useState(
    replyTo ? (replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`) : ''
  );
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  // Send
  const [isSending, setIsSending] = useState(false);

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

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/sales/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          recipientName: recipientName || undefined,
          subject,
          headline: headline || subject,
          emailBody: body,
          ctaText: ctaText || undefined,
          ctaUrl: ctaUrl || undefined,
          senderName: selectedSender.name,
          senderEmail: selectedSender.email,
          ...(replyTo?.inReplyToMessageId && {
            inReplyToMessageId: replyTo.inReplyToMessageId,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success(`Email sent to ${recipientEmail}`);
      onSent();
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const canSend = recipientEmail.trim() && subject.trim() && body.trim();

  // Confirm step
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-6">Confirm & Send</h2>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">From</span>
                <p className="text-sm text-white mt-1">
                  {selectedSender.name} &lt;{selectedSender.email}&gt;
                </p>
              </div>

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">To</span>
                <p className="text-sm text-white mt-1">
                  {recipientName ? `${recipientName} ` : ''}&lt;{recipientEmail}&gt;
                </p>
              </div>

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Subject</span>
                <p className="text-sm text-white mt-1">{subject}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Preview</span>
                <div className="mt-1 p-3 bg-tastelanc-bg rounded-lg text-sm text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {body.substring(0, 300)}{body.length > 300 ? '...' : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setStep('compose')}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSending ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compose step
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-tastelanc-surface-light">
          <h2 className="text-lg font-bold text-white">{isReply ? 'Reply' : 'Compose Email'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                To (Email) <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                disabled={isReply}
                className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Name <span className="text-gray-600">(optional)</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Contact name"
                disabled={isReply}
                className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Sender */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Send As</label>
            <div className="relative">
              <button
                onClick={() => setSenderDropdownOpen(!senderDropdownOpen)}
                className="w-full flex items-center justify-between p-3 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white hover:border-gray-600 transition-colors"
              >
                <span>
                  {selectedSender.name}
                  {selectedSender.title && <span className="text-gray-500"> — {selectedSender.title}</span>}
                  <span className="text-gray-600 ml-2">&lt;{selectedSender.email}&gt;</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${senderDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {senderDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-tastelanc-surface-light border border-gray-700 rounded-lg overflow-hidden z-10">
                  {SENDER_IDENTITIES.map((sender) => (
                    <button
                      key={sender.email}
                      onClick={() => { setSelectedSender(sender); setSenderDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                        selectedSender.email === sender.email
                          ? 'bg-blue-600/10 text-white'
                          : 'text-gray-300 hover:bg-tastelanc-bg hover:text-white'
                      }`}
                    >
                      <span>
                        {sender.name}
                        {sender.title && <span className="text-gray-500"> — {sender.title}</span>}
                        <span className="text-gray-600 ml-2">&lt;{sender.email}&gt;</span>
                      </span>
                      {selectedSender.email === sender.email && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
              className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Headline */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
              Headline <span className="text-gray-600">(shown in email header)</span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Main headline in email..."
              className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content..."
              rows={8}
              className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* CTA (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                CTA Text <span className="text-gray-600">(optional)</span>
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Schedule a Call"
                className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                CTA URL <span className="text-gray-600">(optional)</span>
              </label>
              <input
                type="text"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-tastelanc-surface-light">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setStep('confirm')}
            disabled={!canSend}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            Review & Send
          </button>
        </div>
      </div>
    </div>
  );
}
