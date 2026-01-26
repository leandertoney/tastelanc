import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = "TasteLanc - Discover Lancaster's Best Dining & Nightlife";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const logoData = await fetch(
    new URL('../public/icons/icon-512.png', import.meta.url)
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
          backgroundColor: '#121212',
          padding: '60px',
        }}
      >
        <img src={logoSrc} alt="" width={220} height={220} />
        <div
          style={{
            display: 'flex',
            fontSize: '42px',
            color: '#C4A962',
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: '32px',
          }}
        >
          Discover Lancaster&apos;s Best Dining &amp; Nightlife
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '24px',
            color: '#9CA3AF',
            marginTop: '16px',
            textAlign: 'center',
          }}
        >
          Restaurants · Happy Hours · Events · Nightlife
        </div>
      </div>
    ),
    { ...size }
  );
}
