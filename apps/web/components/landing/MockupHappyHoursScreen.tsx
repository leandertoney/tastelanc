import Image from 'next/image';
import { BRAND } from '@/config/market';
import { mockupData } from './mockup-data';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TODAY_INDEX = new Date().getDay();

export default function MockupHappyHoursScreen() {
  const accent = BRAND.colors.accent;
  const { theme, hhList, hhActiveCount } = mockupData;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.bg, color: theme.textColor }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-14 pb-1">
        <span className="text-[10px] font-semibold" style={{ color: theme.textColor }}>9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-2 rounded-[2px] relative" style={{ border: `1px solid ${theme.mutedText}` }}>
            <div className="absolute inset-[1px] right-[2px] rounded-[1px]" style={{ backgroundColor: theme.mutedText }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 pt-1 pb-2">
        <p className="text-[14px] font-bold" style={{ color: theme.textColor }}>Happy Hours</p>
        <p className="text-[9px] mt-0.5" style={{ color: theme.mutedText }}>What&apos;s pouring in {BRAND.countyShort}</p>
      </div>

      {/* Day-of-week tabs */}
      <div className="px-4 pb-2.5">
        <div className="flex gap-1.5">
          {DAYS.map((day, i) => (
            <div
              key={i}
              className="flex-1 h-7 rounded-lg flex items-center justify-center text-[9px] font-semibold"
              style={{
                backgroundColor: i === TODAY_INDEX ? accent : theme.cardBg,
                color: i === TODAY_INDEX ? '#FFFFFF' : theme.mutedText,
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Happy hour list */}
      <div className="px-4 flex flex-col gap-2.5 flex-1 overflow-hidden">
        {hhList.map((hh, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative">
              <Image src={hh.imageUrl} alt="" fill className="object-cover" sizes="44px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate" style={{ color: theme.textColor }}>{hh.name}</p>
              <p className="text-[8px] truncate" style={{ color: theme.mutedText }}>{hh.hh} &middot; {hh.deal}</p>
            </div>
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-md flex-shrink-0" style={{ backgroundColor: `${accent}25` }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <span className="text-[7px] font-bold" style={{ color: accent }}>{hh.time}</span>
            </div>
          </div>
        ))}

        {/* Active now indicator */}
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[8px] text-green-400">{hhActiveCount} happy hours active now</span>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="mt-auto px-1 pt-1.5 pb-1 flex justify-around items-center" style={{ backgroundColor: theme.tabBarBg, borderTop: `1px solid ${theme.borderColor}` }}>
        <TabItem label="Home" color={theme.mutedText} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.mutedText} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>} />
        <TabItem label="Search" color={theme.mutedText} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.mutedText} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>} />
        <div className="flex flex-col items-center gap-0.5 relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.mutedText} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49" /><circle cx="12" cy="12" r="2" /></svg>
          <div className="relative">
            <span className="text-[4px] italic absolute -top-[5px] -left-[1px]" style={{ color: theme.mutedText }}>the</span>
            <span className="text-[7px] font-semibold" style={{ color: theme.mutedText }}>Move</span>
          </div>
        </div>
        <TabItem label="Favorites" color={theme.mutedText} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.mutedText} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>} />
        <TabItem label="Profile" color={theme.mutedText} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.mutedText} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
      </div>
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
