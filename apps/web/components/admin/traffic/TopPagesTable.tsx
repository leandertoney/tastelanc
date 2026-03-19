'use client';

import { Smartphone, Globe } from 'lucide-react';

interface PageData {
  path: string;
  views: number;
  uniqueVisitors: number;
  restaurantSlug?: string | null;
}

interface TopPagesTableProps {
  data: PageData[];
  title?: string;
}

// Extract UUID from mobile paths like /mobile/restaurantdetail/UUID
const MOBILE_UUID_PATTERN = /^\/mobile\/\w+\/([0-9a-f-]{36})$/i;

function isMobilePath(path: string): boolean {
  return path.startsWith('/mobile/');
}

function prettifyPath(path: string): string {
  if (path === '/') return 'Home';

  // Mobile app paths — make human-readable
  if (isMobilePath(path)) {
    const clean = path.replace('/mobile/', '');
    if (clean.startsWith('restaurantdetail/')) return 'Restaurant Detail';
    if (clean.startsWith('restauranthappyhours/')) return 'Happy Hours';
    if (clean.startsWith('eventdetail/')) return 'Event Detail';
    if (clean.startsWith('restaurantspecials/')) return 'Specials';
    if (clean.startsWith('restaurantmenu/')) return 'Menu';
    return clean
      .split('/')[0]
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\s/, '')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  return path
    .replace(/^\//, '')
    .replace(/\//g, ' / ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getLink(path: string, restaurantSlug?: string | null): string | null {
  if (isMobilePath(path)) {
    if (!restaurantSlug) return null;
    const clean = path.replace('/mobile/', '');
    if (clean.startsWith('restauranthappyhours/')) return `/restaurants/${restaurantSlug}/happy-hours`;
    if (clean.startsWith('restaurantspecials/')) return `/restaurants/${restaurantSlug}/specials`;
    if (clean.startsWith('restaurantmenu/')) return `/restaurants/${restaurantSlug}/menu`;
    if (clean.startsWith('restaurantdetail/')) return `/restaurants/${restaurantSlug}`;
    // eventdetail and others link to the restaurant main page as fallback
    if (MOBILE_UUID_PATTERN.test(path)) return `/restaurants/${restaurantSlug}`;
    return null;
  }
  // Web paths link directly
  return path;
}

export default function TopPagesTable({ data, title = 'Top Pages' }: TopPagesTableProps) {
  if (!data.length) {
    return (
      <div className="bg-tastelanc-card rounded-xl p-6 h-full">
        <h3 className="text-tastelanc-text-primary font-semibold mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center text-tastelanc-text-muted text-sm">
          No page data yet
        </div>
      </div>
    );
  }

  const maxViews = data[0]?.views || 1;

  return (
    <div className="bg-tastelanc-card rounded-xl p-6 h-full">
      <h3 className="text-tastelanc-text-primary font-semibold mb-4">{title}</h3>
      <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
        {data.map((page, i) => {
          const link = getLink(page.path, page.restaurantSlug);
          const mobile = isMobilePath(page.path);
          const label = prettifyPath(page.path);

          return (
            <div key={page.path} className="group">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-tastelanc-text-faint w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 truncate">
                      {mobile ? (
                        <Smartphone className="w-3.5 h-3.5 text-tastelanc-text-faint flex-shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-tastelanc-text-faint flex-shrink-0" />
                      )}
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-tastelanc-text-secondary truncate hover:text-tastelanc-accent hover:underline transition-colors"
                          title={page.path}
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="text-tastelanc-text-secondary truncate" title={page.path}>
                          {label}
                        </span>
                      )}
                    </span>
                    <span className="text-tastelanc-text-primary font-medium ml-2 flex-shrink-0">
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-tastelanc-surface-light rounded-full h-1.5">
                    <div
                      className="bg-tastelanc-accent h-1.5 rounded-full transition-all"
                      style={{ width: `${(page.views / maxViews) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
