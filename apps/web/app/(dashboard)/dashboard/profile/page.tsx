'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, MapPin, Phone, Globe, Mail, AlertCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import type { RestaurantCategory } from '@/types/database';

const CATEGORY_OPTIONS: { value: RestaurantCategory; label: string }[] = [
  { value: 'bars', label: 'Bar' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'rooftops', label: 'Rooftop' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'outdoor_dining', label: 'Outdoor Dining' },
];

interface FormData {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  categories: RestaurantCategory[];
}

export default function ProfilePage() {
  const { restaurant, restaurantId, isLoading: contextLoading, refreshRestaurant, buildApiUrl } = useRestaurant();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    categories: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load restaurant data into form when context updates
  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        zip_code: restaurant.zip_code || '',
        phone: restaurant.phone || '',
        email: '', // email field doesn't exist on restaurant, keeping for UI
        website: restaurant.website || '',
        categories: restaurant.categories || [],
      });
    }
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) {
      setError('No restaurant found');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          phone: formData.phone,
          website: formData.website,
          categories: formData.categories,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      // Refresh restaurant data in context
      await refreshRestaurant();

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = (category: RestaurantCategory) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  if (contextLoading) {
    return (
      <div className="max-w-4xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Restaurant Profile</h2>
          <p className="text-gray-400 mt-1">Loading...</p>
        </div>
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-tastelanc-surface-light rounded w-1/4" />
                <div className="h-10 bg-tastelanc-surface-light rounded" />
                <div className="h-10 bg-tastelanc-surface-light rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Restaurant Profile</h2>
        <p className="text-gray-400 mt-1">
          Update your restaurant&apos;s public information
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Cover Image */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cover Image</h3>
          {restaurant?.cover_image_url ? (
            <div className="relative aspect-[3/1] bg-tastelanc-surface rounded-lg overflow-hidden">
              <img
                src={restaurant.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-white">Click to change</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[3/1] bg-tastelanc-surface rounded-lg flex items-center justify-center border-2 border-dashed border-tastelanc-surface-light hover:border-tastelanc-accent transition-colors cursor-pointer">
              <div className="text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>
          )}
        </Card>

        {/* Basic Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Restaurant Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-none"
                placeholder="Tell customers about your restaurant..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      formData.categories.includes(cat.value)
                        ? 'bg-tastelanc-accent text-white'
                        : 'bg-tastelanc-surface text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                placeholder="https://"
              />
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <span className="text-green-400 text-sm">Changes saved successfully!</span>
          )}
          <Button type="submit" disabled={saving || contextLoading}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
