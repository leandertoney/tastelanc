'use client';

import { useState } from 'react';
import { X, Loader2, Sparkles, Plus, Check, MapPin, Users, Brain } from 'lucide-react';
import { toast } from 'sonner';
import type { CitySuggestion } from '@/lib/ai/expansion-types';

interface AISuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCityAdded: (city: any) => void;
}

export default function AISuggestModal({ isOpen, onClose, onCityAdded }: AISuggestModalProps) {
  const [state, setState] = useState('PA');
  const [minPopulation, setMinPopulation] = useState('');
  const [maxPopulation, setMaxPopulation] = useState('');
  const [count, setCount] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setSuggestions([]);
    setAddedIds(new Set());

    try {
      const body: Record<string, unknown> = {
        state: state.trim() || 'PA',
        count: parseInt(count, 10) || 10,
      };

      if (minPopulation) body.min_population = parseInt(minPopulation, 10);
      if (maxPopulation) body.max_population = parseInt(maxPopulation, 10);

      const res = await fetch('/api/admin/expansion/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate suggestions');
      }

      setSuggestions(data.suggestions || []);

      if ((data.suggestions || []).length === 0) {
        toast.error('No suggestions returned. Try adjusting your criteria.');
      } else {
        toast.success(`Generated ${data.suggestions.length} city suggestions`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate suggestions';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToPipeline = async (suggestion: CitySuggestion) => {
    const key = `${suggestion.city_name}-${suggestion.state}`;
    setAddingIds((prev) => new Set(prev).add(key));

    try {
      const res = await fetch('/api/admin/expansion/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_name: suggestion.city_name,
          county: suggestion.county,
          state: suggestion.state,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add city');
      }

      toast.success(`${suggestion.city_name} added to the pipeline`);
      setAddedIds((prev) => new Set(prev).add(key));
      onCityAdded(data.city);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add city';
      toast.error(message);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const getSuggestionKey = (s: CitySuggestion) => `${s.city_name}-${s.state}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-tastelanc-surface-light flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lancaster-gold" />
            <h2 className="text-lg font-semibold text-white">AI City Suggestions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-tastelanc-surface-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Criteria Form */}
        <form onSubmit={handleGenerate} className="p-5 border-b border-tastelanc-surface-light flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="PA"
                className="w-full px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Min Population</label>
              <input
                type="number"
                value={minPopulation}
                onChange={(e) => setMinPopulation(e.target.value)}
                placeholder="e.g. 10000"
                className="w-full px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Max Population</label>
              <input
                type="number"
                value={maxPopulation}
                onChange={(e) => setMaxPopulation(e.target.value)}
                placeholder="e.g. 200000"
                className="w-full px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Count</label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="10"
                min="1"
                max="25"
                className="w-full px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-lancaster-gold/20 hover:bg-lancaster-gold/30 disabled:opacity-50 disabled:cursor-not-allowed text-lancaster-gold rounded-lg transition-colors text-sm font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Suggestions...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Generate Suggestions
              </>
            )}
          </button>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-lancaster-gold mb-3" />
              <p className="text-sm">AI is analyzing potential markets...</p>
              <p className="text-xs text-gray-500 mt-1">This may take 15-30 seconds</p>
            </div>
          )}

          {!isGenerating && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Sparkles className="w-10 h-10 mb-3 text-gray-600" />
              <p className="text-sm">Set your criteria above and generate AI suggestions</p>
            </div>
          )}

          {!isGenerating && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const key = getSuggestionKey(suggestion);
                const isAdding = addingIds.has(key);
                const isAdded = addedIds.has(key);

                return (
                  <div
                    key={key}
                    className="bg-tastelanc-surface-light rounded-lg border border-tastelanc-surface-light p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{suggestion.city_name}</h4>
                          <span className="text-gray-500 text-sm">{suggestion.state}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {suggestion.county} County
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {suggestion.population.toLocaleString()} pop.
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-lancaster-gold" />
                            Score: {suggestion.estimated_score}/100
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                          {suggestion.reasoning}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAddToPipeline(suggestion)}
                        disabled={isAdding || isAdded}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isAdded
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Added
                          </>
                        ) : isAdding ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Add to Pipeline
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
