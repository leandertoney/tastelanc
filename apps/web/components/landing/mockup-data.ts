/**
 * Market-specific data for landing page phone mockups.
 * Each market gets its own theme colors and restaurant content.
 */

import { MARKET_SLUG } from '@/config/market';

const IMG = (id: string) => `https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurants/${id}/cover.jpg`;
const SUPABASE_IMG = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurants';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MockupTheme {
  bg: string;
  cardBg: string;
  surfaceBg: string;
  textColor: string;
  mutedText: string;
  borderColor: string;
  tabBarBg: string;
}

interface HHBanner { name: string; deal: string; time: string; imageUrl: string }
interface FeaturedItem { name: string; cuisine: string; imageUrl: string; tier?: 'elite' }
interface HHListItem { name: string; hh: string; deal: string; time: string; imageUrl: string }
interface ChatRec { name: string; detail: string; imageUrl: string }

export interface MockupMarketData {
  theme: MockupTheme;
  showTFK: boolean;
  hhBanners: HHBanner[];
  featured: FeaturedItem[];
  hhList: HHListItem[];
  chatRecs: ChatRec[];
  hhActiveCount: number;
}

// ─── Lancaster ──────────────────────────────────────────────────────────────

const lancasterData: MockupMarketData = {
  theme: {
    bg: '#1A1A1A',
    cardBg: '#252525',
    surfaceBg: '#2A2A2A',
    textColor: '#FFFFFF',
    mutedText: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(255,255,255,0.1)',
    tabBarBg: '#1A1A1A',
  },
  showTFK: true,
  hhBanners: [
    { name: 'Tellus 360', deal: '$5 Craft Drafts', time: '4-6pm', imageUrl: IMG('a1ce96aa-4cc0-4dc3-ab03-d61c3d104db5') },
    { name: 'Trio Bar & Grill', deal: 'Half-Price Apps', time: '5-7pm', imageUrl: IMG('53deabc0-7d15-4a5e-80c2-2dac17b5a4bc') },
  ],
  featured: [
    { name: 'Marion Court Room', cuisine: 'Pub Fare', imageUrl: IMG('6304c5cf-bdf3-413c-9fff-592562a1ddde'), tier: 'elite' },
    { name: 'The Fridge', cuisine: 'Italian', imageUrl: IMG('ffbb8eb2-bd67-4c4d-bd23-f7c0f6f34030') },
  ],
  hhList: [
    { name: '551 West', hh: 'Wind Down', deal: '$5 Craft Drafts', time: '4-6pm', imageUrl: IMG('986f5834-f06d-4c2f-857e-c6964fc28d1d') },
    { name: 'Decades Lancaster', hh: 'Late Night Sips', deal: '$3 Well Drinks', time: '9-11pm', imageUrl: IMG('7f0225df-d0d3-4c5d-9b06-fbc84093052d') },
    { name: 'Station House', hh: 'Power Hour', deal: 'Half-Price Apps', time: '5-7pm', imageUrl: IMG('9134761b-5eb3-4801-ba17-e5fa37de7c08') },
    { name: 'QSB', hh: 'Golden Hour', deal: '$4 House Wine', time: '3-6pm', imageUrl: IMG('c1eb8e6f-9415-41cf-8fba-ef5a852a390e') },
    { name: 'Marietta Tavern', hh: 'Tavern Hour', deal: '$6 Cocktails', time: '4-7pm', imageUrl: IMG('69067dc3-6e68-469a-aeda-06fbfe5d2d03') },
    { name: 'Lucky Dog Cafe', hh: 'Patio Hour', deal: '$5 House Brews', time: '4-6pm', imageUrl: IMG('92724a5a-5e9f-4015-a6bb-8e6eb8018445') },
  ],
  chatRecs: [
    { name: 'The Gloomy Rooster', detail: 'American &middot; Downtown', imageUrl: `${SUPABASE_IMG}/gloomy-rooster-cover.png` },
    { name: 'Cabbage Hill', detail: 'German &middot; Schnitzel Haus', imageUrl: IMG('f2fbcb96-0ea3-4c7b-a9a6-4e4231753071') },
    { name: 'Conestoga Restaurant', detail: 'Contemporary &middot; Fine Dining', imageUrl: IMG('559c9628-e0d7-4c25-868b-5c1401bac770') },
  ],
  hhActiveCount: 6,
};

// ─── Cumberland ─────────────────────────────────────────────────────────────

