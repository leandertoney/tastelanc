import { type Metadata } from 'next';
import { BRAND } from '@/config/market';
import { GameScreen } from '@/components/game/GameScreen';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export const metadata: Metadata = {
  title: `How Well Do You Know ${BRAND.countyShort}'s Food Scene? | ${BRAND.name}`,
  description: `Think you know ${BRAND.countyShort}'s restaurants? Swipe true or false and prove it. 10 quick rounds.`,
  openGraph: {
    title: `How Well Do You Know ${BRAND.countyShort}'s Food Scene?`,
    description: `Think you know ${BRAND.countyShort}'s restaurants? Swipe true or false and prove it.`,
    url: `${siteUrl}/play`,
    type: 'website',
    images: [{ url: `${siteUrl}/play/opengraph-image`, alt: `${BRAND.name} Food Challenge` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `How Well Do You Know ${BRAND.countyShort}'s Food Scene?`,
    description: `Think you know ${BRAND.countyShort}'s restaurants? Swipe true or false and prove it.`,
    images: [`${siteUrl}/play/opengraph-image`],
  },
};

export default function PlayPage() {
  return <GameScreen />;
}
