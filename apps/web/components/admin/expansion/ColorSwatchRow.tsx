'use client';

import type { BrandColors } from '@/lib/ai/expansion-types';

interface ColorSwatchRowProps {
  colors: BrandColors;
}

export default function ColorSwatchRow({ colors }: ColorSwatchRowProps) {
  const swatches = [
    { label: 'Accent', value: colors.accent },
    { label: 'Gold', value: colors.gold },
    { label: 'Header BG', value: colors.headerBg },
    { label: 'Surface Light', value: colors.surfaceLight },
  ];

  return (
    <div className="flex items-center gap-2">
      {swatches.map((swatch) => (
        <div
          key={swatch.label}
          className="w-6 h-6 rounded-full border border-white/10 flex-shrink-0"
          style={{ backgroundColor: swatch.value }}
          title={`${swatch.label}: ${swatch.value}`}
        />
      ))}
    </div>
  );
}
