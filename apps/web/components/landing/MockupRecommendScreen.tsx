import Image from 'next/image';
import { BRAND } from '@/config/market';

export default function MockupRecommendScreen() {
  const accent = BRAND.colors.accent;

  return (
    <div className="w-full h-full bg-black text-white flex flex-col overflow-hidden relative">
      {/* Full-bleed camera viewfinder — person with food/drinks (selfie-style) */}
      <div className="absolute inset-0">
        <Image src="/images/cheers-friends.png" alt="" fill className="object-cover object-top" sizes="320px" />
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
      </div>

      {/* REC indicator — top left corner like a real camera */}
      <div className="absolute top-16 left-4 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[8px] font-mono text-white/90 tracking-wider">REC</span>
      </div>

      {/* Status bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14 pb-1">
        <span className="text-[10px] font-semibold text-white/90">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-2 border border-white/60 rounded-[2px] relative">
            <div className="absolute inset-[1px] right-[2px] bg-white/60 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Top bar — back button + header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          <span className="text-[11px] font-semibold">Record</span>
        </div>
        {/* Flip camera icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white/80" strokeWidth="2" strokeLinecap="round">
          <path d="M20 16v4a2 2 0 01-2 2h-4M4 8V4a2 2 0 012-2h4M15 3l3 3-3 3M9 21l-3-3 3-3" />
        </svg>
      </div>

      {/* Center — mostly empty to show the people/food, just a subtle prompt at bottom-center */}
      <div className="relative z-10 flex-1 flex flex-col justify-end items-center px-6 pb-2">
        <p className="text-[11px] font-medium text-white/70 text-center tracking-wide drop-shadow-lg">
          Show us what you love...
        </p>
      </div>

      {/* Recording progress bar */}
      <div className="relative z-10 px-4 mb-2">
        <div className="h-[3px] bg-white/20 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: '20%', backgroundColor: accent }} />
        </div>
      </div>

      {/* Timer */}
      <div className="relative z-10 flex items-center justify-center mb-3">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-mono text-white/90">0:12</span>
          <span className="text-[9px] font-mono text-white/40">/ 0:60</span>
        </div>
      </div>

      {/* Recording controls */}
      <div className="relative z-10 flex items-center justify-center gap-10 mb-3 px-6">
        {/* Flip camera */}
        <button className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M20 16v4a2 2 0 01-2 2h-4M4 8V4a2 2 0 012-2h4M15 3l3 3-3 3M9 21l-3-3 3-3" />
          </svg>
        </button>

        {/* Record button — red with pulse */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" style={{ animationDuration: '2s' }} />
          <button className="relative w-14 h-14 rounded-full border-[3px] border-white flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-red-500" />
          </button>
        </div>

        {/* Done/checkmark */}
        <button className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </button>
      </div>

      {/* Bottom tab bar */}
      <div className="relative z-10 border-t border-white/10 px-1 pt-1.5 pb-1 flex justify-around items-center bg-black/50 backdrop-blur-sm">
        <TabIcon label="Home" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>} />
        <TabIcon label="Search" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>} />
        <TabIcon label="Move" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49" /><circle cx="12" cy="12" r="2" /></svg>} />
        <TabIcon label="Favorites" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>} />
        <TabIcon label="Profile" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
      </div>
    </div>
  );
}

function TabIcon({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {icon}
      <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
    </div>
  );
}
