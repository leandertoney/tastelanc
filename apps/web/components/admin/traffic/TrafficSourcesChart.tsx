'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SourceData {
  source: string;
  count: number;
  percentage: number;
}

interface TrafficSourcesChartProps {
  data: SourceData[];
}

const SOURCE_COLORS: Record<string, string> = {
  Google: '#4285F4',
  Direct: '#10b981',
  Instagram: '#E4405F',
  TikTok: '#000000',
  Facebook: '#1877F2',
  Linktree: '#43E55E',
  Bing: '#008373',
  Email: '#f59e0b',
  Twitter: '#1DA1F2',
  Other: '#6b7280',
};

export default function TrafficSourcesChart({ data }: TrafficSourcesChartProps) {
  if (!data.length) {
    return (
      <div className="bg-tastelanc-card rounded-xl p-6 h-full">
        <h3 className="text-tastelanc-text-primary font-semibold mb-4">Traffic Sources</h3>
        <div className="h-48 flex items-center justify-center text-tastelanc-text-muted text-sm">
          No source data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-tastelanc-card rounded-xl p-6 h-full">
      <h3 className="text-tastelanc-text-primary font-semibold mb-4">Traffic Sources</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="source"
            width={80}
            tick={{ fill: '#d1d5db', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#f3f4f6',
              fontSize: 13,
            }}
            formatter={(value) => [
              `${Number(value).toLocaleString()}`,
              'Views'
            ]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={index} fill={SOURCE_COLORS[entry.source] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
