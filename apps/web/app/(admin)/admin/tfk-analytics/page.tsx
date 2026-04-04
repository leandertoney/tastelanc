'use client';

import { useEffect, useState } from 'react';
import { Eye, MousePointer, Users, TrendingUp, Trophy, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui';

const TFK_GOLD = '#C9A84C';
const TFK_NAVY = '#1B2A4A';

const DAYS_SHORT: Record<string, string> = {
  Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};

interface Summary {
  totalImpressions: number;
  totalClicks: number;
  uniqueViewers: number;
  ctr: number;
}

interface VenueRow {
  restaurantId: string;
  name: string;
  slug: string;
  impressions: number;
  clicks: number;
  uniqueViewers: number;
  ctr: number;
  days: string[];
}

interface WeekRow {
  week: string;
  impressions: number;
  clicks: number;
}

interface DayRow {
  day: string;
  impressions: number;
}

interface TFKData {
  summary: Summary;
  venueBreakdown: VenueRow[];
  weeklyTrend: WeekRow[];
  dayOfWeekBreakdown: DayRow[];
  launchDate: string;
  lastUpdated: string;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Eye;
  color: string;
}) {
  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-2 md:gap-3 mb-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}22` }}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color }} />
        </div>
        <span className="text-tastelanc-text-muted text-xs md:text-sm">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{value}</p>
      {sub && <p className="text-tastelanc-text-faint text-xs mt-1">{sub}</p>}
    </Card>
  );
}

export default function TFKAnalyticsPage() {
  const [data, setData] = useState<TFKData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tfk-analytics');
      if (!res.ok) throw new Error('Failed to load');
      setData(await res.json());
    } catch {
      setError('Failed to load TFK analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const maxDayImps = Math.max(...(data?.dayOfWeekBreakdown.map(d => d.impressions) || [1]), 1);
  const maxVenueImps = Math.max(...(data?.venueBreakdown.map(v => v.impressions) || [1]), 1);
  const maxWeekImps = Math.max(...(data?.weeklyTrend.map(w => w.impressions) || [1]), 1);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: TFK_NAVY }}>
              <Trophy className="w-5 h-5" style={{ color: TFK_GOLD }} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">TFK Analytics</h1>
          </div>
          <p className="text-tastelanc-text-muted text-sm">
            Thirsty for Knowledge — partner visibility report
            {data?.launchDate && (
              <span className="ml-2 text-tastelanc-text-faint">· tracking since {data.launchDate}</span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tastelanc-surface-light text-tastelanc-text-muted hover:text-tastelanc-text-primary text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-tastelanc-text-faint text-sm">Loading…</div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
            <StatCard
              label="Total impressions"
              value={data.summary.totalImpressions.toLocaleString()}
              sub="TFK event cards seen"
              icon={Eye}
              color="#60a5fa"
            />
            <StatCard
              label="Total taps"
              value={data.summary.totalClicks.toLocaleString()}
              sub="events opened"
              icon={MousePointer}
              color={TFK_GOLD}
            />
            <StatCard
              label="Unique viewers"
              value={data.summary.uniqueViewers.toLocaleString()}
              sub="distinct app users"
              icon={Users}
              color="#a78bfa"
            />
            <StatCard
              label="Tap-through rate"
              value={`${data.summary.ctr}%`}
              sub="taps ÷ impressions"
              icon={TrendingUp}
              color="#34d399"
            />
          </div>

          {/* Empty state — no data yet */}
          {data.summary.totalImpressions === 0 && (
            <Card className="p-8 text-center mb-8">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: TFK_GOLD }} />
              <p className="text-tastelanc-text-primary font-semibold mb-1">Tracking starts today</p>
              <p className="text-tastelanc-text-faint text-sm">
                TFK went live on {data.launchDate}. Impression and tap data will appear here as users open the app.
              </p>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4 md:gap-8 mb-8">
            {/* Weekly Trend */}
            <Card className="p-4 md:p-6">
              <h2 className="text-lg font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: TFK_GOLD }} />
                Weekly Trend
              </h2>
              {data.weeklyTrend.length === 0 ? (
                <p className="text-tastelanc-text-faint text-sm text-center py-8">No data yet — check back after users open the app</p>
              ) : (
                <div className="space-y-3">
                  {data.weeklyTrend.map(row => (
                    <div key={row.week}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-tastelanc-text-muted">Week of {row.week}</span>
                        <span className="text-tastelanc-text-faint">{row.impressions.toLocaleString()} imps · {row.clicks} taps</span>
                      </div>
                      <div className="h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(row.impressions / maxWeekImps) * 100}%`, backgroundColor: TFK_GOLD }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Day of Week Heatmap */}
            <Card className="p-4 md:p-6">
              <h2 className="text-lg font-semibold text-tastelanc-text-primary mb-4">Views by Day of Week</h2>
              <div className="space-y-2">
                {data.dayOfWeekBreakdown.map(row => {
                  const pct = maxDayImps > 0 ? (row.impressions / maxDayImps) * 100 : 0;
                  return (
                    <div key={row.day} className="flex items-center gap-3">
                      <span className="text-tastelanc-text-muted text-xs w-8 flex-shrink-0">{DAYS_SHORT[row.day]}</span>
                      <div className="flex-1 h-5 bg-tastelanc-surface-light rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{ width: `${pct}%`, backgroundColor: pct > 50 ? TFK_GOLD : `${TFK_GOLD}88` }}
                        />
                      </div>
                      <span className="text-tastelanc-text-faint text-xs w-12 text-right">{row.impressions.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Venue Breakdown */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-tastelanc-text-primary mb-1">Venue Breakdown</h2>
            <p className="text-tastelanc-text-faint text-xs mb-4">All TFK venues — sorted by impressions since launch</p>
            {data.venueBreakdown.length === 0 ? (
              <p className="text-tastelanc-text-faint text-sm text-center py-8">No venue data yet</p>
            ) : (
              <>
                {/* Mobile list */}
                <div className="space-y-3 md:hidden">
                  {data.venueBreakdown.map(venue => (
                    <div key={venue.restaurantId} className="p-3 rounded-lg bg-tastelanc-surface-light/50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-tastelanc-text-primary text-sm font-medium">{venue.name}</span>
                        <span className="text-tastelanc-text-faint text-xs whitespace-nowrap">{venue.ctr}% CTR</span>
                      </div>
                      <div className="h-1.5 bg-tastelanc-surface rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(venue.impressions / maxVenueImps) * 100}%`, backgroundColor: TFK_GOLD }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs text-tastelanc-text-faint">
                        <span>{venue.impressions.toLocaleString()} imps</span>
                        <span>{venue.clicks} taps</span>
                        <span>{venue.uniqueViewers} viewers</span>
                      </div>
                      {venue.days.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {venue.days.map(d => (
                            <span key={d} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${TFK_NAVY}`, color: TFK_GOLD }}>
                              {DAYS_SHORT[d] || d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-tastelanc-surface-light">
                        <th className="text-left text-tastelanc-text-muted font-medium py-2 pr-4">Venue</th>
                        <th className="text-left text-tastelanc-text-muted font-medium py-2 pr-4">Nights</th>
                        <th className="text-right text-tastelanc-text-muted font-medium py-2 pr-4">Impressions</th>
                        <th className="text-right text-tastelanc-text-muted font-medium py-2 pr-4">Taps</th>
                        <th className="text-right text-tastelanc-text-muted font-medium py-2 pr-4">Unique Viewers</th>
                        <th className="text-right text-tastelanc-text-muted font-medium py-2 pr-4">CTR</th>
                        <th className="text-left text-tastelanc-text-muted font-medium py-2">Visibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.venueBreakdown.map((venue, i) => (
                        <tr key={venue.restaurantId} className="border-b border-tastelanc-surface-light/50">
                          <td className="py-3 pr-4">
                            <span className="text-tastelanc-text-primary">{venue.name}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-1 flex-wrap">
                              {venue.days.map(d => (
                                <span key={d} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: TFK_NAVY, color: TFK_GOLD }}>
                                  {DAYS_SHORT[d] || d}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-right py-3 pr-4 text-tastelanc-text-primary font-medium">
                            {venue.impressions.toLocaleString()}
                          </td>
                          <td className="text-right py-3 pr-4 text-tastelanc-text-secondary">
                            {venue.clicks.toLocaleString()}
                          </td>
                          <td className="text-right py-3 pr-4 text-tastelanc-text-secondary">
                            {venue.uniqueViewers.toLocaleString()}
                          </td>
                          <td className="text-right py-3 pr-4">
                            <span className={venue.ctr >= 5 ? 'text-green-400' : 'text-tastelanc-text-muted'}>
                              {venue.ctr}%
                            </span>
                          </td>
                          <td className="py-3 w-32">
                            <div className="h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(venue.impressions / maxVenueImps) * 100}%`,
                                  backgroundColor: i === 0 ? TFK_GOLD : `${TFK_GOLD}99`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {data.lastUpdated && (
            <p className="text-tastelanc-text-faint text-xs mt-4 text-right">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
