'use client';

import { useState } from 'react';
import { Upload, Trash2, Image as ImageIcon, Star, Check } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';

interface Photo {
  id: string;
  url: string;
  caption: string;
  is_cover: boolean;
}

// Mock data
const initialPhotos: Photo[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    caption: 'Our beautiful dining room',
    is_cover: true,
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    caption: 'Signature dish',
    is_cover: false,
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800',
    caption: 'Bar area',
    is_cover: false,
  },
];

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const setCoverPhoto = (id: string) => {
    setPhotos((prev) =>
      prev.map((photo) => ({
        ...photo,
        is_cover: photo.id === id,
      }))
    );
  };

  const deletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const handleUpload = () => {
    // TODO: Implement file upload
    alert('File upload coming soon!');
  };

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
        <Button onClick={handleUpload} disabled={photos.length >= 10}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Photos
        </Button>
      </div>

      {/* Upload Zone */}
      <Card
        className="p-8 border-2 border-dashed border-tastelanc-surface-light hover:border-tastelanc-accent transition-colors cursor-pointer"
        onClick={handleUpload}
      >
        <div className="text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">Drag and drop photos here, or click to browse</p>
          <p className="text-gray-500 text-sm">PNG, JPG up to 5MB each. Max 10 photos.</p>
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
                alt={photo.caption}
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
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm truncate">{photo.caption}</p>
              </div>
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
