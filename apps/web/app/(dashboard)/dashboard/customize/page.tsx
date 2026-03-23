'use client';

import { useState, useEffect, useCallback } from 'react';
import { GripVertical, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import TierGate from '@/components/TierGate';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

interface TabPreference {
  key: string;
  hidden: boolean;
}

interface TabConfig {
  key: string;
  label: string;
  description: string;
  hidden: boolean;
}

const DEFAULT_TABS: Omit<TabConfig, 'hidden'>[] = [
  { key: 'recommendations', label: 'Recommendations', description: 'Video recommendations from customers' },
  { key: 'happy_hours', label: 'Happy Hours', description: 'Your happy hour deals and specials' },
  { key: 'specials', label: 'Specials', description: 'Daily specials and limited-time offers' },
  { key: 'coupons', label: 'Coupons', description: 'Digital coupons customers can claim in the app' },
  { key: 'events', label: 'Events', description: 'Live music, trivia, and other events' },
  { key: 'menu', label: 'Menu', description: 'Your full menu with sections and items' },
  { key: 'features', label: 'Features', description: 'Amenities like private dining, outdoor seating, and more' },
];

function SortableTabRow({
  tab,
  onToggleVisibility,
}: {
  tab: TabConfig;
  onToggleVisibility: (key: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 hover:bg-tastelanc-surface/50 ${isDragging ? 'bg-tastelanc-surface shadow-lg rounded-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none text-tastelanc-text-faint hover:text-tastelanc-text-secondary cursor-grab active:cursor-grabbing flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        onClick={() => onToggleVisibility(tab.key)}
        className={`flex-shrink-0 transition-colors ${
          tab.hidden
            ? 'text-tastelanc-text-faint hover:text-tastelanc-text-muted'
            : 'text-tastelanc-accent hover:text-tastelanc-accent/80'
        }`}
        aria-label={tab.hidden ? `Show ${tab.label} tab` : `Hide ${tab.label} tab`}
      >
        {tab.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      <div className={`flex-1 min-w-0 ${tab.hidden ? 'opacity-40' : ''}`}>
        <p className="text-tastelanc-text-primary font-medium text-sm">{tab.label}</p>
        <p className="text-tastelanc-text-faint text-xs truncate">{tab.description}</p>
      </div>

      {tab.hidden && (
        <span className="text-xs text-tastelanc-text-faint bg-tastelanc-surface-light px-2 py-0.5 rounded flex-shrink-0">
          Hidden
        </span>
      )}
    </div>
  );
}

function CustomizeContent() {
  const { restaurant } = useRestaurant();
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor));

  const loadPreferences = useCallback(async () => {
    if (!restaurant?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/display-preferences?restaurant_id=${restaurant.id}`);
      const data = await res.json();
      const savedTabs: TabPreference[] = data.preferences?.tabs ?? [];

      if (savedTabs.length > 0) {
        // Merge saved order/visibility with defaults (handles new tabs added after initial save)
        const savedKeys = savedTabs.map(t => t.key);
        const savedMap = new Map(savedTabs.map(t => [t.key, t]));

        const merged: TabConfig[] = [
          // Saved tabs in saved order
          ...savedTabs.map(saved => {
            const def = DEFAULT_TABS.find(d => d.key === saved.key);
            if (!def) return null;
            return { ...def, hidden: saved.hidden };
          }).filter((t): t is TabConfig => t !== null),
          // Any new default tabs not in saved prefs (append to end, visible by default)
          ...DEFAULT_TABS.filter(d => !savedKeys.includes(d.key)).map(d => ({ ...d, hidden: false })),
        ];
        setTabs(merged);
      } else {
        setTabs(DEFAULT_TABS.map(d => ({ ...d, hidden: false })));
      }
    } catch {
      setTabs(DEFAULT_TABS.map(d => ({ ...d, hidden: false })));
    } finally {
      setIsLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTabs(prev => {
      const oldIndex = prev.findIndex(t => t.key === active.id);
      const newIndex = prev.findIndex(t => t.key === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setIsDirty(true);
  };

  const handleToggleVisibility = (key: string) => {
    setTabs(prev => prev.map(t => t.key === key ? { ...t, hidden: !t.hidden } : t));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;
    setIsSaving(true);
    try {
      const tabPreferences: TabPreference[] = tabs.map(t => ({ key: t.key, hidden: t.hidden }));
      const res = await fetch(`/api/dashboard/display-preferences?restaurant_id=${restaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs: tabPreferences }),
      });

      if (!res.ok) throw new Error('Save failed');

      setIsDirty(false);
      toast.success('Display preferences saved — changes reflect instantly in the app');
    } catch {
      toast.error('Failed to save display preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTabs(DEFAULT_TABS.map(d => ({ ...d, hidden: false })));
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  const visibleCount = tabs.filter(t => !t.hidden).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-tastelanc-text-primary">Customize Your App Profile</h2>
        <p className="text-tastelanc-text-muted text-sm mt-1">
          Control which tabs appear in your restaurant profile and in what order. Changes are instant — no app update needed.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-tastelanc-surface-light flex items-center justify-between">
          <div>
            <h3 className="font-medium text-tastelanc-text-primary">Profile Tabs</h3>
            <p className="text-xs text-tastelanc-text-muted mt-0.5">
              Drag to reorder · Click the eye icon to show or hide
            </p>
          </div>
          <span className="text-xs text-tastelanc-text-faint">
            {visibleCount} of {tabs.length} visible
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map(t => t.key)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-tastelanc-surface-light">
              {tabs.map(tab => (
                <SortableTabRow key={tab.key} tab={tab} onToggleVisibility={handleToggleVisibility} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        {isDirty && (
          <button
            onClick={handleReset}
            className="text-sm text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors"
          >
            Reset to defaults
          </button>
        )}
      </div>

      <div className="text-xs text-tastelanc-text-faint bg-tastelanc-surface rounded-lg p-3">
        <strong className="text-tastelanc-text-muted">Tip:</strong> Hiding a tab removes it from your profile even if you have content in it.
        This is useful if you&apos;re temporarily not offering happy hours or have seasonal menus.
        The content is never deleted — just hidden from customers.
      </div>
    </div>
  );
}

export default function CustomizePage() {
  return (
    <TierGate
      requiredTier="premium"
      feature="Profile Customization"
      description="Reorder and hide tabs in your app profile to match how you want to present your restaurant to customers."
    >
      <CustomizeContent />
    </TierGate>
  );
}
