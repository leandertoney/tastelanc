'use client';

import { useState, useRef, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type ScanResult =
  | { status: 'success'; name: string; restaurant_name: string | null }
  | { status: 'already_checked_in'; name: string; restaurant_name: string | null }
  | { status: 'error'; message: string };

export default function PartyScanPage() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus so a Bluetooth barcode scanner types directly into the field
  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  async function handleCheckIn(qr_token: string) {
    if (!qr_token.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/party/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: qr_token.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ status: 'success', name: data.name, restaurant_name: data.restaurant_name });
      } else if (res.status === 409 && data.already_checked_in) {
        setResult({ status: 'already_checked_in', name: data.name, restaurant_name: data.restaurant_name });
      } else {
        setResult({ status: 'error', message: data.error ?? 'Unknown error' });
      }
    } catch {
      setResult({ status: 'error', message: 'Network error — check your connection' });
    } finally {
      setLoading(false);
      setToken('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleCheckIn(token);
    }
  }

  function reset() {
    setResult(null);
    setToken('');
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-[#C84B31]/20 rounded-full">
              <QrCode size={32} className="text-[#C84B31]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Door Scanner</h1>
          <p className="text-gray-400 mt-1 text-sm">TasteLanc Launch Party · April 20, 2026</p>
          <p className="text-gray-500 text-xs mt-1">Hempfield Apothetique · 100 W Walnut St</p>
        </div>

        {/* Scan result */}
        {result && (
          <div
            className={`rounded-xl p-5 text-center border ${
              result.status === 'success'
                ? 'bg-green-900/20 border-green-700/40'
                : result.status === 'already_checked_in'
                ? 'bg-yellow-900/20 border-yellow-700/40'
                : 'bg-red-900/20 border-red-700/40'
            }`}
          >
            {result.status === 'success' && (
              <>
                <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
                <p className="text-green-400 font-bold text-xl">{result.name}</p>
                {result.restaurant_name && (
                  <p className="text-green-500 text-sm mt-1">{result.restaurant_name}</p>
                )}
                <p className="text-green-600 text-xs mt-2">Checked in successfully</p>
              </>
            )}
            {result.status === 'already_checked_in' && (
              <>
                <XCircle size={40} className="text-yellow-400 mx-auto mb-3" />
                <p className="text-yellow-400 font-bold text-xl">{result.name}</p>
                {result.restaurant_name && (
                  <p className="text-yellow-500 text-sm mt-1">{result.restaurant_name}</p>
                )}
                <p className="text-yellow-600 text-xs mt-2">Already checked in</p>
              </>
            )}
            {result.status === 'error' && (
              <>
                <XCircle size={40} className="text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-bold text-lg">Invalid Ticket</p>
                <p className="text-red-500 text-sm mt-1">{result.message}</p>
              </>
            )}
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
            >
              Scan Next
            </button>
          </div>
        )}

        {/* Input */}
        {!result && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-gray-400 text-sm text-center">
              Scan QR code or enter ticket token manually
            </p>
            <input
              ref={inputRef}
              type="text"
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan or paste QR token..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#C84B31] font-mono text-sm"
              disabled={loading}
            />
            <button
              onClick={() => handleCheckIn(token)}
              disabled={loading || !token.trim()}
              className="w-full py-3 bg-[#C84B31] text-white rounded-lg font-medium hover:bg-[#b03e27] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {loading ? 'Checking in...' : 'Check In'}
            </button>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs">
          Works with Bluetooth barcode scanners — press Enter to submit
        </p>
      </div>
    </div>
  );
}
