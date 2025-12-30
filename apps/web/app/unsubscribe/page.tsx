'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const isTest = searchParams.get('test') === 'true';
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen bg-tastelanc-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-tastelanc-surface rounded-2xl p-8 text-center">
          {/* Logo */}
          <div className="mb-6">
            <img
              src="/tastelanc_dark.png"
              alt="TasteLanc"
              className="h-10 mx-auto"
            />
          </div>

          {success ? (
            <>
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {isTest ? 'Test Unsubscribe' : "You've Been Unsubscribed"}
              </h1>
              <p className="text-gray-400 mb-6">
                {isTest
                  ? 'This was a test email. You have not been unsubscribed.'
                  : "You won't receive any more marketing emails from us. We're sorry to see you go!"}
              </p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Something Went Wrong
              </h1>
              <p className="text-gray-400 mb-6">
                {error === 'missing_email'
                  ? 'No email address was provided.'
                  : 'We couldn\'t process your unsubscribe request. Please try again or contact us.'}
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Unsubscribe
              </h1>
              <p className="text-gray-400 mb-6">
                Use the link in your email to unsubscribe from our mailing list.
              </p>
            </>
          )}

          <Link
            href="/"
            className="inline-block bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>

          {success && !isTest && (
            <p className="text-gray-500 text-sm mt-6">
              Changed your mind?{' '}
              <Link href="/early-access" className="text-tastelanc-accent hover:underline">
                Sign up again
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-tastelanc-bg flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
