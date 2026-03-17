'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrafficKPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  delta?: number | null; // percentage change vs previous period
  pulse?: boolean; // for "Active Now"
}

export default function TrafficKPICard({ label, value, icon, delta, pulse }: TrafficKPICardProps) {
  return (
    <div className="bg-tastelanc-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-tastelanc-text-muted text-sm">{label}</span>
        <div className="text-tastelanc-text-muted">{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-tastelanc-text-primary">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {pulse && (
          <span className="relative flex h-3 w-3 mb-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        )}
      </div>
      {delta !== undefined && delta !== null && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${delta >= 0 ? 'text-green-500' : 'text-red-400'}`}>
          {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{delta >= 0 ? '+' : ''}{delta}% vs prev period</span>
        </div>
      )}
    </div>
  );
}
