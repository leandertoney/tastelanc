import { ImageResponse } from 'next/og';
import { BRAND } from '@/config/market';

export const runtime = 'edge';
export const alt = `${BRAND.name} Food Challenge`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ searchParams }: { searchParams: { score?: string; total?: string } }) {
  const score = searchParams.score ? parseInt(searchParams.score, 10) : null;
  const total = searchParams.total ? parseInt(searchParams.total, 10) : 10;

  const hasScore = score !== null && !isNaN(score);

  let tierLabel = '';
  let tierEmoji = '';
  if (hasScore) {
    if (score >= 9) { tierLabel = 'Legend'; tierEmoji = '👑'; }
    else if (score >= 7) { tierLabel = 'Foodie'; tierEmoji = '🔥'; }
    else if (score >= 4) { tierLabel = 'Local'; tierEmoji = '⭐'; }
    else { tierLabel = 'Rookie'; tierEmoji = '🍴'; }
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand */}
        <div style={{ color: '#888', fontSize: 24, letterSpacing: '0.15em', marginBottom: 20, textTransform: 'uppercase' as const, display: 'flex' }}>
          {BRAND.name}
        </div>

        {hasScore ? (
          <>
            {/* Score display */}
            <div style={{ fontSize: 100, fontWeight: 800, color: 'white', display: 'flex', marginBottom: 10 }}>
              {tierEmoji} {score}/{total}
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: '#ccc', display: 'flex', marginBottom: 30 }}>
              {tierLabel}
            </div>
            <div style={{ fontSize: 28, color: '#888', display: 'flex' }}>
              Can you beat my score?
            </div>
          </>
        ) : (
          <>
            {/* Generic card */}
            <div style={{ fontSize: 56, fontWeight: 800, color: 'white', textAlign: 'center', maxWidth: 800, lineHeight: 1.2, display: 'flex' }}>
              How well do you know {BRAND.countyShort}&apos;s food scene?
            </div>
            <div style={{ fontSize: 28, color: '#888', marginTop: 30, display: 'flex' }}>
              Swipe to find out →
            </div>
          </>
        )}
      </div>
    ),
    { ...size }
  );
}
