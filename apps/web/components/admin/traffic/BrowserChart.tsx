'use client';

interface BrowserData {
  name: string;
  count: number;
  percentage: number;
}

interface BrowserChartProps {
  data: BrowserData[];
}

const BROWSER_COLORS: Record<string, string> = {
  Chrome: '#4285F4',
  Safari: '#007AFF',
  Firefox: '#FF7139',
  Edge: '#0078D7',
  Opera: '#FF1B2D',
  IE: '#0076D6',
  Other: '#6b7280',
};

export default function BrowserChart({ data }: BrowserChartProps) {
  if (!data.length) {
    return (
      <div className="bg-tastelanc-card rounded-xl p-6 h-full">
        <h3 className="text-tastelanc-text-primary font-semibold mb-4">Browsers</h3>
        <div className="h-48 flex items-center justify-center text-tastelanc-text-muted text-sm">
          No browser data yet
        </div>
      </div>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <div className="bg-tastelanc-card rounded-xl p-6 h-full">
      <h3 className="text-tastelanc-text-primary font-semibold mb-4">Browsers</h3>
      <div className="space-y-3">
        {data.map((browser) => (
          <div key={browser.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-tastelanc-text-secondary">{browser.name}</span>
              <span className="text-tastelanc-text-primary font-medium">{browser.percentage}%</span>
            </div>
            <div className="w-full bg-tastelanc-surface-light rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${(browser.count / maxCount) * 100}%`,
                  backgroundColor: BROWSER_COLORS[browser.name] || '#6b7280',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
