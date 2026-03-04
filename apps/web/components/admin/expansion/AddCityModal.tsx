'use client';

import { useState } from 'react';
import { X, Loader2, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import { useUSCitySearch } from '@/hooks/useUSCitySearch';

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
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false);

  const { cityOptions, countyOptions, searchCities, searchCounties, findCity } = useUSCitySearch();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cityName.trim() || !county.trim()) {
      toast.error('City name and county are required');
      return;
    }

    // If not selected from dropdown, try to auto-match against the dataset
    let finalCity = cityName.trim();
    let finalCounty = county.trim();
    let finalState = state.trim() || 'PA';

    if (!selectedFromDropdown) {
      const match = findCity(finalCity, finalState);
      if (match) {
        // Auto-correct to the canonical name from the dataset
        finalCity = match.c;
        finalCounty = match.co;
        finalState = match.s;
      } else {
        // No match at all — warn and block
        toast.error(
          'City not found in US cities database. Please select from the dropdown to ensure accurate Census data.',
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/expansion/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_name: finalCity,
          county: finalCounty,
          state: finalState,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add city');
      }

      toast.success(`${finalCity} added to the pipeline`);
      onCityAdded(data.city);

      // Reset form
      setCityName('');
      setCounty('');
      setState('PA');
      setSelectedFromDropdown(false);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add city';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show status indicator based on whether the city was selected from dropdown
  const showMatchStatus = cityName.trim().length >= 2;

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
            <AutocompleteInput
              value={cityName}
              onChange={(val) => {
                setCityName(val);
                setSelectedFromDropdown(false);
                searchCities(val);
              }}
              onSelect={(option) => {
                const city = option.value as { c: string; co: string; s: string; p: number };
                setCityName(city.c);
                setCounty(city.co);
                setState(city.s);
                setSelectedFromDropdown(true);
              }}
              options={cityOptions}
              placeholder="Start typing to search US cities..."
              autoFocus
            />
            {showMatchStatus && (
              <div className="mt-1.5 flex items-center gap-1.5">
                {selectedFromDropdown ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <span className="text-xs text-green-400">Census-verified city selected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-400">Select from dropdown for accurate Census data</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              County <span className="text-red-400">*</span>
            </label>
            <AutocompleteInput
              value={county}
              onChange={(val) => {
                setCounty(val);
                searchCounties(val);
              }}
              onSelect={(option) => {
                const countyData = option.value as { co: string; s: string; p: number };
                setCounty(countyData.co);
                setState(countyData.s);
              }}
              options={countyOptions}
              placeholder="e.g. York County"
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
              disabled={selectedFromDropdown}
              className="w-full px-3 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent disabled:opacity-60"
            />
            {selectedFromDropdown && (
              <p className="text-xs text-gray-500 mt-1">Auto-filled from city selection</p>
            )}
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
