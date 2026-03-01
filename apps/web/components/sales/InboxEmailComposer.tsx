'use client';

import { useState } from 'react';
import {
  X,
  Send,
  Loader2,
  ChevronDown,
  Check,
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Wand2,
} from 'lucide-react';
import { SENDER_IDENTITIES, type SenderIdentity } from '@/config/sender-identities';
import { toast } from 'sonner';

interface InboxEmailComposerProps {
  onClose: () => void;
  onSent: () => void;
  isAdmin?: boolean;
  defaultSender?: SenderIdentity;
  replyTo?: {
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    inReplyToMessageId?: string;
  };
}

type Step = 'compose' | 'confirm';

const AI_IMPROVE_OPTIONS = [
  { key: 'professional', label: 'More Professional', instruction: 'Rewrite this email to sound more professional and polished while keeping the core message.' },
  { key: 'friendly', label: 'More Friendly', instruction: 'Rewrite this email to sound warmer, friendlier, and more approachable while keeping the core message.' },
  { key: 'concise', label: 'More Concise', instruction: 'Make this email shorter and more concise. Remove filler words and get to the point faster.' },
  { key: 'expand', label: 'Expand', instruction: 'Expand on this email with more detail, context, and supporting points while keeping a professional tone.' },
  { key: 'persuasive', label: 'More Persuasive', instruction: 'Make this email more persuasive and compelling. Focus on the value proposition and benefits for the recipient.' },
  { key: 'grammar', label: 'Fix Grammar', instruction: 'Fix any grammar, spelling, or punctuation errors in this email. Do not change the tone or meaning.' },
] as const;

export default function InboxEmailComposer({ onClose, onSent, isAdmin, defaultSender, replyTo }: InboxEmailComposerProps) {
  const isReply = !!replyTo;
  const [step, setStep] = useState<Step>('compose');

  // Sender — non-admins are locked to their own identity
  const [selectedSender, setSelectedSender] = useState<SenderIdentity>(defaultSender || SENDER_IDENTITIES[0]);
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

  // AI
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isGeneratingSubjects, setIsGeneratingSubjects] = useState(false);
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>([]);
  const [showAiMenu, setShowAiMenu] = useState(false);

  // Send
  const [isSending, setIsSending] = useState(false);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/sales/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          objective: 'b2b_cold_outreach',
          tone: 'professional',
          recipientContext: {
            businessName: recipientName || recipientEmail,
          },
        }),
      });

      if (!res.ok) throw new Error('AI generation failed');

      const data = await res.json();
      const email = data.email;
      if (!subject) setSubject(email.subject);
      if (!headline) setHeadline(email.headline);
      setBody(email.body);
      if (email.ctaText) setCtaText(email.ctaText);
      if (email.ctaUrl) setCtaUrl(email.ctaUrl);
      setSuggestedSubjects([]);
      toast.success('AI generated email content');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestSubjects = async () => {
    setIsGeneratingSubjects(true);
    try {
      const res = await fetch('/api/sales/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subjects',
          objective: 'b2b_cold_outreach',
          tone: 'professional',
          count: 5,
          recipientContext: {
            businessName: recipientName || recipientEmail,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to generate subjects');

      const data = await res.json();
      setSuggestedSubjects(data.subjects || []);
    } catch (error) {
      console.error('Subject generation error:', error);
      toast.error('Failed to suggest subjects');
    } finally {
      setIsGeneratingSubjects(false);
    }
  };

  const handleImproveBody = async (instruction: string) => {
    if (!body.trim()) {
      toast.error('Write some content first');
      return;
    }
    setIsImproving(true);
    setShowAiMenu(false);
    try {
      const res = await fetch('/api/sales/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'improve',
          content: body,
          instruction,
          audienceType: 'b2b',
        }),
      });

      if (!res.ok) throw new Error('Failed to improve');

      const data = await res.json();
      setBody(data.improved);
      toast.success('Email enhanced by AI');
    } catch (error) {
      console.error('Improve error:', error);
      toast.error('Failed to enhance email');
    } finally {
      setIsImproving(false);
    }
  };

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

          {/* Sender — dropdown for admins, static for reps */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Send As</label>
            {isAdmin ? (
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
            ) : (
              <div className="p-3 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white">
                {selectedSender.name}
                {selectedSender.title && <span className="text-gray-500"> — {selectedSender.title}</span>}
                <span className="text-gray-600 ml-2">&lt;{selectedSender.email}&gt;</span>
              </div>
            )}
          </div>

          {/* AI Tools Bar */}
          {!isReply && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate with AI
              </button>
              <button
                onClick={handleSuggestSubjects}
                disabled={isGeneratingSubjects}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isGeneratingSubjects ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                Suggest Subjects
              </button>
            </div>
          )}

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
            {suggestedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestedSubjects.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSubject(s);
                      setSuggestedSubjects([]);
                    }}
                    className="px-2.5 py-1 bg-blue-600/10 text-blue-400 text-xs rounded-full hover:bg-blue-600/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
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

          {/* Body with AI enhance chips */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content..."
              rows={8}
              className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            {body.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {isImproving ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-purple-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Enhancing...
                  </span>
                ) : (
                  AI_IMPROVE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleImproveBody(opt.instruction)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/10 text-purple-400 text-[11px] rounded-full hover:bg-purple-600/20 transition-colors"
                    >
                      <Wand2 className="w-2.5 h-2.5" />
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            )}
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
