import { BRAND } from '@/config/market';

const IOS_URL = BRAND.appStoreUrls.ios;
const ANDROID_URL = BRAND.appStoreUrls.android;

interface StoreBadgesProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const HEIGHTS = { sm: 40, md: 48, lg: 54 };

export default function StoreBadges({ className = '', size = 'md' }: StoreBadgesProps) {
  const h = HEIGHTS[size];

  if (!IOS_URL && !ANDROID_URL) {
    return (
      <p className={`text-sm text-gray-500 font-medium ${className}`}>
        {BRAND.name} App — Coming Soon
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {IOS_URL && (
        <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
          <AppStoreBadge height={h} />
        </a>
      )}
      {ANDROID_URL && (
        <a href={ANDROID_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
          <GooglePlayBadge height={h} />
        </a>
      )}
    </div>
  );
}

/** Official Apple "Download on the App Store" badge - SVG recreation */
function AppStoreBadge({ height }: { height: number }) {
  const w = height * 3.375; // Standard aspect ratio
  return (
    <svg viewBox="0 0 135 40" width={w} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect width="135" height="40" rx="5" fill="#000" />
      <rect x="0.5" y="0.5" width="134" height="39" rx="4.5" stroke="#A6A6A6" strokeWidth="1" fill="none" />
      {/* Apple logo */}
      <g fill="#fff">
        <path d="M24.77 20.3a4.95 4.95 0 012.36-4.15 5.07 5.07 0 00-3.99-2.16c-1.68-.18-3.31 1.01-4.17 1.01-.87 0-2.19-.99-3.62-.96a5.32 5.32 0 00-4.48 2.73c-1.93 3.34-.49 8.27 1.36 10.97.93 1.33 2.02 2.81 3.44 2.76 1.39-.06 1.92-.89 3.6-.89 1.68 0 2.16.89 3.62.86 1.49-.02 2.44-1.33 3.33-2.67a10.96 10.96 0 001.52-3.09 4.78 4.78 0 01-2.97-4.41z" />
        <path d="M22.04 12.21a4.87 4.87 0 001.12-3.49 4.96 4.96 0 00-3.21 1.66 4.64 4.64 0 00-1.15 3.36 4.1 4.1 0 003.24-1.53z" />
      </g>
      {/* "Download on the" text */}
      <g fill="#fff" style={{ fontSize: '7.5px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <text x="36" y="15.5" style={{ fontSize: '7.5px', letterSpacing: '0.03em' }}>Download on the</text>
      </g>
      {/* "App Store" text */}
      <g fill="#fff" style={{ fontSize: '16px', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'bold' }}>
        <text x="36" y="31" style={{ fontSize: '16px', fontWeight: 600 }}>App Store</text>
      </g>
    </svg>
  );
}

/** Official Google "Get it on Google Play" badge - SVG recreation */
function GooglePlayBadge({ height }: { height: number }) {
  const w = height * 3.375;
  return (
    <svg viewBox="0 0 135 40" width={w} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect width="135" height="40" rx="5" fill="#000" />
      <rect x="0.5" y="0.5" width="134" height="39" rx="4.5" stroke="#A6A6A6" strokeWidth="1" fill="none" />
      {/* Play triangle icon */}
      <g transform="translate(12, 7)">
        <defs>
          <linearGradient id="gp1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00C3FF" />
            <stop offset="100%" stopColor="#1BE7B6" />
          </linearGradient>
          <linearGradient id="gp2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFCE00" />
            <stop offset="100%" stopColor="#FF3A44" />
          </linearGradient>
        </defs>
        <path d="M1.5 1.2C1.2 1.5 1 2 1 2.6v20.8c0 .6.2 1.1.5 1.4L1.6 25 12.5 13 1.6 1l-.1.2z" fill="url(#gp1)" />
        <path d="M16.1 16.6l-3.6 3.6 3.6 3.6c.4-.2 3.3-1.9 3.3-1.9.9-.5.9-1.3 0-1.9l-3.3-3.4z" fill="#FFCE00" />
        <path d="M1.5 24.8c.3.3.8.4 1.3.1l13.3-7.6-3.6-3.6L1.5 24.8z" fill="#FF3A44" />
        <path d="M1.5 1.2l11 11.1 3.6-3.6L2.8 1.1c-.5-.3-1-.2-1.3.1z" fill="#4CAF50" />
      </g>
      {/* "GET IT ON" text */}
      <g fill="#fff" style={{ fontSize: '7px', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.08em' }}>
        <text x="37" y="15" style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>GET IT ON</text>
      </g>
      {/* "Google Play" text */}
      <g fill="#fff" style={{ fontSize: '14.5px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <text x="37" y="30.5" style={{ fontSize: '14.5px', fontWeight: 500 }}>Google Play</text>
      </g>
    </svg>
  );
}
