'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileText, Sparkles } from 'lucide-react';
import AIEmailComposer from '@/components/admin/AIEmailComposer';

const CATEGORIES = [
  { value: 'consumer', label: 'Consumer' },
  { value: 'b2b_cold', label: 'B2B Cold Outreach' },
  { value: 'b2b_followup', label: 'B2B Follow-up' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'countdown', label: 'Countdown' },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('consumer');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const handleUseAIEmail = (email: {
    subject: string;
    headline: string;
    body: string;
    ctaText?: string;
    ctaUrl?: string;
    previewText?: string;
  }) => {
    setSubject(email.subject);
    setHeadline(email.headline);
    setBody(email.body);
    setCtaText(email.ctaText || '');
    setCtaUrl(email.ctaUrl || '');
    if (email.previewText !== undefined) setPreviewText(email.previewText);
    setIsAiGenerated(true);
  };

  const handleSave = async () => {
    if (!name || !category || !subject || !headline || !body) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          subject,
          preview_text: previewText || null,
          headline,
          body,
          cta_text: ctaText || null,
          cta_url: ctaUrl || null,
          is_ai_generated: isAiGenerated,
          ai_prompt: aiPrompt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      router.push('/admin/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/templates"
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Create Template
          </h1>
          <p className="text-neutral-400 mt-1">
            Save email content for reuse in future campaigns
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* AI Composer */}
      <div className="mb-8">
        <AIEmailComposer onUseEmail={handleUseAIEmail} />
      </div>

      {/* Form */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-6">
        {/* Template Name & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Launch Countdown - 3 Days"
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Subject Line *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Preview Text */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Preview Text
          </label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Text shown in inbox preview"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Headline */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Headline *
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Email headline"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Body Content *
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body content..."
            rows={8}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 resize-none"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Use double line breaks for paragraphs. For B2B templates, use{' '}
            {'{business_name}'} and {'{contact_name}'} for personalization.
          </p>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              CTA Button Text
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g., Get Early Access"
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              CTA Button URL
            </label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://tastelanc.com"
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* AI Generated Badge */}
        {isAiGenerated && (
          <div className="flex items-center gap-2 text-purple-400 text-sm">
            <Sparkles className="w-4 h-4" />
            This template was generated with AI
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
          <Link
            href="/admin/templates"
            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
