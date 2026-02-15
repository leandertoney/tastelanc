'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui';

const CATEGORIES = ['restaurant', 'bar', 'cafe', 'brewery', 'bakery', 'food_truck', 'other'];

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: 'Lancaster',
    state: 'PA',
    zip_code: '',
    category: 'restaurant',
    notes: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.business_name || !form.email) {
      setError('Business name and email are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create lead');
      }

      router.push(`/sales/leads/${data.lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add New Lead</h1>
          <p className="text-gray-400 text-sm">Enter the business details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-5">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Business Name *</label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => handleChange('business_name', e.target.value)}
              placeholder="Restaurant name"
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => handleChange('contact_name', e.target.value)}
              placeholder="Owner or manager name"
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@restaurant.com"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(717) 555-0123"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://restaurant.com"
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main St"
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>

            {/* Zip */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ZIP Code</label>
              <input
                type="text"
                value={form.zip_code}
                onChange={(e) => handleChange('zip_code', e.target.value)}
                placeholder="17601"
                className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Any additional context..."
              className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Lead
              </>
            )}
          </button>
        </Card>
      </form>
    </div>
  );
}
