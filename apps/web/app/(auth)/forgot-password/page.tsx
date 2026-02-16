'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { resetPassword } from '@/lib/supabase/auth';
import { BRAND } from '@/config/market';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src={BRAND.logoPath}
              alt={BRAND.name}
              width={180}
              height={54}
              className="h-12 w-auto mx-auto mb-8"
            />
          </Link>

          {success ? (
            <>
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-tastelanc-header-text">Check your email</h2>
              <p className="text-tastelanc-header-text/60 mt-2">
                We sent a password reset link to <strong className="text-tastelanc-header-text">{email}</strong>
              </p>
              <p className="text-tastelanc-header-text/40 text-sm mt-4">
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-tastelanc-accent hover:underline"
                >
                  try again
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-tastelanc-header-text">Forgot your password?</h2>
              <p className="text-tastelanc-header-text/60 mt-2">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </>
          )}
        </div>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-tastelanc-header-text/70 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tastelanc-header-text/40" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-tastelanc-header-text/5 border border-tastelanc-header-text/15 rounded-lg text-tastelanc-header-text placeholder-tastelanc-header-text/30 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="text-center mt-8">
          <Link href="/login" className="text-tastelanc-header-text/60 hover:text-tastelanc-header-text text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
