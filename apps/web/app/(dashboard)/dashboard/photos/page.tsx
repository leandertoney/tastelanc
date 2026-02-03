'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Trash2, Image as ImageIcon, Star, Check, Loader2 } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  is_cover: boolean;
  display_order: number;
}

export default function PhotosPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch photos on mount
  useEffect(() => {
    if (restaurant?.id) {
      fetchPhotos();
    }
  }, [restaurant?.id]);

  const fetchPhotos = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/dashboard/photos'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch photos');
      }

      setPhotos(data);
    } catch (err) {
      console.error('Error fetching photos:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!restaurant?.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        buildApiUrl('/api/dashboard/photos/upload'),
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      toast.success('Photo uploaded successfully!');
      await fetchPhotos(); // Refresh photos list
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }, [restaurant?.id, buildApiUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const setCoverPhoto = async (id: string) => {
    try {
      const response = await fetch(
        `/api/dashboard/photos/${id}/cover`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set cover photo');
      }

      toast.success('Cover photo updated!');
      await fetchPhotos(); // Refresh photos list
    } catch (err) {
      console.error('Error setting cover photo:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to set cover photo');
    }
  };

  const deletePhoto = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/dashboard/photos/${id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete photo');
      }

      toast.success('Photo deleted!');
      await fetchPhotos(); // Refresh photos list
    } catch (err) {
      console.error('Error deleting photo:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-lancaster-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            Photo Gallery
          </h2>
          <p className="text-gray-400 mt-1">
            Manage photos of your restaurant ({photos.length}/10)
          </p>
        </div>
        <Button onClick={handleUpload} disabled={photos.length >= 10 || uploading}>
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Photos
            </>
          )}
        </Button>
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
      <Card
        className={`p-8 border-2 border-dashed transition-colors ${
          isDragOver
            ? 'border-lancaster-gold bg-lancaster-gold/10'
            : 'border-tastelanc-surface-light hover:border-tastelanc-accent'
        } ${photos.length >= 10 || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => {
          if (photos.length < 10 && !uploading) {
            handleUpload();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-lancaster-gold mx-auto mb-4 animate-spin" />
              <p className="text-gray-300 mb-2">Uploading photo...</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">
                {isDragOver ? 'Drop photo here' : 'Drag and drop photos here, or click to browse'}
              </p>
              <p className="text-gray-500 text-sm">PNG, JPG, WebP up to 5MB each. Max 10 photos.</p>
            </>
          )}
        </div>
      </Card>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`relative group rounded-xl overflow-hidden ${
                selectedPhoto === photo.id ? 'ring-2 ring-tastelanc-accent' : ''
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? ''}
                className="w-full aspect-[4/3] object-cover"
                referrerPolicy="no-referrer"
              />

              {/* Overlay */}
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

              {/* Cover Badge */}
              {photo.is_cover && (
                <div className="absolute top-2 left-2">
                  <Badge variant="gold" className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Cover
                  </Badge>
                </div>
              )}

              {/* Caption */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-sm truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <Card className="p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No photos yet</h3>
          <p className="text-gray-400 mb-4">
            Upload photos to showcase your restaurant to customers
          </p>
          <Button onClick={handleUpload}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Photos
          </Button>
        </Card>
      )}

      {/* Tips */}
      <Card className="p-6 bg-tastelanc-surface">
        <h3 className="font-semibold text-white mb-3">Photo Tips</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            Use high-quality, well-lit photos
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            Show your best dishes and drinks
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            Include photos of your space and atmosphere
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            Set your best photo as the cover image
          </li>
        </ul>
      </Card>
    </div>
  );
}
