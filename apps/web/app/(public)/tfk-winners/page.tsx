'use client';

import { useState, useEffect } from 'react';
import { Trophy, Download, CheckCircle2, Clock } from 'lucide-react';

interface Winner {
  player_name: string;
  venue_name: string;
  nightly_date: string;
  prize_description: string | null;
  email_verified: boolean;
  week_start: string;
}

export default function TFKWinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWinners() {
      try {
        const res = await fetch('/api/tfk-winners');
        const data = await res.json();
        setWinners(data.winners || []);
      } catch (e) {
        console.error('Failed to load winners:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchWinners();
  }, []);

  // Group winners by week
  const winnersByWeek = winners.reduce((acc, winner) => {
    const week = winner.week_start;
    if (!acc[week]) acc[week] = [];
    acc[week].push(winner);
    return acc;
  }, {} as Record<string, Winner[]>);

  const weeks = Object.keys(winnersByWeek).sort().reverse();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="text-yellow-500" size={40} />
            <h1 className="text-4xl font-bold text-gray-900">Thirsty for Knowledge</h1>
          </div>
          <p className="text-xl text-gray-600 mb-2">Restaurant Week Trivia Winners</p>
          <p className="text-gray-500">
            Congratulations to all our nightly trivia champions!
          </p>
        </div>

        {/* Download App CTA */}
        <div className="bg-purple-600 text-white rounded-2xl p-6 mb-10 shadow-lg">
          <div className="flex items-start gap-4">
            <Download className="flex-shrink-0 mt-1" size={28} />
            <div>
              <h2 className="text-2xl font-bold mb-2">Winners: Claim Your Prize!</h2>
              <p className="text-purple-100 mb-4">
                If you see your name below with a "Pending" status, download the TasteLanc app to claim your $25 prize!
                Your deal will automatically appear in "My Deals" when you sign up.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://apps.apple.com/us/app/tastelanc/id6755852717"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                >
                  <Download size={20} />
                  Download TasteLanc
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Winners List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading winners...</div>
        ) : winners.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-500">No winners yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {weeks.map((week) => (
              <div key={week} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700">
                    Week of {new Date(week).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {winnersByWeek[week].map((winner, idx) => (
                    <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <Trophy className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-gray-900 mb-1">
                              {winner.player_name}
                            </h4>
                            <p className="text-gray-600 mb-1">
                              {winner.venue_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(winner.nightly_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            {winner.prize_description && (
                              <p className="text-sm font-medium text-purple-600 mt-2">
                                Prize: {winner.prize_description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {winner.email_verified ? (
                            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                              <CheckCircle2 size={18} />
                              <span className="font-medium text-sm">Claimed</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
                              <Clock size={18} />
                              <span className="font-medium text-sm">Pending</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Winners receive a $25 prize redeemable at participating restaurants.
            Download the TasteLanc app to claim your prize!
          </p>
        </div>
      </div>
    </div>
  );
}
