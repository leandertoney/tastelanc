import Image from 'next/image';
import { BRAND } from '@/config/market';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TODAY_INDEX = new Date().getDay();

// Real Lancaster premium/elite restaurant images — no repeats from home screen
const IMG = (id: string) => `https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurants/${id}/cover.jpg`;

const HAPPY_HOURS = [
  { name: '551 West', hh: 'Wind Down', time: '4-6pm', deal: '$5 Craft Drafts', img: IMG('986f5834-f06d-4c2f-857e-c6964fc28d1d'), tier: 'premium' as const },
  { name: 'Decades Lancaster', hh: 'Late Night Sips', time: '9-11pm', deal: '$3 Well Drinks', img: IMG('7f0225df-d0d3-4c5d-9b06-fbc84093052d'), tier: 'premium' as const },
  { name: 'Station House', hh: 'Power Hour', time: '5-7pm', deal: 'Half-Price Apps', img: IMG('9134761b-5eb3-4801-ba17-e5fa37de7c08'), tier: 'premium' as const },
  { name: 'QSB', hh: 'Golden Hour', time: '3-6pm', deal: '$4 House Wine', img: IMG('c1eb8e6f-9415-41cf-8fba-ef5a852a390e'), tier: 'premium' as const },
  { name: 'Marietta Tavern', hh: 'Tavern Hour', time: '4-7pm', deal: '$6 Cocktails', img: IMG('69067dc3-6e68-469a-aeda-06fbfe5d2d03'), tier: 'premium' as const },
  { name: 'Lucky Dog Cafe', hh: 'Patio Hour', time: '4-6pm', deal: '$5 House Brews', img: IMG('92724a5a-5e9f-4015-a6bb-8e6eb8018445'), tier: 'premium' as const },
];

export default function MockupHappyHoursScreen() {
  const accent = BRAND.colors.accent;

  return (
    <div className="w-full h-full bg-[#1A1A1A] text-white flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-14 pb-1">
        <span className="text-[10px] font-semibold">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-2 border border-white/60 rounded-[2px] relative">
            <div className="absolute inset-[1px] right-[2px] bg-white/60 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 pt-1 pb-2">
        <p className="text-[14px] font-bold">Happy Hours</p>
        <p className="text-[9px] text-white/50 mt-0.5">What&apos;s pouring in {BRAND.countyShort}</p>
      </div>

      {/* Day-of-week tabs */}
      <div className="px-4 pb-2.5">
        <div className="flex gap-1.5">
          {DAYS.map((day, i) => (
            <div
              key={i}
              className="flex-1 h-7 rounded-lg flex items-center justify-center text-[9px] font-semibold"
              style={{
                backgroundColor: i === TODAY_INDEX ? accent : '#252525',
                color: i === TODAY_INDEX ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Spotify-style list items with real images */}
      <div className="px-4 flex flex-col gap-2.5 flex-1 overflow-hidden">
        {HAPPY_HOURS.map((hh, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {/* Restaurant image */}
            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative">
              <Image src={hh.img} alt="" fill className="object-cover" sizes="44px" />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">{hh.name}</p>
              <p className="text-[8px] text-white/50 truncate">{hh.hh} &middot; {hh.deal}</p>
            </div>
            {/* Time badge */}
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-md flex-shrink-0" style={{ backgroundColor: `${accent}25` }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <span className="text-[7px] font-bold" style={{ color: accent }}>{hh.time}</span>
            </div>
          </div>
        ))}

        {/* Active now indicator */}
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[8px] text-green-400">6 happy hours active now</span>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar accent={accent} />
    </div>
  );
}

function BottomTabBar({ accent }: { accent: string }) {
  const inactive = 'rgba(255,255,255,0.5)';
  return (
    <div className="mt-auto border-t border-white/10 px-1 pt-1.5 pb-1 flex justify-around items-center bg-[#1A1A1A]">
      <TabItem label="Home" color={inactive} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inactive} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>} />
      <TabItem label="Search" color={inactive} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inactive} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>} />
      <div className="flex flex-col items-center gap-0.5 relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inactive} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49" /><circle cx="12" cy="12" r="2" /></svg>
        <div className="relative">
          <span className="text-[4px] italic absolute -top-[5px] -left-[1px]" style={{ color: inactive }}>the</span>
          <span className="text-[7px] font-semibold" style={{ color: inactive }}>Move</span>
        </div>
      </div>
      <TabItem label="Favorites" color={inactive} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inactive} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>} />
      <TabItem label="Profile" color={inactive} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inactive} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
    </div>
  );
}

function TabItem({ label, color, icon }: { label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {icon}
      <span className="text-[7px]" style={{ color }}>{label}</span>
    </div>
  );
}
