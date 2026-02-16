'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { updatePassword, getSession } from '@/lib/supabase/auth';
import { BRAND } from '@/config/market';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { session } = await getSession();
      if (!session) {
        router.push('/forgot-password');
        return;
      }
      setCheckingSession(false);
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const { error: updateError } = await updatePassword(password);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.push('/login');
    }, 3000);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-tastelanc-header-text/60">Loading...</p>
        </div>
      </div>
    );
  }

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
              <h2 className="text-2xl font-bold text-tastelanc-header-text">Password updated!</h2>
              <p className="text-tastelanc-header-text/60 mt-2">
                Your password has been successfully changed. Redirecting to login...
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-tastelanc-header-text">Set your new password</h2>
              <p className="text-tastelanc-header-text/60 mt-2">
                Enter a new password for your account.
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
              <label htmlFor="password" className="block text-sm font-medium text-tastelanc-header-text/70 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tastelanc-header-text/40" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-tastelanc-header-text/5 border border-tastelanc-header-text/15 rounded-lg text-tastelanc-header-text placeholder-tastelanc-header-text/30 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tastelanc-header-text/40 hover:text-tastelanc-header-text"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-tastelanc-header-text/40 text-xs mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-tastelanc-header-text/70 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tastelanc-header-text/40" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        <div className="text-center mt-8">
          <Link href="/login" className="text-tastelanc-header-text/60 hover:text-tastelanc-header-text text-sm">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
