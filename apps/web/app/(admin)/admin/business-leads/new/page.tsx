'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRAND } from '@/config/market';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui';

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'brewery', label: 'Brewery' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'other', label: 'Other' },
];

export default function NewBusinessLeadPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(BRAND.countyShort);
  const [state, setState] = useState('PA');
  const [zipCode, setZipCode] = useState('');
  const [category, setCategory] = useState('restaurant');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName || !email) {
      setMessage({ type: 'error', text: 'Business name and email are required' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/business-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          contact_name: contactName || null,
          email,
          phone: phone || null,
          website: website || null,
          address: address || null,
          city,
          state,
          zip_code: zipCode || null,
          category,
          notes: notes || null,
          tags: tags
            ? tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
            : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create lead');
      }

      setMessage({ type: 'success', text: 'Lead created successfully!' });
      setTimeout(() => {
        router.push('/admin/business-leads');
      }, 1000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create lead',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/business-leads"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-tastelanc-accent" />
          Add New Lead
        </h1>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Joe's Pizza"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g., John Smith"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.com"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(717) 555-0123"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://joespizza.com"
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="17601"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this lead..."
              rows={3}
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., downtown, happy-hour, new"
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Lead
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
