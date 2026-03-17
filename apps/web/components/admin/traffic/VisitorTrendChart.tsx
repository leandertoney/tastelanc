'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendDataPoint {
  date: string;
  views: number;
  visitors: number;
}

interface VisitorTrendChartProps {
  data: TrendDataPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function VisitorTrendChart({ data }: VisitorTrendChartProps) {
  if (!data.length) {
    return (
      <div className="bg-tastelanc-card rounded-xl p-6">
        <h3 className="text-tastelanc-text-primary font-semibold mb-4">Visitor Trends</h3>
        <div className="h-64 flex items-center justify-center text-tastelanc-text-muted text-sm">
          No trend data available yet
        </div>
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="bg-tastelanc-card rounded-xl p-6">
      <h3 className="text-tastelanc-text-primary font-semibold mb-4">Visitor Trends</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
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
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
          />
          <Area
            type="monotone"
            dataKey="views"
            name="Page Views"
            stroke="#8b5cf6"
            fill="url(#colorViews)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            name="Visitors"
            stroke="#06b6d4"
            fill="url(#colorVisitors)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
