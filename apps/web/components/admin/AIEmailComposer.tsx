'use client';

import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Wand2,
  X,
  Plus,
} from 'lucide-react';
import { Card } from '@/components/ui';

// Types matching the email generator
type EmailObjective =
  | 'launch_countdown'
  | 'waitlist_reminder'
  | 'feature_announcement'
  | 'partnership_announcement'
  | 'welcome'
  | 'follow_up'
  | 'b2b_cold_outreach'
  | 'b2b_follow_up'
  | 'general';

type EmailTone = 'professional' | 'friendly' | 'urgent' | 'casual' | 'excited';

type AudienceType = 'consumer' | 'b2b';

interface GeneratedEmail {
  subject: string;
  previewText: string;
  headline: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface AIEmailComposerProps {
  audienceType?: AudienceType;
  onUseEmail: (email: GeneratedEmail) => void;
  className?: string;
}

const OBJECTIVES: { value: EmailObjective; label: string; description: string; forB2B?: boolean }[] = [
  { value: 'launch_countdown', label: 'Launch Countdown', description: 'Build excitement for app launch' },
  { value: 'waitlist_reminder', label: 'Waitlist Reminder', description: 'Remind users to join waitlist' },
  { value: 'feature_announcement', label: 'Feature Announcement', description: 'Announce new features' },
  { value: 'partnership_announcement', label: 'Partnership News', description: 'New restaurant partners' },
  { value: 'welcome', label: 'Welcome Email', description: 'For new signups' },
  { value: 'follow_up', label: 'Follow Up', description: 'Keep engagement high' },
  { value: 'b2b_cold_outreach', label: 'Cold Outreach', description: 'First contact with restaurants', forB2B: true },
  { value: 'b2b_follow_up', label: 'B2B Follow Up', description: 'Follow up with businesses', forB2B: true },
  { value: 'general', label: 'General', description: 'Custom email' },
];

const TONES: { value: EmailTone; label: string; emoji: string }[] = [
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'urgent', label: 'Urgent', emoji: '⚡' },
  { value: 'casual', label: 'Casual', emoji: '👋' },
  { value: 'excited', label: 'Excited', emoji: '🎉' },
];

// Calculate days until launch (TBD - update when launch date is set)
const LAUNCH_DATE = new Date('2026-03-01'); // Placeholder date

function daysUntil(date: Date): number {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function AIEmailComposer({
  audienceType = 'consumer',
  onUseEmail,
  className = '',
}: AIEmailComposerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [objective, setObjective] = useState<EmailObjective>('launch_countdown');
  const [tone, setTone] = useState<EmailTone>('friendly');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [newKeyPoint, setNewKeyPoint] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const daysToLaunch = daysUntil(LAUNCH_DATE);

  const addKeyPoint = () => {
    if (newKeyPoint.trim() && keyPoints.length < 5) {
      setKeyPoints([...keyPoints, newKeyPoint.trim()]);
      setNewKeyPoint('');
    }
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          objective,
          audienceType,
          tone,
          keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
          businessContext: {
            launchDate: 'Coming Soon',
            daysUntilLaunch: daysToLaunch,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate email');
      }

      setGeneratedEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseEmail = () => {
    if (generatedEmail) {
      onUseEmail(generatedEmail);
      setIsExpanded(false);
      setGeneratedEmail(null);
    }
  };

  // Filter objectives based on audience type
  const filteredObjectives = OBJECTIVES.filter((obj) => {
    if (audienceType === 'b2b') {
      return obj.forB2B || obj.value === 'general';
    }
    return !obj.forB2B;
  });

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-tastelanc-surface-light/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">AI Email Generator</h3>
            <p className="text-xs text-gray-400">Generate emails with Claude AI</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-tastelanc-surface-light">
          {/* Context Info */}
          <div className="mb-4 p-3 bg-tastelanc-surface-light/50 rounded-lg">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-400">Launch:</span>
                <span className="ml-2 text-white font-medium">Coming Soon</span>
              </div>
            </div>
          </div>

          {/* Objective Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Objective
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filteredObjectives.map((obj) => (
                <button
                  key={obj.value}
                  onClick={() => setObjective(obj.value)}
                  className={`p-3 rounded-lg text-left transition-all ${
                    objective === obj.value
                      ? 'bg-tastelanc-accent/20 border-2 border-tastelanc-accent'
                      : 'bg-tastelanc-surface-light hover:bg-tastelanc-surface border-2 border-transparent'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{obj.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{obj.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 ${
                    tone === t.value
                      ? 'bg-tastelanc-accent text-white'
                      : 'bg-tastelanc-surface-light text-gray-300 hover:bg-tastelanc-surface'
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Key Points */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Key Points to Include (optional)
            </label>
            <div className="space-y-2">
              {keyPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-tastelanc-surface-light rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-white flex-1">{point}</span>
                  <button
                    onClick={() => removeKeyPoint(index)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {keyPoints.length < 5 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyPoint}
                    onChange={(e) => setNewKeyPoint(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyPoint()}
                    placeholder="Add a key point..."
                    className="flex-1 px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent text-sm"
                  />
                  <button
                    onClick={addKeyPoint}
                    disabled={!newKeyPoint.trim()}
                    className="px-3 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface disabled:opacity-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Email with AI
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Generated Email Preview */}
          {generatedEmail && (
            <div className="mt-4 p-4 bg-tastelanc-surface-light rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-lancaster-gold" />
                  Generated Email
                </h4>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Subject:</span>
                  <p className="text-white mt-1 font-medium">{generatedEmail.subject}</p>
                </div>
                <div>
                  <span className="text-gray-400">Preview:</span>
                  <p className="text-gray-300 mt-1">{generatedEmail.previewText}</p>
                </div>
                <div>
                  <span className="text-gray-400">Headline:</span>
                  <p className="text-white mt-1 font-medium">{generatedEmail.headline}</p>
                </div>
                <div>
                  <span className="text-gray-400">Body:</span>
                  <p className="text-gray-300 mt-1 whitespace-pre-wrap">{generatedEmail.body}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-gray-400">CTA:</span>
                    {generatedEmail.ctaText ? (
                      <p className="text-tastelanc-accent mt-1">{generatedEmail.ctaText}</p>
                    ) : (
                      <p className="text-gray-400 mt-1 italic">No CTA button</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-400">URL:</span>
                    {generatedEmail.ctaUrl ? (
                      <p className="text-gray-300 mt-1 truncate">{generatedEmail.ctaUrl}</p>
                    ) : (
                      <p className="text-gray-400 mt-1 italic">No link</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleUseEmail}
                className="w-full mt-4 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <Check className="w-5 h-5" />
                Use This Email
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
