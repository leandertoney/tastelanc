'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Ticket } from 'lucide-react';

interface ValidationResult {
  valid: boolean;
  error?: string;
  coupon?: {
    title: string;
    description: string | null;
    discount_type: string;
    discount_value: number | null;
    restaurant_name: string;
  };
}

function formatDiscount(type: string, value: number | null): string {
  switch (type) {
    case 'percent_off':
      return value ? `${value}% Off` : '% Off';
    case 'dollar_off':
      return value ? `$${value} Off` : '$ Off';
    case 'bogo':
      return 'Buy One Get One';
    case 'free_item':
      return 'Free Item';
    default:
      return 'Deal';
  }
}

export default function ValidatePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleValidate = async () => {
    if (code.length !== 6) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setResult({ valid: false, error: 'Too many attempts. Please wait a moment.' });
        return;
      }

      setResult(data);
    } catch {
      setResult({ valid: false, error: 'Unable to validate. Check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !loading) {
      handleValidate();
    }
  };

  const handleReset = () => {
    setCode('');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-full mb-4">
            <Ticket className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Validate Coupon</h1>
          <p className="text-zinc-400 mt-1">Enter the 6-character code shown on the customer&apos;s phone</p>
        </div>

        {/* Input */}
        {!result && (
          <div className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              placeholder="ABC123"
              maxLength={6}
              autoFocus
              className="w-full text-center text-4xl font-mono tracking-[0.5em] px-4 py-6 bg-zinc-900 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              onClick={handleValidate}
              disabled={code.length !== 6 || loading}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Validating...</>
              ) : (
                'Validate'
              )}
            </button>
          </div>
        )}

        {/* Success Result */}
        {result?.valid && result.coupon && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-400 mb-1">Coupon Redeemed!</h2>
              <p className="text-zinc-400">{result.coupon.restaurant_name}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <p className="text-lg font-semibold text-white">{result.coupon.title}</p>
              <p className="text-amber-400 font-semibold mt-1">
                {formatDiscount(result.coupon.discount_type, result.coupon.discount_value)}
              </p>
              {result.coupon.description && (
                <p className="text-zinc-500 text-sm mt-2">{result.coupon.description}</p>
              )}
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
            >
              Validate Another
            </button>
          </div>
        )}

        {/* Failure Result */}
        {result && !result.valid && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-400 mb-1">Invalid Code</h2>
              <p className="text-zinc-400">{result.error || 'This code is invalid or has expired'}</p>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
          Powered by TasteLanc
        </p>
      </div>
    </div>
  );
}
