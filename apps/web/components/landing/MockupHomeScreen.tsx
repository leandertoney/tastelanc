import Image from 'next/image';
import { BRAND } from '@/config/market';
import { mockupData } from './mockup-data';

const TFK_LOGO_URL = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/ads/tfk_logo.png';

export default function MockupHomeScreen() {
  const accent = BRAND.colors.accent;
  const { theme, showTFK, hhBanners, featured } = mockupData;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-[0px]" style={{ backgroundColor: theme.bg, color: theme.textColor }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-14 pb-1">
        <span className="text-[10px] font-semibold" style={{ color: theme.textColor }}>9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-2 rounded-[2px] relative" style={{ border: `1px solid ${theme.mutedText}` }}>
            <div className="absolute inset-[1px] right-[2px] rounded-[1px]" style={{ backgroundColor: theme.mutedText }} />
          </div>
        </div>
      </div>

      {/* Navigation header */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[12px] font-semibold" style={{ color: theme.textColor }}>Good Evening</span>
        <div className="w-7 h-7 rounded-md overflow-hidden" style={{ border: `1px solid ${theme.borderColor}` }}>
          <Image src={BRAND.logoPath || '/images/tastelanc_icon.png'} alt="" width={28} height={28} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Happy Hours Section */}
      <div className="px-3 pb-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            <span className="text-[10px] font-bold" style={{ color: theme.textColor }}>Happy Hours</span>
          </div>
          <span className="text-[8px] font-medium" style={{ color: accent }}>See All &rsaquo;</span>
        </div>

        <div className="flex gap-2 overflow-hidden">
          {hhBanners.map((hh) => (
            <HHBanner key={hh.name} name={hh.name} deal={hh.deal} time={hh.time} imageUrl={hh.imageUrl} accent={accent} />
          ))}
        </div>
      </div>

      {/* Entertainment Tonight */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            <span className="text-[10px] font-bold" style={{ color: theme.textColor }}>Entertainment Tonight</span>
          </div>
          <span className="text-[8px] font-medium" style={{ color: accent }}>See All &rsaquo;</span>
        </div>

        <div className="flex gap-2 overflow-hidden">
          {/* TFK Partner Card — Lancaster only */}
          {showTFK && (
            <div className="w-[90px] h-[110px] rounded-xl overflow-hidden flex-shrink-0 relative">
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #C084FC 50%, #93C5FD 100%)' }}
              >
                <Image src={TFK_LOGO_URL} alt="Thirsty for Knowledge" width={78} height={78} className="object-contain" />
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                <p className="text-[7px] font-bold text-white drop-shadow-md">Trivia Tonight</p>
                <p className="text-[6px] text-white/80 drop-shadow-md">7 Venues</p>
              </div>
            </div>
          )}

          {/* Live Music Card */}
          <div className="w-[90px] h-[110px] rounded-xl overflow-hidden flex-shrink-0 relative">
            <Image src="/images/events/live_music.png" alt="" fill className="object-cover" sizes="100px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[6px] font-bold text-white z-10" style={{ backgroundColor: accent }}>
              Live Music
            </div>
            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
              <p className="text-[7px] font-semibold text-white">Tonight</p>
              <p className="text-[6px] text-gray-300">8pm</p>
            </div>
          </div>

          {/* Extra card for non-TFK markets to fill space */}
          {!showTFK && (
            <div className="w-[90px] h-[110px] rounded-xl overflow-hidden flex-shrink-0 relative">
              <Image src="/images/events/trivia.png" alt="" fill className="object-cover" sizes="100px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[6px] font-bold text-white z-10" style={{ backgroundColor: '#A78BFA' }}>
                Trivia
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                <p className="text-[7px] font-semibold text-white">Trivia Night</p>
                <p className="text-[6px] text-gray-300">7pm</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Featured For You */}
      <div className="px-3 pt-2 pb-1 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span className="text-[10px] font-bold" style={{ color: theme.textColor }}>Featured for You</span>
          </div>
          <span className="text-[8px] font-medium" style={{ color: accent }}>See All &rsaquo;</span>
        </div>
        <div className="flex gap-2 overflow-hidden flex-1">
          {featured.map((f) => (
            <FeaturedCard key={f.name} name={f.name} cuisine={f.cuisine} imageUrl={f.imageUrl} tier={f.tier} accent={accent} cardBg={theme.cardBg} textColor={theme.textColor} />
          ))}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar accent={accent} activeTab="home" bg={theme.tabBarBg} borderColor={theme.borderColor} mutedColor={theme.mutedText} />
    </div>
  );
}

function HHBanner({ name, deal, time, imageUrl, accent }: { name: string; deal: string; time: string; imageUrl: string; accent: string }) {
  return (
    <div className="flex-1 rounded-xl overflow-hidden relative min-w-0" style={{ height: 58 }}>
      <Image src={imageUrl} alt="" fill className="object-cover" sizes="200px" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative h-full flex items-center justify-between px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold text-white truncate">{deal}</p>
          <p className="text-[7px] text-white/70 mt-0.5 truncate">{name}</p>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md flex-shrink-0 ml-1" style={{ backgroundColor: accent }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          <span className="text-[7px] font-bold text-white">{time}</span>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ name, cuisine, imageUrl, tier, accent, cardBg, textColor }: { name: string; cuisine: string; imageUrl: string; tier?: string; accent: string; cardBg: string; textColor: string }) {
  return (
    <div className="flex-1 rounded-xl overflow-hidden min-w-0 flex flex-col" style={{ maxHeight: 165 }}>
      <div className="relative flex-1 min-h-0">
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="200px" />
      </div>
      <div className="px-2 py-1.5 flex-shrink-0" style={{ backgroundColor: cardBg }}>
        <div className="flex items-center gap-1">
          <p className="text-[8px] font-semibold truncate" style={{ color: textColor === '#0F1E2E' ? '#FFFFFF' : textColor }}>{name}</p>
          {tier === 'elite' && (
            <span className="flex-shrink-0 px-1 py-[0.5px] rounded-full text-[4px] font-bold tracking-wide"
                  style={{ backgroundColor: '#D4AF37', color: '#1a1a1a' }}>
              {BRAND.name} Pick
            </span>
          )}
        </div>
        <p className="text-[6px] truncate" style={{ color: textColor === '#0F1E2E' ? 'rgba(255,255,255,0.6)' : 'rgba(156,163,175,1)' }}>{cuisine}</p>
      </div>
    </div>
  );
}

function BottomTabBar({ accent, activeTab, bg, borderColor, mutedColor }: { accent: string; activeTab: string; bg: string; borderColor: string; mutedColor: string }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill={activeTab === 'home' ? c : 'none'} stroke={c} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg> },
    { id: 'search', label: 'Search', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg> },
    { id: 'move', label: 'Move', isMove: true, icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49" /><circle cx="12" cy="12" r="2" /></svg> },
    { id: 'favorites', label: 'Favorites', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg> },
    { id: 'profile', label: 'Profile', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  ];

  return (
    <div className="mt-auto px-1 pt-1.5 pb-1 flex justify-around items-center" style={{ backgroundColor: bg, borderTop: `1px solid ${borderColor}` }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const color = isActive ? accent : mutedColor;
        return (
          <div key={tab.id} className="flex flex-col items-center gap-0.5 relative">
            {tab.icon(color)}
            {tab.isMove ? (
              <div className="relative">
                <span className="text-[4px] italic absolute -top-[5px] -left-[1px]" style={{ color }}>the</span>
                <span className="text-[7px] font-semibold" style={{ color }}>{tab.label}</span>
              </div>
            ) : (
              <span className="text-[7px]" style={{ color }}>{tab.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
