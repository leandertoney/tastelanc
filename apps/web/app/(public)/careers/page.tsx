'use client';

import { useState, useRef } from 'react';
import { Send, CheckCircle, Mail, Phone, User, Briefcase, MapPin, Clock, DollarSign, Users, Megaphone, Handshake, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { BRAND } from '@/config/market';

export default function CareersPage() {
  const [expandedRole, setExpandedRole] = useState<string | null>('rpm');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    message: '',
    position: 'Restaurant Partnership Manager',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      let resumeData: { name: string; content: string } | undefined;

      if (resumeFile) {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (resumeFile.size > MAX_SIZE) {
          setError('Resume file must be under 5MB.');
          setIsSubmitting(false);
          return;
        }
        const buffer = await resumeFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        resumeData = { name: resumeFile.name, content: base64 };
      }

      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, resume: resumeData }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit application');
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
          <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
          <p className="text-gray-400 mb-6">
            Thank you for your interest in joining {BRAND.name}. We&apos;ll review your application and get back to you soon.
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="accent" className="mb-4">We&apos;re Hiring</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Join the {BRAND.name} Team
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Help us connect {BRAND.countyShort}&apos;s best restaurants with the community. We&apos;re looking for passionate, self-motivated people who love the local food scene.
          </p>
        </div>

        {/* Open Position */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Open Positions</h2>

          <Card className="overflow-hidden">
            {/* Role Header */}
            <button
              onClick={() => setExpandedRole(expandedRole === 'rpm' ? null : 'rpm')}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-tastelanc-surface-light/50 transition-colors"
            >
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">Restaurant Partnership Manager</h3>
                <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {BRAND.countyShort}, {BRAND.state} &mdash; In Person
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Commission-Based
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Flexible Schedule
                  </span>
                </div>
              </div>
              {expandedRole === 'rpm' ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {/* Expanded Job Details */}
            {expandedRole === 'rpm' && (
              <div className="px-6 pb-6 border-t border-tastelanc-surface-light">
                <div className="pt-6 space-y-8">
                  {/* Summary */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">About the Role</h4>
                    <p className="text-gray-400 leading-relaxed">
                      We are seeking a dynamic and proactive Restaurant Partnership Manager to lead the development and management of strategic partnerships with restaurant clients. In this role, you will drive growth by fostering strong relationships, identifying new business opportunities, and ensuring seamless collaboration between our organization and partner restaurants.
                    </p>
                    <p className="text-gray-400 leading-relaxed mt-3">
                      The Restaurant Partnership Manager is responsible for building relationships with local restaurants, onboarding them onto the {BRAND.name} platform, and helping them leverage the app to drive real foot traffic, visibility, and repeat customers. This is a relationship-first role, not traditional ad sales. You&apos;ll work directly with owners and managers to position {BRAND.name} as a long-term marketing partner.
                    </p>
                  </div>

                  {/* Key Responsibilities */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-tastelanc-accent" />
                      Key Responsibilities
                    </h4>
                    <ul className="space-y-2 text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Identify and engage local restaurants, bars, caf&eacute;s, and hospitality venues
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Pitch {BRAND.name}&apos;s value proposition in person, by phone, and at community events
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Onboard new restaurant partners and guide them through setup (specials, happy hours, events, promotions)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Build long-term relationships to encourage renewals, upgrades, and sponsorships
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Represent {BRAND.name} at local events, festivals, and networking opportunities
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Track outreach, signed partners, and commission earnings
                      </li>
                    </ul>
                  </div>

                  {/* Skills Grid */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-tastelanc-accent" />
                      Key Skills &amp; Competencies
                    </h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Handshake className="w-4 h-4 text-lancaster-gold" />
                          Relationship &amp; Communication
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Build trust quickly with restaurant owners and managers</li>
                          <li>Strong verbal communication (in-person, phone, casual meetings)</li>
                          <li>Active listening to understand each restaurant&apos;s goals</li>
                          <li>Comfortable explaining value without sounding &quot;salesy&quot;</li>
                        </ul>
                      </div>

                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-lancaster-gold" />
                          Hospitality &amp; Local Market
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Understanding of restaurant operations and promotions</li>
                          <li>Familiarity with the local food, bar, and nightlife scene</li>
                          <li>Awareness of seasonal trends, events, and foot-traffic drivers</li>
                          <li>Comfortable using mobile apps and basic CRM tools</li>
                        </ul>
                      </div>

                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-lancaster-gold" />
                          Sales &amp; Organization
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Confident presenting offerings and closing deals</li>
                          <li>Ability to overcome objections and handle follow-ups</li>
                          <li>Comfortable working toward commission-based income</li>
                          <li>Skilled at positioning partnerships as win-win opportunities</li>
                        </ul>
                      </div>

                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-lancaster-gold" />
                          Self-Management
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Manage outreach, follow-ups, and onboarding steps</li>
                          <li>Consistent communication with partners after signup</li>
                          <li>Comfortable tracking progress, commissions, and renewals</li>
                          <li>Strong time management with minimal oversight</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Compensation */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-tastelanc-accent" />
                      Compensation &amp; Benefits
                    </h4>
                    <div className="bg-tastelanc-surface rounded-lg p-4 space-y-3 text-gray-400">
                      <p>
                        This is a <span className="text-white font-medium">100% commission-based role</span> with no cap on earnings. Income is directly tied to performance, with the flexibility to earn based on your effort, consistency, and results.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          Earnings driven by restaurant sign-ups, subscriptions, renewals, and sponsorships
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          No ceiling on commissions &mdash; high performers can build recurring income
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          Fast sales cycles allow for quicker payouts
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          Flexible schedule
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          People with a criminal record are encouraged to apply
                        </li>
                      </ul>
                      <p className="text-sm pt-2 border-t border-tastelanc-surface-light">
                        This role offers true upside for someone who wants flexibility, autonomy, and direct control over their earning potential.
                      </p>
                    </div>
                  </div>

                  {/* CTA to Apply */}
                  <div className="pt-2">
                    <a
                      href="#apply"
                      className="inline-flex items-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                    >
                      <Send className="w-5 h-5" />
                      Apply Now
                    </a>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Application Form */}
        <div id="apply" className="scroll-mt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Apply Now</h2>
            <p className="text-gray-400">
              Interested in joining our team? Fill out the form below and we&apos;ll be in touch.
            </p>
          </div>

          <Card className="max-w-2xl mx-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-300 mb-1">
                  Position
                </label>
                <select
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
                >
                  <option value="Restaurant Partnership Manager">Restaurant Partnership Manager</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name *
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
                      placeholder="Jane Doe"
                    />
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
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
                      placeholder="jane@email.com"
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
                  <label htmlFor="linkedin" className="block text-sm font-medium text-gray-300 mb-1">
                    LinkedIn Profile
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      id="linkedin"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleChange}
                      className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                    <Briefcase className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                  Why are you interested in this role? *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent resize-none"
                  placeholder="Tell us about yourself, your experience, and why you'd be a great fit for this role..."
                />
              </div>

              {/* Resume Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Resume <span className="text-gray-500">(optional — PDF, DOC, or DOCX, max 5MB)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {resumeFile ? (
                  <div className="flex items-center gap-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3">
                    <FileText className="w-5 h-5 text-tastelanc-accent flex-shrink-0" />
                    <span className="text-white text-sm truncate flex-1">{resumeFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-tastelanc-surface border border-dashed border-tastelanc-surface-light rounded-lg px-4 py-3 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Upload Resume
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Application
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
