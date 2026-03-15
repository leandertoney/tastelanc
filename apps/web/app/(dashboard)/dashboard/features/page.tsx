'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';

// Feature groups and definitions (mirrors packages/shared/src/constants.ts)
interface FeatureDefinition {
  value: string;
  label: string;
}

interface FeatureGroup {
  key: string;
  label: string;
  features: FeatureDefinition[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: 'entertainment',
    label: 'Entertainment',
    features: [
      { value: 'live_piano', label: 'Live Piano' },
      { value: 'live_band', label: 'Live Band' },
      { value: 'live_dj', label: 'Live DJ' },
      { value: 'trivia_nights', label: 'Trivia Nights' },
      { value: 'karaoke', label: 'Karaoke' },
      { value: 'comedy_shows', label: 'Comedy Shows' },
      { value: 'live_sports_viewing', label: 'Live Sports' },
      { value: 'arcade_games', label: 'Arcade/Games' },
      { value: 'board_games', label: 'Board Games' },
      { value: 'pool_tables', label: 'Pool Tables' },
    ],
  },
  {
    key: 'dining_experience',
    label: 'Dining Experience',
    features: [
      { value: 'private_dining', label: 'Private Dining' },
      { value: 'prix_fixe_menu', label: 'Prix Fixe Menu' },
      { value: 'tasting_menu', label: 'Tasting Menu' },
      { value: 'chefs_table', label: "Chef's Table" },
      { value: 'wine_pairing', label: 'Wine Pairing' },
      { value: 'beer_flights', label: 'Beer Flights' },
      { value: 'cocktail_menu', label: 'Cocktail Menu' },
      { value: 'seasonal_menu', label: 'Seasonal Menu' },
      { value: 'farm_to_table', label: 'Farm to Table' },
    ],
  },
  {
    key: 'space_atmosphere',
    label: 'Space & Atmosphere',
    features: [
      { value: 'outdoor_patio', label: 'Outdoor Patio' },
      { value: 'heated_patio', label: 'Heated Patio' },
      { value: 'rooftop_seating', label: 'Rooftop Seating' },
      { value: 'fireplace', label: 'Fireplace' },
      { value: 'waterfront', label: 'Waterfront' },
      { value: 'garden_dining', label: 'Garden Dining' },
      { value: 'sidewalk_cafe', label: 'Sidewalk Cafe' },
      { value: 'covered_outdoor', label: 'Covered Outdoor' },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    features: [
      { value: 'reservations', label: 'Reservations' },
      { value: 'walkins_welcome', label: 'Walk-ins Welcome' },
      { value: 'takeout', label: 'Takeout' },
      { value: 'delivery', label: 'Delivery' },
      { value: 'catering', label: 'Catering' },
      { value: 'event_space', label: 'Event Space' },
      { value: 'full_bar', label: 'Full Bar' },
      { value: 'byob_allowed', label: 'BYOB' },
      { value: 'valet_parking', label: 'Valet Parking' },
      { value: 'free_parking', label: 'Free Parking' },
      { value: 'street_parking', label: 'Street Parking' },
    ],
  },
  {
    key: 'accessibility_family',
    label: 'Accessibility & Family',
    features: [
      { value: 'wheelchair_accessible', label: 'Wheelchair Accessible' },
      { value: 'high_chairs', label: 'High Chairs' },
      { value: 'kids_menu', label: 'Kids Menu' },
      { value: 'family_friendly', label: 'Family Friendly' },
      { value: 'pet_friendly_indoor', label: 'Pet Friendly (Indoor)' },
      { value: 'pet_friendly_patio', label: 'Pet Friendly (Patio)' },
    ],
  },
  {
    key: 'dietary',
    label: 'Dietary Accommodations',
    features: [
      { value: 'vegan_options', label: 'Vegan Options' },
      { value: 'vegetarian_options', label: 'Vegetarian Options' },
      { value: 'gluten_free_options', label: 'Gluten-Free Options' },
      { value: 'halal', label: 'Halal' },
      { value: 'kosher', label: 'Kosher' },
      { value: 'allergy_friendly', label: 'Allergy Friendly' },
    ],
  },
];

export default function FeaturesPage() {
  const { restaurant, restaurantId, refreshRestaurant, buildApiUrl } = useRestaurant();

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load features from restaurant data
  useEffect(() => {
    if (restaurant) {
      const features = (restaurant as any).features || [];
      setSelectedFeatures(features);
      setHasChanges(false);
    }
  }, [restaurant]);

  const handleToggle = (feature: string) => {
    setSelectedFeatures((prev) => {
      const updated = prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature];
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      const response = await fetch(buildApiUrl('/api/dashboard/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: selectedFeatures }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save features');
      }
      await refreshRestaurant();
      setHasChanges(false);
      toast.success('Features saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save features');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = selectedFeatures.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-tastelanc-text-primary">Features & Amenities</h2>
          <p className="text-tastelanc-text-muted mt-1">
            Select what your restaurant offers. These help diners discover you through search filters in the app.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {activeCount > 0 && (
        <p className="text-sm text-tastelanc-accent font-medium">
          {activeCount} feature{activeCount !== 1 ? 's' : ''} selected
        </p>
      )}

      {/* Feature Groups */}
      {FEATURE_GROUPS.map((group) => {
        const groupActiveCount = group.features.filter((f) =>
          selectedFeatures.includes(f.value)
        ).length;

        return (
          <Card key={group.key} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-tastelanc-text-primary">{group.label}</h3>
              {groupActiveCount > 0 && (
                <span className="text-xs text-tastelanc-accent bg-tastelanc-accent/10 px-2 py-1 rounded-full">
                  {groupActiveCount} active
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.features.map((feat) => {
                const isActive = selectedFeatures.includes(feat.value);
                return (
                  <button
                    key={feat.value}
                    type="button"
                    onClick={() => handleToggle(feat.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      isActive
                        ? 'bg-tastelanc-accent text-white'
                        : 'bg-tastelanc-surface-light text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light/80'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {feat.label}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Sticky save bar when changes exist */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-tastelanc-surface border-t border-tastelanc-surface-light p-4 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-tastelanc-text-muted">
              You have unsaved changes
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
