'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Zap, Calendar, Clock, AlertCircle } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  subject: string;
  headline: string;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  preview_text: string | null;
}

const CAMPAIGN_TYPES = [
  {
    value: 'scheduled',
    label: 'Scheduled',
    description: 'Send at a specific date and time',
    icon: Clock,
  },
  {
    value: 'countdown',
    label: 'Countdown',
    description: 'Send X days before a target date',
    icon: Calendar,
  },
  {
    value: 'trigger',
    label: 'Trigger',
    description: 'Send when an event occurs',
    icon: Zap,
  },
];

const TARGET_AUDIENCES = [
  { value: 'consumer_all', label: 'All Consumers' },
  { value: 'consumer_unconverted', label: 'Unconverted Signups' },
  { value: 'consumer_converted', label: 'Converted Users' },
  { value: 'business_leads', label: 'Business Leads' },
];

const TRIGGER_EVENTS = [
  { value: 'new_signup', label: 'New Early Access Signup' },
  { value: 'new_conversion', label: 'New Conversion' },
  { value: 'new_business_lead', label: 'New Business Lead' },
];

export default function NewAutomationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [campaignType, setCampaignType] = useState('scheduled');
  const [targetAudience, setTargetAudience] = useState('consumer_all');

  // Scheduled
  const [scheduledAt, setScheduledAt] = useState('');

  // Countdown
  const [countdownTargetDate, setCountdownTargetDate] = useState('');
  const [daysBefore, setDaysBefore] = useState(3);

  // Trigger
  const [triggerEvent, setTriggerEvent] = useState('new_signup');
  const [triggerDelayMinutes, setTriggerDelayMinutes] = useState(0);

  // Email content
  const [useTemplate, setUseTemplate] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  useEffect(() => {
    // Fetch templates
    fetch('/api/admin/templates')
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(console.error);
  }, []);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setSubject(template.subject);
      setHeadline(template.headline);
      setBody(template.body);
      setCtaText(template.cta_text || '');
      setCtaUrl(template.cta_url || '');
      setPreviewText(template.preview_text || '');
    }
  };

  const handleSave = async () => {
    if (!name) {
      setError('Please enter a name for this automation');
      return;
    }

    if (campaignType === 'scheduled' && !scheduledAt) {
      setError('Please select a date and time');
      return;
    }

    if (campaignType === 'countdown' && !countdownTargetDate) {
      setError('Please select a target date');
      return;
    }

    if (!useTemplate && (!subject || !headline || !body)) {
      setError('Please fill in email content or select a template');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: Record<string, unknown> = {
        name,
        campaign_type: campaignType,
        target_audience: targetAudience,
      };

      if (campaignType === 'scheduled') {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      } else if (campaignType === 'countdown') {
        payload.countdown_target_date = countdownTargetDate;
        payload.days_before = daysBefore;
      } else if (campaignType === 'trigger') {
        payload.trigger_event = triggerEvent;
        payload.trigger_delay_minutes = triggerDelayMinutes;
      }

      if (useTemplate && templateId) {
        payload.template_id = templateId;
      }

      payload.subject = subject;
      payload.preview_text = previewText || null;
      payload.headline = headline;
      payload.body = body;
      payload.cta_text = ctaText || null;
      payload.cta_url = ctaUrl || null;

      const response = await fetch('/api/admin/scheduled-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create automation');
      }

      router.push('/admin/automation');
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
          href="/admin/automation"
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Create Automation
          </h1>
          <p className="text-neutral-400 mt-1">
            Set up scheduled or triggered email campaigns
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Automation Name */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Automation Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Launch Countdown - 3 Days Before"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Campaign Type */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <label className="block text-sm font-medium text-neutral-300 mb-4">
            Campaign Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CAMPAIGN_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setCampaignType(type.value)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  campaignType === type.value
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                }`}
              >
                <type.icon
                  className={`w-5 h-5 mb-2 ${
                    campaignType === type.value
                      ? 'text-red-400'
                      : 'text-neutral-400'
                  }`}
                />
                <div className="font-medium text-white">{type.label}</div>
                <div className="text-sm text-neutral-400 mt-1">
                  {type.description}
                </div>
              </button>
            ))}
          </div>

          {/* Type-specific options */}
          <div className="mt-6 space-y-4">
            {campaignType === 'scheduled' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Send Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full md:w-auto px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            {campaignType === 'countdown' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    value={countdownTargetDate}
                    onChange={(e) => setCountdownTargetDate(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    e.g., Launch date (Dec 13, 2025)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Days Before *
                  </label>
                  <select
                    value={daysBefore}
                    onChange={(e) => setDaysBefore(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                  >
                    {[1, 2, 3, 5, 7, 10, 14, 21, 30].map((days) => (
                      <option key={days} value={days}>
                        {days} {days === 1 ? 'day' : 'days'} before
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {campaignType === 'trigger' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Trigger Event *
                  </label>
                  <select
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                  >
                    {TRIGGER_EVENTS.map((event) => (
                      <option key={event.value} value={event.value}>
                        {event.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Delay (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={triggerDelayMinutes}
                    onChange={(e) =>
                      setTriggerDelayMinutes(Number(e.target.value))
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    0 = send immediately
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Target Audience */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Target Audience *
          </label>
          <select
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
          >
            {TARGET_AUDIENCES.map((audience) => (
              <option key={audience.value} value={audience.value}>
                {audience.label}
              </option>
            ))}
          </select>
        </div>

        {/* Email Content */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Email Content</h3>
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
                className="rounded border-neutral-600 bg-neutral-800 text-red-500 focus:ring-red-500"
              />
              Use saved template
            </label>
          </div>

          {useTemplate && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Select Template
              </label>
              <select
                value={templateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Subject Line *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Preview Text
            </label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Preview text shown in inbox"
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Body *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content..."
              rows={6}
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

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
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/admin/automation"
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
            {saving ? 'Saving...' : 'Create Automation'}
          </button>
        </div>
      </div>
    </div>
  );
}
