'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

function SetupAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError('No setup token provided. Please use the link from your welcome email.');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/setup-password?token=${token}`);
        const data = await response.json();

        if (!data.valid) {
          setTokenError(data.error || 'Invalid or expired link. Please contact support.');
        } else {
          setEmail(data.email);
          if (data.name) setName(data.name);
          if (data.restaurantName) setRestaurantName(data.restaurantName);
          if (data.coverImageUrl) setCoverImageUrl(data.coverImageUrl);
        }
      } catch {
        setTokenError('Failed to verify link. Please try again.');
      }

      setVerifying(false);
    };

    verifyToken();
  }, [token]);

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

    try {
      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to set password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('An error occurred. Please try again.');
    }

    setLoading(false);
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying your link...</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          <Link href="/">
            <Image
              src="/images/tastelanc_new_dark.png"
              alt="TasteLanc"
              width={180}
              height={54}
              className="h-12 w-auto mx-auto mb-8"
            />
          </Link>

          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Link Invalid</h2>
          <p className="text-gray-400 mb-6">{tokenError}</p>

          <div className="space-y-3">
            <Link
              href="/forgot-password"
              className="block w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Request New Password Reset
            </Link>
            <Link
              href="/login"
              className="block text-gray-400 hover:text-white"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Split-screen layout when we have a cover image
  if (coverImageUrl && name) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Restaurant Image */}
        <div className="relative lg:w-1/2 h-64 lg:h-auto">
          <Image
            src={coverImageUrl}
            alt={restaurantName || 'Restaurant'}
            fill
            className="object-cover"
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

          {/* Restaurant info overlay */}
          <div className="absolute bottom-0 left-0 right-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 p-8 lg:p-12">
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/images/tastelanc_new_dark.png"
                alt="TasteLanc"
                width={140}
                height={42}
                className="h-10 w-auto"
              />
            </Link>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              {restaurantName}
            </h1>
            <p className="text-gray-300 text-lg">
              Welcome to TasteLanc
            </p>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md">
            {success ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  You&apos;re all set, {name}!
                </h2>
                <p className="text-gray-400 text-lg">
                  Your {restaurantName} dashboard is ready.
                </p>
                <p className="text-gray-500 mt-4">
                  Redirecting to login...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Hey {name}!
                  </h2>
                  <p className="text-gray-400 text-lg">
                    One last step to access your dashboard.
                  </p>
                  <p className="text-gray-500 mt-1">
                    Create a password below and you&apos;re in.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Must be at least 8 characters</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Set Up Account'}
                  </button>
                </form>

                <div className="text-center mt-8">
                  <p className="text-gray-500 text-sm">
                    Already have a password?{' '}
                    <Link href="/login" className="text-tastelanc-accent hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default layout (no cover image)
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/tastelanc_new_dark.png"
              alt="TasteLanc"
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
              <h2 className="text-2xl font-bold text-white">
                {name ? `You're all set, ${name}!` : 'Account Set Up!'}
              </h2>
              <p className="text-gray-400 mt-2">
                {restaurantName
                  ? `Your ${restaurantName} dashboard is ready. Redirecting to login...`
                  : 'Your password has been set. Redirecting to login...'}
              </p>
            </>
          ) : (
            <>
              {name ? (
                <>
                  <h2 className="text-2xl font-bold text-white">Hey {name}!</h2>
                  <p className="text-gray-400 mt-2">
                    {restaurantName
                      ? `One last step to access your ${restaurantName} dashboard.`
                      : 'One last step to set up your account.'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Create a password below and you&apos;re all set.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white">Set Up Your Account</h2>
                  <p className="text-gray-400 mt-2">
                    Create a password for <strong className="text-white">{email}</strong>
                  </p>
                </>
              )}
            </>
          )}
        </div>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Set Up Account'}
            </button>
          </form>
        )}

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Already have a password?{' '}
            <Link href="/login" className="text-tastelanc-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SetupAccountLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={<SetupAccountLoading />}>
      <SetupAccountContent />
    </Suspense>
  );
}
