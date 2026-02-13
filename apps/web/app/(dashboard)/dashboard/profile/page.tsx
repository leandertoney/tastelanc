'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Upload, MapPin, Phone, Globe, Mail, AlertCircle, Loader2, Clock, Image as ImageIcon, Star, Trash2, Check } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';
import type { RestaurantCategory, DayOfWeek } from '@/types/database';

const CATEGORY_OPTIONS: { value: RestaurantCategory; label: string }[] = [
  { value: 'bars', label: 'Bar' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'rooftops', label: 'Rooftop' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'outdoor_dining', label: 'Outdoor Dining' },
];

const DAYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
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

interface HoursEntry {
  day_of_week: DayOfWeek;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  is_cover: boolean;
  display_order: number;
}

const defaultHours: HoursEntry[] = DAYS.map((day) => ({
  day_of_week: day,
  is_closed: day === 'sunday',
  open_time: '11:00',
  close_time: '22:00',
}));

export default function ProfilePage() {
  const { restaurant, restaurantId, isLoading: contextLoading, refreshRestaurant, buildApiUrl } = useRestaurant();

  // Profile form state
  const [formData, setFormData] = useState<FormData>({
    name: '', description: '', address: '', city: '', state: '', zip_code: '', phone: '', email: '', website: '', categories: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Hours state
  const [hours, setHours] = useState<HoursEntry[]>(defaultHours);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);

  // Photos state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load restaurant data into profile form
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
        email: '',
        website: restaurant.website || '',
        categories: restaurant.categories || [],
      });
    }
  }, [restaurant]);

  // Fetch hours
  useEffect(() => {
    async function fetchHours() {
      if (!restaurantId) return;
      setHoursLoading(true);
      setHoursError(null);
      try {
        const response = await fetch(buildApiUrl('/api/dashboard/hours'));
        if (!response.ok) throw new Error('Failed to fetch hours');
        const data = await response.json();
        if (data.hours && data.hours.length > 0) {
          const fetchedHours = DAYS.map((day) => {
            const existing = data.hours.find((h: { day_of_week: DayOfWeek }) => h.day_of_week === day);
            return existing
              ? { day_of_week: day, is_closed: existing.is_closed, open_time: existing.open_time || '11:00', close_time: existing.close_time || '22:00' }
              : { day_of_week: day, is_closed: false, open_time: '11:00', close_time: '22:00' };
          });
          setHours(fetchedHours);
        }
      } catch (err) {
        console.error('Error fetching hours:', err);
        setHoursError('Failed to load hours');
      } finally {
        setHoursLoading(false);
      }
    }
    fetchHours();
  }, [restaurantId, buildApiUrl]);

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    if (!restaurant?.id) return;
    setPhotosLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/dashboard/photos'));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch photos');
      setPhotos(data);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setPhotosLoading(false);
    }
  }, [restaurant?.id, buildApiUrl]);

  useEffect(() => {
    if (restaurant?.id) fetchPhotos();
  }, [restaurant?.id, fetchPhotos]);

  // --- Profile handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) { setError('No restaurant found'); return; }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl('/api/dashboard/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, description: formData.description, address: formData.address,
          city: formData.city, state: formData.state, zip_code: formData.zip_code,
          phone: formData.phone, website: formData.website, categories: formData.categories,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }
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

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;
    e.target.value = '';
    setUploadingCover(true);
    setError(null);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadRes = await fetch(buildApiUrl('/api/dashboard/photos/upload'), { method: 'POST', body: uploadFormData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload image');
      const coverRes = await fetch(buildApiUrl(`/api/dashboard/photos/${uploadData.id}/cover`), { method: 'POST' });
      if (!coverRes.ok) {
        const coverData = await coverRes.json();
        throw new Error(coverData.error || 'Failed to set cover photo');
      }
      await refreshRestaurant();
      await fetchPhotos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  // --- Hours handlers ---
  const updateHours = (day: DayOfWeek, field: keyof HoursEntry, value: string | boolean) => {
    setHours((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h)));
  };

  const handleHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) { setHoursError('No restaurant found'); return; }
    setHoursSaving(true);
    setHoursError(null);
    try {
      const response = await fetch(buildApiUrl('/api/dashboard/hours'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save hours');
      }
      setHoursSaved(true);
      setTimeout(() => setHoursSaved(false), 3000);
    } catch (err) {
      setHoursError(err instanceof Error ? err.message : 'Failed to save hours');
    } finally {
      setHoursSaving(false);
    }
  };

  const capitalizeDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

  // --- Photo handlers ---
  const handleFileSelect = useCallback(async (file: File) => {
    if (!restaurant?.id) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(buildApiUrl('/api/dashboard/photos/upload'), { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      toast.success('Photo uploaded successfully!');
      await fetchPhotos();
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }, [restaurant?.id, buildApiUrl, fetchPhotos]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    } else {
      toast.error('Please drop an image file');
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);

  const handleUpload = () => { fileInputRef.current?.click(); };

  const setCoverPhoto = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/photos/${id}/cover`), { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to set cover photo');
      toast.success('Cover photo updated!');
      await fetchPhotos();
      await refreshRestaurant();
    } catch (err) {
      console.error('Error setting cover photo:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to set cover photo');
    }
  };

  const deletePhoto = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/photos/${id}`), { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete photo');
      toast.success('Photo deleted!');
      await fetchPhotos();
    } catch (err) {
      console.error('Error deleting photo:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete photo');
    }
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
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverImageUpload}
            className="hidden"
          />
          {restaurant?.cover_image_url ? (
            <div
              className="relative aspect-[3/1] bg-tastelanc-surface rounded-lg overflow-hidden"
              onClick={() => !uploadingCover && coverInputRef.current?.click()}
            >
              <img
                src={restaurant.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="text-center">
                  {uploadingCover ? (
                    <>
                      <Loader2 className="w-8 h-8 text-white mx-auto mb-2 animate-spin" />
                      <p className="text-white">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white mx-auto mb-2" />
                      <p className="text-white">Click to change</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="aspect-[3/1] bg-tastelanc-surface rounded-lg flex items-center justify-center border-2 border-dashed border-tastelanc-surface-light hover:border-tastelanc-accent transition-colors cursor-pointer"
              onClick={() => !uploadingCover && coverInputRef.current?.click()}
            >
              <div className="text-center">
                {uploadingCover ? (
                  <>
                    <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-gray-400">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">Click to upload or drag and drop</p>
                    <p className="text-gray-500 text-sm mt-1">PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Basic Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Restaurant Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-none"
                placeholder="Tell customers about your restaurant..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Categories</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
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

        {/* Submit Profile */}
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

      {/* Business Hours Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Business Hours
        </h3>

        {hoursError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400">{hoursError}</p>
          </div>
        )}

        {hoursLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-12 bg-tastelanc-surface-light rounded" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleHoursSubmit}>
            <div className="space-y-4">
              {hours.map((entry) => (
                <div
                  key={entry.day_of_week}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-tastelanc-surface-light last:border-0"
                >
                  <div className="w-32">
                    <span className="text-white font-medium">{capitalizeDay(entry.day_of_week)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`closed-${entry.day_of_week}`}
                      checked={entry.is_closed}
                      onChange={(e) => updateHours(entry.day_of_week, 'is_closed', e.target.checked)}
                      className="w-4 h-4 rounded border-tastelanc-surface-light bg-tastelanc-surface text-tastelanc-accent focus:ring-tastelanc-accent"
                    />
                    <label htmlFor={`closed-${entry.day_of_week}`} className="text-sm text-gray-400">Closed</label>
                  </div>
                  {!entry.is_closed && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={entry.open_time}
                        onChange={(e) => updateHours(entry.day_of_week, 'open_time', e.target.value)}
                        className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={entry.close_time}
                        onChange={(e) => updateHours(entry.day_of_week, 'close_time', e.target.value)}
                        className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                      />
                    </div>
                  )}
                  {entry.is_closed && <span className="text-gray-500 italic">Closed</span>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-4 mt-6 pt-6 border-t border-tastelanc-surface-light">
              {hoursSaved && (
                <span className="text-green-400 text-sm">Hours saved successfully!</span>
              )}
              <Button type="submit" disabled={hoursSaving}>
                <Save className="w-4 h-4 mr-2" />
                {hoursSaving ? 'Saving...' : 'Save Hours'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Photo Gallery Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Photo Gallery
          </h3>
          <span className="text-gray-400 text-sm">{photos.length}/10 photos</span>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Upload Zone */}
        <div
          className={`p-6 border-2 border-dashed rounded-lg transition-colors mb-6 ${
            isDragOver
              ? 'border-lancaster-gold bg-lancaster-gold/10'
              : 'border-tastelanc-surface-light hover:border-tastelanc-accent'
          } ${photos.length >= 10 || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => { if (photos.length < 10 && !uploading) handleUpload(); }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-lancaster-gold mx-auto mb-2 animate-spin" />
                <p className="text-gray-300 text-sm">Uploading photo...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-300 text-sm">
                  {isDragOver ? 'Drop photo here' : 'Drag and drop photos here, or click to browse'}
                </p>
                <p className="text-gray-500 text-xs mt-1">PNG, JPG, WebP up to 5MB each</p>
              </>
            )}
          </div>
        </div>

        {/* Photo Grid */}
        {photosLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-lancaster-gold animate-spin" />
          </div>
        ) : photos.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  className="w-full aspect-[4/3] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCoverPhoto(photo.id)}
                    className={`p-2 rounded-full transition-colors ${
                      photo.is_cover
                        ? 'bg-lancaster-gold text-black'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title="Set as cover photo"
                  >
                    <Star className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="p-2 bg-white/20 hover:bg-red-500 text-white rounded-full transition-colors"
                    title="Delete photo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                {photo.is_cover && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="gold" className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Cover
                    </Badge>
                  </div>
                )}
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-sm truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ImageIcon className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-3">No photos yet. Upload photos to showcase your restaurant.</p>
            <Button onClick={handleUpload} variant="secondary">
              <Upload className="w-4 h-4 mr-2" />
              Upload Photos
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
