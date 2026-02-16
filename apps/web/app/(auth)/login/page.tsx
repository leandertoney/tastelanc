'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, MapPin, Clock, Sparkles, Star } from 'lucide-react';
import { signInWithEmail } from '@/lib/supabase/auth';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await signInWithEmail(email, password);

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-tastelanc-surface via-tastelanc-bg to-tastelanc-surface relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--brand-accent-hex) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tastelanc-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-lancaster-gold/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <Link href="/" className="mb-12">
            <Image
              src="/images/tastelanc_new_dark.png"
              alt="TasteLanc"
              width={200}
              height={60}
              className="h-14 w-auto"
            />
          </Link>

          {/* Tagline */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
            Discover Lancaster&apos;s
            <span className="text-tastelanc-accent block">Best Nights Out</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-md">
            The ultimate app for finding happy hours, live events, and hidden gems in Lancaster, PA.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: Clock, text: 'Real-time happy hours & specials' },
              { icon: MapPin, text: 'Discover nearby restaurants & bars' },
              { icon: Sparkles, text: 'AI-powered recommendations with Rosie' },
              { icon: Star, text: 'Save favorites & get alerts' },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-tastelanc-accent/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-tastelanc-accent" />
                </div>
                <span className="text-gray-300">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-gray-500 text-sm mt-16">
            &copy; {new Date().getFullYear()} TasteLanc. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <Image
                src="/images/tastelanc_new_dark.png"
                alt="TasteLanc"
                width={180}
                height={54}
                className="h-12 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-gray-400 mt-2">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  required
                />
              </div>
            </div>

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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-tastelanc-surface-light bg-tastelanc-surface text-tastelanc-accent focus:ring-tastelanc-accent focus:ring-offset-tastelanc-bg"
                />
                <span className="ml-2 text-sm text-gray-400">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-tastelanc-accent hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-gray-400 mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-tastelanc-accent hover:underline">
              Sign up
            </Link>
          </p>

          {/* Back to Home */}
          <p className="text-center mt-4">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">
              &larr; Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
