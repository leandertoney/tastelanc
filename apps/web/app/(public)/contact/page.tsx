'use client';

import { useState } from 'react';
import { Send, CheckCircle, Building2, Mail, Phone, MessageSquare } from 'lucide-react';
import { Card, Badge } from '@/components/ui';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business_name: '',
    message: '',
    interested_plan: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Submit to our API (stores in Supabase)
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
          <p className="text-gray-400 mb-6">
            We&apos;ve received your message and will get back to you within 24-48 hours.
          </p>
          <a
            href="/"
            className="inline-block bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to Home
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="accent" className="mb-4">For Restaurants</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Partner With TasteLanc
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Ready to showcase your restaurant to thousands of Lancaster diners?
            Get in touch and we&apos;ll help you find the perfect plan.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Contact Info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Why Partner With Us?</h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-tastelanc-accent mt-1">&#10003;</span>
                  Reach thousands of local diners
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tastelanc-accent mt-1">&#10003;</span>
                  Showcase menus, specials & events
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tastelanc-accent mt-1">&#10003;</span>
                  Track performance with analytics
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tastelanc-accent mt-1">&#10003;</span>
                  Send push notifications to app users
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tastelanc-accent mt-1">&#10003;</span>
                  Get featured in &quot;Restaurant of the Week&quot;
                </li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Flexible Plans</h3>
              <p className="text-gray-400 text-sm mb-4">
                We offer plans for every budget, starting completely free. Get in touch and we&apos;ll find the perfect fit for your restaurant.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-semibold">Starts Free</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 text-sm">No commitment required</span>
              </div>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="md:col-span-3 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <h3 className="text-xl font-semibold text-white mb-4">Get In Touch</h3>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Your Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
                      placeholder="John Smith"
                    />
                    <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
                      placeholder="john@restaurant.com"
                    />
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
                      placeholder="(717) 555-0123"
                    />
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium text-gray-300 mb-1">
                    Business Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="business_name"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleChange}
                      className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
                      placeholder="Your Restaurant Name"
                    />
                    <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="interested_plan" className="block text-sm font-medium text-gray-300 mb-1">
                  Interested Plan
                </label>
                <select
                  id="interested_plan"
                  name="interested_plan"
                  value={formData.interested_plan}
                  onChange={handleChange}
                  className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
                >
                  <option value="">Select a plan (optional)</option>
                  <option value="basic">Basic (Free)</option>
                  <option value="starter">Starter</option>
                  <option value="premium">Premium</option>
                  <option value="elite">Elite</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent resize-none"
                  placeholder="Tell us about your restaurant and what you're looking for..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By submitting, you agree to our{' '}
                <a href="/privacy" className="text-tastelanc-accent hover:underline">Privacy Policy</a>
                {' '}and{' '}
                <a href="/terms" className="text-tastelanc-accent hover:underline">Terms of Service</a>.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
