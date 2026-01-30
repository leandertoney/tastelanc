'use client';

import { useState } from 'react';
import {
  Music,
  Mail,
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
} from 'lucide-react';
import { Card } from '@/components/ui';
import Link from 'next/link';

export default function AdminNewSelfPromoterPage() {
  // Wizard step
  const [step, setStep] = useState(1);

  // Form state
  const [email, setEmail] = useState('');
  const [artistName, setArtistName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [genre, setGenre] = useState('');

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [stepError, setStepError] = useState('');

  const handleNextStep = () => {
    setStepError('');
    if (step === 1) {
      if (!email) {
        setStepError('Email is required');
        return;
      }
      if (!artistName) {
        setStepError('Artist name is required');
        return;
      }
      setStep(2);
    }
  };

  const handleCreateCheckout = async () => {
    setError('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/admin/create-self-promoter-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          artistName,
          contactName,
          phone,
          genre,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      setCheckoutUrl(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setEmail('');
    setArtistName('');
    setContactName('');
    setPhone('');
    setGenre('');
    setCheckoutUrl('');
    setError('');
    setStepError('');
    setStep(1);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/admin/self-promoters"
          className="text-gray-400 hover:text-white text-sm mb-2 inline-block"
        >
          ← Back to Self-Promoters
        </Link>
        <h1 className="text-2xl font-bold text-white">New Self-Promoter</h1>
        <p className="text-gray-400 mt-1">Sign up a DJ, musician, or performer • $50/month</p>
      </div>

      {/* Success State */}
      {checkoutUrl ? (
        <Card className="p-6 border-green-500/30 bg-green-500/5">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">Checkout Ready</h2>
            <p className="text-gray-400 text-sm">
              {artistName} • $50/month
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Checkout
            </a>
            <button
              onClick={() => copyToClipboard(checkoutUrl)}
              className="w-full inline-flex items-center justify-center gap-2 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-white px-6 py-3 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={resetForm}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              Sign Up Another
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'bg-purple-500 text-white'
                      : 'bg-tastelanc-surface-light text-gray-500'
                  }`}
                >
                  {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs hidden sm:block ${s === step ? 'text-white' : 'text-gray-500'}`}>
                  {s === 1 ? 'Details' : 'Review'}
                </span>
                {s < 2 && <div className={`flex-1 h-px ${s < step ? 'bg-green-500' : 'bg-tastelanc-surface-light'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Artist Details */}
          {step === 1 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-5">Artist Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setStepError(''); }}
                      placeholder="artist@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Artist / Band Name *</label>
                  <div className="relative">
                    <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={artistName}
                      onChange={(e) => { setArtistName(e.target.value); setStepError(''); }}
                      placeholder="DJ Awesome"
                      className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(717) 555-0123"
                      className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a genre...</option>
                    <option value="DJ/EDM">DJ / EDM</option>
                    <option value="Rock">Rock</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Country">Country</option>
                    <option value="Blues">Blues</option>
                    <option value="Folk">Folk</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="R&B">R&B</option>
                    <option value="Pop">Pop</option>
                    <option value="Acoustic">Acoustic</option>
                    <option value="Cover Band">Cover Band</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Karaoke Host">Karaoke Host</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {stepError && (
                  <p className="text-red-400 text-sm">{stepError}</p>
                )}

                <button
                  onClick={handleNextStep}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Review
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Card>
          )}

          {/* Step 2: Review & Create */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-5">Review</h2>

                {/* Details summary */}
                <div className="mb-5 pb-4 border-b border-tastelanc-surface-light">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Music className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{artistName}</p>
                      {genre && <p className="text-gray-400 text-sm">{genre}</p>}
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-400">
                      <span className="text-gray-500">Email:</span> {email}
                    </p>
                    {contactName && (
                      <p className="text-gray-400">
                        <span className="text-gray-500">Contact:</span> {contactName}
                      </p>
                    )}
                    {phone && (
                      <p className="text-gray-400">
                        <span className="text-gray-500">Phone:</span> {phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">Self-Promoter Plan</p>
                    <p className="text-gray-400 text-sm">Monthly subscription</p>
                  </div>
                  <p className="text-2xl font-bold text-white">$50<span className="text-gray-400 text-base font-normal">/mo</span></p>
                </div>
              </Card>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex-1 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleCreateCheckout}
                  disabled={isProcessing}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Create Checkout
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
