import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '🎉 Industry Party - Exclusive Event';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Party colors - Terracotta & Gold
const TERRACOTTA = '#C84B31';
const TERRACOTTA_DARK = '#8B2F1A';
const GOLD = '#F0D060';
const BG_DARK = '#1C0800';

export default async function Image() {
  const logoData = await fetch(
    new URL('../../../public/icons/icon-512.png', import.meta.url)
  ).then((res) => res.arrayBuffer());

  const logoSrc = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${TERRACOTTA_DARK} 0%, ${BG_DARK} 50%, ${BG_DARK} 100%)`,
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '40px',
            fontSize: '72px',
          }}
        >
          🎉
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '40px',
            fontSize: '72px',
          }}
        >
          🍾
        </div>

        {/* Logo */}
        <img src={logoSrc} alt="" width={160} height={160} />

        {/* Eyebrow */}
        <div
          style={{
            display: 'flex',
            fontSize: '18px',
            color: GOLD,
            fontWeight: 'bold',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            marginTop: '24px',
            opacity: 0.8,
          }}
        >
          Post-Restaurant Week
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            fontSize: '82px',
            color: GOLD,
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: '16px',
            letterSpacing: '-2px',
          }}
        >
          Industry Party
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: '32px',
            color: GOLD,
            marginTop: '20px',
            textAlign: 'center',
            opacity: 0.75,
            maxWidth: '900px',
          }}
        >
          Exclusive industry-only event • Free food & drinks
        </div>

        {/* CTA Badge */}
        <div
          style={{
            display: 'flex',
            marginTop: '40px',
            padding: '20px 48px',
            background: TERRACOTTA,
            borderRadius: '16px',
            fontSize: '28px',
            color: GOLD,
            fontWeight: 'bold',
            letterSpacing: '1px',
          }}
        >
          RSVP NOW
        </div>
      </div>
    ),
    { ...size }
  );
}
