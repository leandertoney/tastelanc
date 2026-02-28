'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SpecialImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  restaurantId: string;
}

export default function SpecialImageUpload({ value, onChange, restaurantId }: SpecialImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/dashboard/specials/upload?restaurant_id=${restaurantId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onChange(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }, [restaurantId, onChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    } else {
      setError('Please drop an image file');
    }
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback(() => {
    onChange(undefined);
    setError(null);
  }, [onChange]);

  if (value) {
    return (
      <div className="relative">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-tastelanc-surface border border-tastelanc-surface-light">
          <img
            src={value}
            alt="Special image"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">Custom image uploaded</p>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isUploading}
        className={`
          w-full aspect-video rounded-lg border-2 border-dashed transition-all
          flex flex-col items-center justify-center gap-2
          ${isDragOver
            ? 'border-lancaster-gold bg-lancaster-gold/10'
            : 'border-tastelanc-surface-light hover:border-gray-500 bg-tastelanc-surface/50'
          }
          ${isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        `}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 text-lancaster-gold animate-spin" />
            <span className="text-sm text-gray-400">Uploading...</span>
          </>
        ) : (
          <>
            <div className="p-2 rounded-full bg-tastelanc-surface">
              {isDragOver ? (
                <ImageIcon className="w-6 h-6 text-lancaster-gold" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-center">
              <span className="text-sm text-gray-300">
                {isDragOver ? 'Drop image here' : 'Add custom image'}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                PNG, JPG, or WebP (max 5MB)
              </p>
            </div>
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 mt-1.5">{error}</p>
      )}
      <p className="text-xs text-gray-500 mt-1.5">
        Optional. Your restaurant cover image will be used if not provided.
      </p>
    </div>
  );
}
