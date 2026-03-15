'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FlyerSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-[#A41E22]/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Event Promoted!</h1>
        <p className="text-tastelanc-text-muted mb-2">
          Your payment was successful. Your event will be featured on TasteLanc with push notifications to locals and tourists.
        </p>
        <p className="text-tastelanc-text-faint text-sm mb-8">
          You can close this window and return to the app.
        </p>
        <a
          href="https://tastelanc.com"
          className="inline-block bg-[#A41E22] hover:bg-[#C42428] text-white font-semibold py-3 px-8 rounded-xl transition-colors"
        >
          Visit TasteLanc
        </a>
      </div>
    </div>
  );
}

export default function FlyerSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#A41E22]" />
      </div>
    }>
      <FlyerSuccessContent />
    </Suspense>
  );
}
