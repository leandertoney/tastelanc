import Image from 'next/image';
import { BRAND } from '@/config/market';

// Real Lancaster premium restaurant images — no repeats from other screens
const SUPABASE_IMG = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurants';
const IMG = (id: string) => `${SUPABASE_IMG}/${id}/cover.jpg`;
const IMAGES = {
  gloomyRooster: `${SUPABASE_IMG}/gloomy-rooster-cover.png`,                // The Gloomy Rooster — premium
  cabbageHill:   IMG('f2fbcb96-0ea3-4c7b-a9a6-4e4231753071'),              // Cabbage Hill Schnitzel Haus — premium
  conestoga:     IMG('559c9628-e0d7-4c25-868b-5c1401bac770'),              // Conestoga Restaurant — premium
};

export default function MockupChatScreen() {
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

      {/* Chat header with AI avatar */}
      <div className="px-4 pt-1 pb-2.5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative">
          {BRAND.aiAvatarImage ? (
            <Image src={BRAND.aiAvatarImage} alt={BRAND.aiName} fill className="object-cover" sizes="32px" />
          ) : (
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold">{BRAND.aiName}</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-[7px] text-green-400">Online</p>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 px-3 py-3 flex flex-col gap-2 overflow-hidden">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[78%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm text-[9px] leading-relaxed" style={{ backgroundColor: accent }}>
            What are some popular spots to eat tonight?
          </div>
        </div>

        {/* AI response */}
        <div className="flex gap-1.5 items-start">
          <div className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden mt-0.5 relative">
            {BRAND.aiAvatarImage ? (
              <Image src={BRAND.aiAvatarImage} alt="" fill className="object-cover" sizes="20px" />
            ) : (
              <div className="w-full h-full rounded-full" style={{ backgroundColor: accent }} />
            )}
          </div>
          <div className="max-w-[82%]">
            <div className="bg-[#252525] px-2.5 py-1.5 rounded-2xl rounded-tl-sm">
              <p className="text-[9px] leading-relaxed">
                Here are 3 local favorites people love right now! 🍽️
              </p>
            </div>

            {/* Inline restaurant cards — real Lancaster premium partners */}
            <div className="mt-1.5 flex flex-col gap-1">
              <RestaurantMiniCard
                name="The Gloomy Rooster"
                detail="American &middot; Downtown"
                imageUrl={IMAGES.gloomyRooster}
                accent={accent}
              />
              <RestaurantMiniCard
                name="Cabbage Hill"
                detail="German &middot; Schnitzel Haus"
                imageUrl={IMAGES.cabbageHill}
                accent={accent}
              />
              <RestaurantMiniCard
                name="Conestoga Restaurant"
                detail="Contemporary &middot; Fine Dining"
                imageUrl={IMAGES.conestoga}
                accent={accent}
              />
            </div>
          </div>
        </div>

        {/* User follow-up */}
        <div className="flex justify-end">
          <div className="max-w-[78%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm text-[9px] leading-relaxed" style={{ backgroundColor: accent }}>
            Which one is best for a date night?
          </div>
        </div>

        {/* AI typing indicator */}
        <div className="flex gap-1.5 items-start">
          <div className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden mt-0.5 relative">
            {BRAND.aiAvatarImage ? (
              <Image src={BRAND.aiAvatarImage} alt="" fill className="object-cover" sizes="20px" />
            ) : (
              <div className="w-full h-full rounded-full" style={{ backgroundColor: accent }} />
            )}
          </div>
          <div className="bg-[#252525] px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="px-3 pb-7 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 bg-[#252525] rounded-full px-3 py-2">
          <span className="text-[9px] text-white/30 flex-1">Ask {BRAND.aiName} anything...</span>
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function RestaurantMiniCard({ name, detail, imageUrl, accent }: { name: string; detail: string; imageUrl: string; accent: string }) {
  return (
    <div className="bg-[#2A2A2A] rounded-lg p-1.5 flex items-center gap-2">
      <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 relative">
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="36px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] font-semibold truncate">{name}</p>
        <p className="text-[7px] text-white/50 truncate" dangerouslySetInnerHTML={{ __html: detail }} />
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" className="flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
    </div>
  );
}
