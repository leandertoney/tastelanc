import Image from 'next/image';
import { BRAND } from '@/config/market';

// Real Lancaster premium/elite restaurant images from Supabase
const IMG = (id: string) => `https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurants/${id}/cover.jpg`;
const IMAGES = {
  tellus360:    IMG('a1ce96aa-4cc0-4dc3-ab03-d61c3d104db5'),   // Tellus 360 — premium
  trio:         IMG('53deabc0-7d15-4a5e-80c2-2dac17b5a4bc'),   // Trio Bar & Grill — premium
  theFridge:    IMG('ffbb8eb2-bd67-4c4d-bd23-f7c0f6f34030'),   // The Fridge — premium (Italian)
  marionCourt:  IMG('6304c5cf-bdf3-413c-9fff-592562a1ddde'),   // Marion Court Room — elite
};

const TFK_LOGO_URL = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/ads/tfk_logo.png';

export default function MockupHomeScreen() {
  const accent = BRAND.colors.accent;

  return (
    <div className="w-full h-full bg-[#1A1A1A] text-white flex flex-col overflow-hidden text-[0px]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-14 pb-1">
        <span className="text-[10px] font-semibold">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-2 border border-white/60 rounded-[2px] relative">
            <div className="absolute inset-[1px] right-[2px] bg-white/60 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Navigation header — matches real app */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[12px] font-semibold">Good Evening</span>
        <div className="w-7 h-7 rounded-md overflow-hidden border border-white/10">
          <Image src="/images/tastelanc_icon.png" alt="" width={28} height={28} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Happy Hours Section */}
      <div className="px-3 pb-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            <span className="text-[10px] font-bold">Happy Hours</span>
          </div>
          <span className="text-[8px] font-medium" style={{ color: accent }}>See All &rsaquo;</span>
        </div>

        {/* Horizontal scroll of HH banners — real premium partners */}
        <div className="flex gap-2 overflow-hidden">
          <HHBanner
            name="Tellus 360"
            deal="$5 Craft Drafts"
            time="4-6pm"
            imageUrl={IMAGES.tellus360}
            accent={accent}
          />
          <HHBanner
            name="Trio Bar & Grill"
            deal="Half-Price Apps"
            time="5-7pm"
            imageUrl={IMAGES.trio}
            accent={accent}
          />
        </div>
      </div>

      {/* Entertainment Tonight */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            <span className="text-[10px] font-bold">Entertainment Tonight</span>
          </div>
          <span className="text-[8px] font-medium" style={{ color: accent }}>See All &rsaquo;</span>
        </div>

        <div className="flex gap-2 overflow-hidden">
          {/* TFK Partner Card — matches real app gradient + logo */}
          <div className="w-[90px] h-[110px] rounded-xl overflow-hidden flex-shrink-0 relative">
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #C084FC 50%, #93C5FD 100%)' }}
            >
              <Image
                src={TFK_LOGO_URL}
                alt="Thirsty for Knowledge"
                width={78}
                height={78}
                className="object-contain"
              />
            </div>
            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
              <p className="text-[7px] font-bold text-white drop-shadow-md">Trivia Tonight</p>
              <p className="text-[6px] text-white/80 drop-shadow-md">7 Venues</p>
            </div>
          </div>

          {/* Live Music Card — real image */}
          <div className="w-[90px] h-[110px] rounded-xl overflow-hidden flex-shrink-0 relative">
            <Image src="/images/events/live_music.png" alt="" fill className="object-cover" sizes="100px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-1.5 left-1.5 bg-[#A41E22] px-1.5 py-0.5 rounded text-[6px] font-bold text-white z-10">
              Live Music
            </div>
            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
              <p className="text-[7px] font-semibold text-white">The Pressroom</p>
              <p className="text-[6px] text-gray-300">8pm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured For You — flex-1 fills remaining space above tab bar */}
      <div className="px-3 pt-2 pb-1 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span className="text-[10px] font-bold">Featured for You</span>
          </div>
          <span className="text-[8px] font-medium" style={{ color: accent }}>See All &rsaquo;</span>
        </div>
        <div className="flex gap-2 overflow-hidden flex-1">
          <FeaturedCard name="Marion Court Room" cuisine="Pub Fare" imageUrl={IMAGES.marionCourt} tier="elite" accent={accent} />
          <FeaturedCard name="The Fridge" cuisine="Italian" imageUrl={IMAGES.theFridge} accent={accent} />
        </div>
      </div>

      {/* Bottom Tab Bar — matches real app exactly */}
      <BottomTabBar accent={accent} activeTab="home" />
    </div>
  );
}

function HHBanner({ name, deal, time, imageUrl, accent }: { name: string; deal: string; time: string; imageUrl: string; accent: string }) {
  return (
    <div className="flex-1 rounded-xl overflow-hidden relative min-w-0" style={{ height: 58 }}>
      {/* Background image */}
      <Image src={imageUrl} alt="" fill className="object-cover" sizes="200px" />
      <div className="absolute inset-0 bg-black/55" />
      {/* Content */}
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


function FeaturedCard({ name, cuisine, imageUrl, tier, accent }: { name: string; cuisine: string; imageUrl: string; tier?: string; accent: string }) {
  return (
    <div className="flex-1 rounded-xl overflow-hidden min-w-0 flex flex-col" style={{ maxHeight: 165 }}>
      <div className="relative flex-1 min-h-0">
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="200px" />
      </div>
      <div className="bg-[#252525] px-2 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-1">
          <p className="text-[8px] font-semibold truncate">{name}</p>
          {tier === 'elite' && (
            <span className="flex-shrink-0 px-1 py-[0.5px] rounded-full text-[4px] font-bold tracking-wide"
                  style={{ backgroundColor: '#D4AF37', color: '#1a1a1a' }}>
              TasteLanc Pick
            </span>
          )}
        </div>
        <p className="text-[6px] text-gray-400 truncate">{cuisine}</p>
      </div>
    </div>
  );
}

function BottomTabBar({ accent, activeTab }: { accent: string; activeTab: string }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill={activeTab === 'home' ? c : 'none'} stroke={c} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg> },
    { id: 'search', label: 'Search', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg> },
    { id: 'move', label: 'Move', isMove: true, icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49" /><circle cx="12" cy="12" r="2" /></svg> },
    { id: 'favorites', label: 'Favorites', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg> },
    { id: 'profile', label: 'Profile', icon: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  ];

  return (
    <div className="mt-auto border-t border-white/10 px-1 pt-1.5 pb-1 flex justify-around items-center bg-[#1A1A1A]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const color = isActive ? accent : 'rgba(255,255,255,0.5)';
        return (
          <div key={tab.id} className="flex flex-col items-center gap-0.5 relative">
            {tab.icon(color)}
            {tab.isMove ? (
              <div className="relative">
                <span className="text-[4px] italic absolute -top-[5px] -left-[1px]" style={{ color: isActive ? accent : 'rgba(255,255,255,0.5)' }}>the</span>
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
