'use client';

import { useState, useRef } from 'react';
import {
  Send,
  CheckCircle,
  Mail,
  Phone,
  User,
  Briefcase,
  FileText,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui';

interface ApplicationFormProps {
  position: string;
  positions?: string[];
  jobListingId?: string;
  cityId?: string;
  marketSlug?: string;
  brandName?: string;
}

export default function ApplicationForm({
  position: defaultPosition,
  positions,
  jobListingId,
  cityId,
  marketSlug,
  brandName = 'TasteLanc',
}: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    message: '',
    position: defaultPosition,
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        resumeData = { name: resumeFile.name, content: base64 };
      }

      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          resume: resumeData,
          jobListingId,
          cityId,
          marketSlug,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Application Submitted!
          </h2>
          <p className="text-gray-400 mb-6">
            Thank you for your interest in joining {brandName}. We&apos;ll
            review your application and get back to you soon.
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

  const positionOptions = positions ?? [defaultPosition];

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Position */}
        <div>
          <label
            htmlFor="position"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Position
          </label>
          <select
            id="position"
            name="position"
            value={formData.position}
            onChange={handleChange}
            className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent focus:border-transparent"
          >
            {positionOptions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>

        {/* Name & Email */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
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
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
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

        {/* Phone & LinkedIn */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
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
            <label
              htmlFor="linkedin"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
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

        {/* Message */}
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
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
            Resume{' '}
            <span className="text-gray-500">
              (optional — PDF, DOC, or DOCX, max 5MB)
            </span>
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
              <span className="text-white text-sm truncate flex-1">
                {resumeFile.name}
              </span>
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

        {/* Submit */}
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
          <a href="/privacy" className="text-tastelanc-accent hover:underline">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/terms" className="text-tastelanc-accent hover:underline">
            Terms of Service
          </a>
          .
        </p>
      </form>
    </Card>
  );
}
