'use client';

import Image from 'next/image';
import { Bot, Check, Loader2 } from 'lucide-react';
import type { BrandDraft } from '@/lib/ai/expansion-types';
import ColorSwatchRow from './ColorSwatchRow';

interface BrandProposalCardProps {
  brand: BrandDraft;
  onSelect: (brandId: string) => void;
  isSelecting?: boolean;
}

export default function BrandProposalCard({ brand, onSelect, isSelecting }: BrandProposalCardProps) {
  const accentColor = brand.colors?.accent || '#A41E22';

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
        <span className="text-xs font-medium text-gray-500 bg-tastelanc-surface-light px-2 py-0.5 rounded-full">
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
        {brand.avatar_image_url ? (
          <div
            className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2"
            style={{ borderColor: accentColor }}
          >
            <Image
              src={brand.avatar_image_url}
              alt={`${brand.ai_assistant_name} avatar`}
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 border-2"
            style={{ borderColor: accentColor, backgroundColor: `${accentColor}20` }}
          >
            <span className="text-2xl font-bold" style={{ color: accentColor }}>
              {brand.ai_assistant_name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-white">{brand.app_name}</h3>
          <p className="text-sm text-gray-400">{brand.tagline}</p>
        </div>
      </div>

      {/* AI assistant + premium */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Bot className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
          <span className="text-gray-300">
            AI Assistant: <span className="text-white font-medium">{brand.ai_assistant_name}</span>
          </span>
        </div>
        <div className="text-sm text-gray-300">
          Premium: <span className="text-white font-medium">{brand.premium_name}</span>
        </div>
      </div>

      {/* Colors */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1.5">Brand Colors</p>
        <ColorSwatchRow colors={brand.colors} />
      </div>

      {/* Select button */}
      {!brand.is_selected && (
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
