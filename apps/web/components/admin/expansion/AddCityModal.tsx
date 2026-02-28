'use client';

import { useState } from 'react';
import { X, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface AddCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCityAdded: (city: any) => void;
}

export default function AddCityModal({ isOpen, onClose, onCityAdded }: AddCityModalProps) {
  const [cityName, setCityName] = useState('');
  const [county, setCounty] = useState('');
  const [state, setState] = useState('PA');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cityName.trim() || !county.trim()) {
      toast.error('City name and county are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/expansion/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_name: cityName.trim(),
          county: county.trim(),
          state: state.trim() || 'PA',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add city');
      }

      toast.success(`${cityName} added to the pipeline`);
      onCityAdded(data.city);

      // Reset form
      setCityName('');
      setCounty('');
      setState('PA');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add city';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-tastelanc-surface-light">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tastelanc-accent" />
            <h2 className="text-lg font-semibold text-white">Add City to Pipeline</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-tastelanc-surface-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              City Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="e.g. York"
              className="w-full px-3 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              County <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="e.g. York County"
              className="w-full px-3 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="PA"
              className="w-full px-3 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !cityName.trim() || !county.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add City'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
