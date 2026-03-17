'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

interface DeviceData {
  type: string;
  count: number;
  percentage: number;
}

interface DeviceBreakdownChartProps {
  data: DeviceData[];
}

const DEVICE_COLORS: Record<string, string> = {
  Desktop: '#8b5cf6',
  Mobile: '#06b6d4',
  Tablet: '#f59e0b',
};

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

export default function DeviceBreakdownChart({ data }: DeviceBreakdownChartProps) {
  if (!data.length) {
    return (
      <div className="bg-tastelanc-card rounded-xl p-6 h-full">
        <h3 className="text-tastelanc-text-primary font-semibold mb-4">Devices</h3>
        <div className="h-48 flex items-center justify-center text-tastelanc-text-muted text-sm">
          No device data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-tastelanc-card rounded-xl p-6 h-full">
      <h3 className="text-tastelanc-text-primary font-semibold mb-4">Devices</h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={DEVICE_COLORS[entry.type] || '#6b7280'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#f3f4f6',
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-3">
          {data.map((d) => {
            const Icon = DEVICE_ICONS[d.type] || Monitor;
            return (
              <div key={d.type} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DEVICE_COLORS[d.type] || '#6b7280' }}
                />
                <Icon className="w-4 h-4 text-tastelanc-text-muted" />
                <span className="text-sm text-tastelanc-text-secondary flex-1">{d.type}</span>
                <span className="text-sm font-medium text-tastelanc-text-primary">{d.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