const cumberlandData: MockupMarketData = {
  theme: {
    bg: '#F4EBDD',
    cardBg: '#0F1E2E',
    surfaceBg: '#162638',
    textColor: '#0F1E2E',
    mutedText: 'rgba(15,30,46,0.5)',
    borderColor: 'rgba(15,30,46,0.1)',
    tabBarBg: '#F4EBDD',
  },
  showTFK: false,
  hhBanners: [
    { name: 'Back Porch Brewing', deal: '$4 Craft Pints', time: '4-6pm', imageUrl: 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurant-covers/back-porch-brewing.jpg' },
    { name: 'Caddy Shack', deal: 'Half-Price Apps', time: '5-7pm', imageUrl: 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurant-photos/9d64d846-931a-4e1c-8d35-296b008f728e/1774142165203.jpg' },
  ],
  featured: [
    { name: 'Back Porch Brewing', cuisine: 'Brewery', imageUrl: 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurant-covers/back-porch-brewing.jpg', tier: 'elite' },
    { name: 'Caddy Shack', cuisine: 'Sports Bar', imageUrl: 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurant-photos/9d64d846-931a-4e1c-8d35-296b008f728e/1774142165203.jpg', tier: 'elite' },
  ],
  hhList: [
    { name: '1700 Degrees', hh: 'Steak Night', deal: '$8 Martinis', time: '5-7pm', imageUrl: IMG('8232d0c9-ec1c-401e-b954-24ed7518edf5') },
    { name: 'Whiskey Rebellion', hh: 'Rebel Hour', deal: '$5 Bourbon', time: '4-6pm', imageUrl: IMG('99d22072-54e6-4ff5-b8b9-a0268e162968') },
    { name: 'Ad Lib Kitchen', hh: 'Craft Hour', deal: '$4 Drafts', time: '4-6pm', imageUrl: IMG('be974c99-27c8-4f73-9d3d-29d08c27c12c') },
    { name: '704 Lounge', hh: 'Lounge Hour', deal: '$6 Cocktails', time: '5-7pm', imageUrl: IMG('415d7ac6-5c54-4e4b-af82-6ce6ca0ebff6') },
    { name: '306 Sports Bar', hh: 'Game Time', deal: '$3 Domestics', time: '4-7pm', imageUrl: IMG('8c24ea37-cea1-4fdd-8a1a-b46186e067f7') },
    { name: '717 Tacos', hh: 'Taco Hour', deal: '$2 Tacos', time: '3-6pm', imageUrl: IMG('913eaa7b-7269-4e73-a7f1-b95a0d66ee8a') },
  ],
  chatRecs: [
    { name: '1700 Degrees', detail: 'Steakhouse &middot; Fine Dining', imageUrl: IMG('8232d0c9-ec1c-401e-b954-24ed7518edf5') },
    { name: 'Whiskey Rebellion', detail: 'American &middot; Historic', imageUrl: IMG('99d22072-54e6-4ff5-b8b9-a0268e162968') },
    { name: 'Ad Lib Kitchen', detail: 'Craft &middot; Contemporary', imageUrl: IMG('be974c99-27c8-4f73-9d3d-29d08c27c12c') },
  ],
  hhActiveCount: 4,
};

// ─── Fayetteville ───────────────────────────────────────────────────────────

const fayettevilleData: MockupMarketData = {
  theme: {
    bg: '#040F1A',
    cardBg: '#0A1929',
    surfaceBg: '#0E2236',
    textColor: '#FFFFFF',
    mutedText: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(255,255,255,0.1)',
    tabBarBg: '#040F1A',
  },
  showTFK: false,
  hhBanners: [
    { name: '316 Oyster Bar', deal: '$1 Oysters', time: '4-6pm', imageUrl: IMG('1ab9f520-86fb-41cf-abfb-449266f7fb84') },
    { name: '22 Klicks Bar', deal: 'Half-Price Apps', time: '5-7pm', imageUrl: IMG('dc8b491b-92cf-4a33-93fc-87e0d48b8878') },
  ],
  featured: [
    { name: '316 Oyster Bar', cuisine: 'Seafood', imageUrl: IMG('1ab9f520-86fb-41cf-abfb-449266f7fb84') },
    { name: '4th Course', cuisine: 'Wine & Desserts', imageUrl: IMG('98217421-a42a-4641-82dd-515602c9db1b') },
  ],
  hhList: [
    { name: '22 Klicks', hh: 'Military Hour', deal: '$4 Drafts', time: '4-6pm', imageUrl: IMG('dc8b491b-92cf-4a33-93fc-87e0d48b8878') },
    { name: '210 Fish Market', hh: 'Catch Hour', deal: '$5 House Wine', time: '4-6pm', imageUrl: IMG('dbf9dba8-295a-470a-b47f-7ad4272e8d3e') },
    { name: '301 Wingz', hh: 'Wing Night', deal: '$0.50 Wings', time: '5-8pm', imageUrl: IMG('f6ac1296-a402-4dc6-89a7-89d2a8b59786') },
    { name: 'A Bit of Carolina', hh: 'Southern Hour', deal: '$5 Sweet Tea Cocktails', time: '4-7pm', imageUrl: IMG('74ba5dff-5307-419b-af82-9444520fad23') },
    { name: '316 Oyster Bar', hh: 'Shuck Hour', deal: '$1 Oysters', time: '4-6pm', imageUrl: IMG('1ab9f520-86fb-41cf-abfb-449266f7fb84') },
    { name: '4th Course', hh: 'Wine Down', deal: '$6 Glass Pours', time: '5-7pm', imageUrl: IMG('98217421-a42a-4641-82dd-515602c9db1b') },
  ],
  chatRecs: [
    { name: '316 Oyster Bar', detail: 'Seafood &middot; Raw Bar', imageUrl: IMG('1ab9f520-86fb-41cf-abfb-449266f7fb84') },
    { name: 'A Bit of Carolina', detail: 'Southern &middot; Comfort Food', imageUrl: IMG('74ba5dff-5307-419b-af82-9444520fad23') },
    { name: '4th Course', detail: 'Wine Bar &middot; Desserts', imageUrl: IMG('98217421-a42a-4641-82dd-515602c9db1b') },
  ],
  hhActiveCount: 4,
};

// ─── Export ─────────────────────────────────────────────────────────────────

const MARKET_MOCKUP_DATA: Record<string, MockupMarketData> = {
  'lancaster-pa': lancasterData,
  'cumberland-pa': cumberlandData,
  'fayetteville-nc': fayettevilleData,
};

export const mockupData: MockupMarketData = MARKET_MOCKUP_DATA[MARKET_SLUG] || lancasterData;
