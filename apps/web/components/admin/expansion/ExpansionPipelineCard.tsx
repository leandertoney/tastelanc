'use client';

import Link from 'next/link';
import { MapPin, Users, Star, ArrowUpRight } from 'lucide-react';
import type { ExpansionCity } from '@/lib/ai/expansion-types';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  researching: { label: 'Researching', className: 'bg-blue-500/20 text-blue-400' },
  researched: { label: 'Researched', className: 'bg-purple-500/20 text-purple-400' },
  brand_ready: { label: 'Brand Ready', className: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: 'Approved', className: 'bg-green-500/20 text-green-400' },
  setup_in_progress: { label: 'Setting Up', className: 'bg-orange-500/20 text-orange-400' },
  live: { label: 'Live', className: 'bg-emerald-500/20 text-emerald-400' },
  on_hold: { label: 'On Hold', className: 'bg-gray-500/20 text-gray-400' },
  rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-400' },
};

interface ExpansionPipelineCardProps {
  city: ExpansionCity;
  onStatusChange?: (id: string, status: string) => void;
}

export default function ExpansionPipelineCard({ city, onStatusChange }: ExpansionPipelineCardProps) {
  const statusConfig = STATUS_CONFIG[city.status] || STATUS_CONFIG.researching;

  return (
    <Link href={`/admin/expansion/${city.id}`}>
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4 md:p-5 hover:border-tastelanc-accent/30 transition-all cursor-pointer group">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* City Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <h3 className="font-semibold text-white truncate text-lg group-hover:text-tastelanc-accent transition-colors">
                {city.city_name}
              </h3>
              <span className="text-gray-500 text-sm flex-shrink-0">{city.state}</span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {city.county} County
              </span>

              {city.population && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {city.population.toLocaleString()} pop.
                </span>
              )}

              {city.priority > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-lancaster-gold" />
                  Priority {city.priority}
                </span>
              )}
            </div>
          </div>

          {/* Market Potential Score */}
          <div className="flex items-center gap-4">
            {city.market_potential_score !== null && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Score</p>
                  <p className="text-sm font-bold text-white">{city.market_potential_score}/100</p>
                </div>
                <div className="w-16 h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${city.market_potential_score}%`,
                      backgroundColor:
                        city.market_potential_score >= 70
                          ? '#10b981'
                          : city.market_potential_score >= 40
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  />
                </div>
              </div>
            )}

            <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-tastelanc-accent transition-colors flex-shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}
