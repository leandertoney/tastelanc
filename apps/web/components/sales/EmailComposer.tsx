'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Loader2,
  ChevronDown,
  Check,
  ArrowLeft,
  Lightbulb,
  Wand2,
} from 'lucide-react';
import { SENDER_IDENTITIES, type SenderIdentity } from '@/config/sender-identities';
import { B2B_TEMPLATES } from '@/lib/email-templates/b2b-outreach-template';
import { toast } from 'sonner';

interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  city: string | null;
  status: string;
}

interface EmailComposerProps {
  lead: Lead;
  onClose: () => void;
  onSent: () => void;
  replyTo?: {
    subject: string;
    inReplyToMessageId: string;
    threadId: string;
  };
}

type TemplateKey = 'coldOutreach' | 'followUp' | 'valueProposition' | 'custom';
type Step = 'compose' | 'confirm';

const TEMPLATE_OPTIONS: { key: TemplateKey; label: string }[] = [
  { key: 'coldOutreach', label: 'Cold Outreach' },
  { key: 'followUp', label: 'Follow Up' },
  { key: 'valueProposition', label: 'Value Proposition' },
  { key: 'custom', label: 'Custom' },
];

export default function EmailComposer({ lead, onClose, onSent, replyTo }: EmailComposerProps) {
  const isReply = !!replyTo;
  const [step, setStep] = useState<Step>('compose');

  // Sender
  const [selectedSender, setSelectedSender] = useState<SenderIdentity>(SENDER_IDENTITIES[0]);
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const [lastUsedHint, setLastUsedHint] = useState<string | null>(null);

  // Template
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>(isReply ? 'custom' : 'coldOutreach');

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
  const [isGeneratingSubjects, setIsGeneratingSubjects] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>([]);

  // Send
  const [isSending, setIsSending] = useState(false);

  // Load last used sender preference
  useEffect(() => {
    const fetchSenderPref = async () => {
      try {
        const res = await fetch('/api/sales/sender-preference');
        if (res.ok) {
          const data = await res.json();
          if (data.preferredSenderEmail) {
            const found = SENDER_IDENTITIES.find((s) => s.email === data.preferredSenderEmail);
            if (found) {
              setSelectedSender(found);
              setLastUsedHint(found.name);
            }
          }
        }
      } catch {
        // Ignore — just use default
      }
    };
    fetchSenderPref();
  }, []);

  // Apply template when selection changes (skip for replies)
  useEffect(() => {
    if (isReply) return;
    if (selectedTemplate === 'custom') {
      setSubject('');
      setHeadline('');
      setBody('');
      setCtaText('');
      setCtaUrl('');
      return;
    }

    const template = B2B_TEMPLATES[selectedTemplate];
    if (template) {
      setSubject(personalize(template.subject));
      setHeadline(personalize(template.headline));
      setBody(personalize(template.body));
      setCtaText(template.ctaText);
      setCtaUrl(template.ctaUrl);
    }
  }, [selectedTemplate]);

  const personalize = (text: string): string => {
    return text
      .replace(/\{business_name\}/g, lead.business_name)
      .replace(/\{contact_name\}/g, lead.contact_name || 'there');
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const objective = lead.status === 'new' ? 'b2b_cold_outreach' : 'b2b_follow_up';
      const res = await fetch('/api/sales/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          objective,
          tone: 'professional',
          recipientContext: {
            businessName: lead.business_name,
            contactName: lead.contact_name,
            city: lead.city,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('AI generation failed');
      }

      const data = await res.json();
      const email = data.email;
      setSubject(email.subject);
      setHeadline(email.headline);
      setBody(email.body);
      setCtaText(email.ctaText);
      setCtaUrl(email.ctaUrl);
      setSuggestedSubjects([]);
      toast.success('AI generated email');
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
      const objective = lead.status === 'new' ? 'b2b_cold_outreach' : 'b2b_follow_up';
      const res = await fetch('/api/sales/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subjects',
          objective,
          tone: 'professional',
          count: 5,
          recipientContext: {
            businessName: lead.business_name,
            contactName: lead.contact_name,
            city: lead.city,
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

  const handleImproveBody = async () => {
    if (!body.trim()) {
      toast.error('Write some content first');
      return;
    }
    setIsImproving(true);
    try {
      const res = await fetch('/api/sales/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'improve',
          content: body,
          instruction: 'Make this more persuasive and professional while keeping it concise. Focus on the value proposition for the restaurant owner.',
          audienceType: 'b2b',
        }),
      });

      if (!res.ok) throw new Error('Failed to improve');

      const data = await res.json();
      setBody(data.improved);
      toast.success('Body improved by AI');
    } catch (error) {
      console.error('Improve error:', error);
      toast.error('Failed to improve email');
    } finally {
      setIsImproving(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/sales/leads/${lead.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          headline,
          emailBody: body,
          ctaText: ctaText || undefined,
          ctaUrl: ctaUrl || undefined,
          senderName: selectedSender.name,
          senderEmail: selectedSender.email,
          ...(replyTo && {
            inReplyToMessageId: replyTo.inReplyToMessageId,
            threadId: replyTo.threadId,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success(`Email sent to ${lead.email}`);
      onSent();
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const canSend = subject.trim() && headline.trim() && body.trim() && lead.email;

  // Confirmation step
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
                  {selectedSender.name} from TasteLanc &lt;{selectedSender.email}&gt;
                </p>
              </div>

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">To</span>
                <p className="text-sm text-white mt-1">
                  {lead.contact_name || lead.business_name} &lt;{lead.email}&gt;
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

              {lead.status === 'new' && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-xs text-yellow-400">This is the first email to this lead</span>
                </div>
              )}
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
          {/* Sender Selection */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
              Send As
              {lastUsedHint && (
                <span className="normal-case tracking-normal text-gray-600 ml-2">
                  Last used: {lastUsedHint}
                </span>
              )}
            </label>
            <div className="relative">
              <button
                onClick={() => setSenderDropdownOpen(!senderDropdownOpen)}
                className="w-full flex items-center justify-between p-3 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white hover:border-gray-600 transition-colors"
              >
                <span>
                  {selectedSender.name}
                  {selectedSender.title && (
                    <span className="text-gray-500"> — {selectedSender.title}</span>
                  )}
                  <span className="text-gray-600 ml-2">&lt;{selectedSender.email}&gt;</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${senderDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {senderDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-tastelanc-surface-light border border-gray-700 rounded-lg overflow-hidden z-10">
                  {SENDER_IDENTITIES.map((sender) => (
                    <button
                      key={sender.email}
                      onClick={() => {
                        setSelectedSender(sender);
                        setSenderDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                        selectedSender.email === sender.email
                          ? 'bg-blue-600/10 text-white'
                          : 'text-gray-300 hover:bg-tastelanc-bg hover:text-white'
                      }`}
                    >
                      <span>
                        {sender.name}
                        {sender.title && (
                          <span className="text-gray-500"> — {sender.title}</span>
                        )}
                        <span className="text-gray-600 ml-2">&lt;{sender.email}&gt;</span>
                      </span>
                      {selectedSender.email === sender.email && (
                        <Check className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Template + AI (hidden for replies) */}
          {!isReply && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-tastelanc-bg rounded-lg p-1">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedTemplate(opt.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      selectedTemplate === opt.key
                        ? 'bg-tastelanc-surface-light text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 ml-auto">
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
            </div>
          )}

          {/* Subject + AI chips */}
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
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Headline</label>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider">Body</label>
              <button
                onClick={handleImproveBody}
                disabled={isImproving || !body.trim()}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors"
              >
                {isImproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Improve with AI
              </button>
            </div>
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
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">CTA Text <span className="text-gray-600">(optional)</span></label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Schedule a Call"
                className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">CTA URL <span className="text-gray-600">(optional)</span></label>
              <input
                type="text"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Recipient info */}
          <div className="flex items-center gap-3 p-3 bg-tastelanc-bg rounded-lg">
            <span className="text-xs text-gray-500">To:</span>
            <span className="text-sm text-white">
              {lead.contact_name || lead.business_name}
            </span>
            <span className="text-sm text-gray-500">&lt;{lead.email}&gt;</span>
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
