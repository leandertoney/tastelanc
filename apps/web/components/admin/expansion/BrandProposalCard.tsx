'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Bot, Check, Loader2, ImageIcon } from 'lucide-react';
import type { BrandDraft } from '@/lib/ai/expansion-types';
import ColorSwatchRow from './ColorSwatchRow';

interface BrandProposalCardProps {
  brand: BrandDraft;
  onSelect?: (brandId: string) => void;
  isSelecting?: boolean;
}

export default function BrandProposalCard({ brand, onSelect, isSelecting }: BrandProposalCardProps) {
  const accentColor = brand.colors?.accent || '#A41E22';
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(brand.avatar_image_url || null);

  const handleGenerateAvatar = async () => {
    setIsGeneratingAvatar(true);
    try {
      const res = await fetch('/api/admin/expansion/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandDraftId: brand.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate avatar');
      }
      const data = await res.json();
      setAvatarUrl(data.avatarUrl);
    } catch (error) {
      console.error('Avatar generation failed:', error);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return (
    <div
      className={`bg-tastelanc-surface rounded-xl border p-5 transition-all ${
        brand.is_selected
          ? 'border-green-500 ring-1 ring-green-500/20'
          : 'border-tastelanc-surface-light hover:border-tastelanc-accent/30'
      }`}
    >
      {/* Variant badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-tastelanc-text-faint bg-tastelanc-surface-light px-2 py-0.5 rounded-full">
          Variant #{brand.variant_number}
        </span>
        {brand.is_selected && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" />
            Selected
          </span>
        )}
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-4 mb-4">
        {avatarUrl ? (
          <div
            className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2"
            style={{ borderColor: accentColor }}
          >
            <Image
              src={avatarUrl}
              alt={`${brand.ai_assistant_name} avatar`}
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          <button
            onClick={handleGenerateAvatar}
            disabled={isGeneratingAvatar}
            className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 border-2 transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: accentColor, backgroundColor: `${accentColor}20` }}
            title="Generate AI avatar"
          >
            {isGeneratingAvatar ? (
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
            ) : (
              <>
                <ImageIcon className="w-5 h-5 mb-0.5" style={{ color: accentColor }} />
                <span className="text-[9px] font-medium" style={{ color: accentColor }}>Generate</span>
              </>
            )}
          </button>
        )}
        <div>
          <h3 className="text-xl font-bold text-tastelanc-text-primary">{brand.app_name}</h3>
          <p className="text-sm text-tastelanc-text-muted">{brand.tagline}</p>
        </div>
      </div>

      {/* AI assistant + premium */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Bot className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
          <span className="text-tastelanc-text-secondary">
            AI Assistant: <span className="text-tastelanc-text-primary font-medium">{brand.ai_assistant_name}</span>
          </span>
        </div>
        <div className="text-sm text-tastelanc-text-secondary">
          Premium: <span className="text-tastelanc-text-primary font-medium">{brand.premium_name}</span>
        </div>
      </div>

      {/* Name Story */}
      {brand.name_story && (
        <div className="mb-4 bg-tastelanc-surface-light/50 rounded-lg p-3">
          <p className="text-xs font-medium text-tastelanc-text-faint mb-1">The Story</p>
          <p className="text-sm text-tastelanc-text-secondary italic leading-relaxed">{brand.name_story}</p>
        </div>
      )}

      {/* Colors */}
      <div className="mb-4">
        <p className="text-xs text-tastelanc-text-faint mb-1.5">Brand Colors</p>
        <ColorSwatchRow colors={brand.colors} />
        {brand.color_story && (
          <p className="text-xs text-tastelanc-text-muted italic mt-1.5 leading-relaxed">{brand.color_story}</p>
        )}
      </div>

      {/* Select button */}
      {!brand.is_selected && onSelect && (
        <button
          onClick={() => onSelect(brand.id)}
          disabled={isSelecting}
          className="w-full mt-2 px-4 py-2 bg-tastelanc-accent/10 text-tastelanc-accent border border-tastelanc-accent/20 rounded-lg text-sm font-medium hover:bg-tastelanc-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSelecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Selecting...
            </>
          ) : (
            'Select This Brand'
          )}
        </button>
      )}
    </div>
  );
}
