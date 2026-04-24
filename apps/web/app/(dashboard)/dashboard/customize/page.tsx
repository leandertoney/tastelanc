'use client';

import { useState, useEffect, useCallback } from 'react';
import { GripVertical, Loader2, Save } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import TierGate from '@/components/TierGate';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TabPreference {
  key: string;
  hidden: boolean;
}

interface TabConfig {
  key: string;
  label: string;
  description: string;
}

const DEFAULT_TABS: TabConfig[] = [
  { key: 'recommendations', label: 'Recommendations', description: 'Video recommendations from customers' },
  { key: 'happy_hours', label: 'Happy Hours', description: 'Your happy hour deals and specials' },
  { key: 'specials', label: 'Specials', description: 'Daily specials and limited-time offers' },
  { key: 'coupons', label: 'Deals', description: 'Digital deals customers can claim in the app' },
  { key: 'events', label: 'Events', description: 'Live music, trivia, and other events' },
  { key: 'menu', label: 'Menu', description: 'Your full menu with sections and items' },
  { key: 'features', label: 'Features', description: 'Amenities like private dining, outdoor seating, and more' },
];

type SectionCounts = Record<string, number>;

function StatusChip({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span className="text-xs text-tastelanc-text-muted bg-tastelanc-surface-light px-2 py-0.5 rounded flex-shrink-0">
        {count} item{count === 1 ? '' : 's'}
      </span>
    );
  }
  return (
    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
      Empty — nearby suggestions showing
    </span>
  );
}

function SortableTabRow({
  tab,
  count,
}: {
  tab: TabConfig;
  count: number;
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

      <div className="flex-1 min-w-0">
        <p className="text-tastelanc-text-primary font-medium text-sm">{tab.label}</p>
        <p className="text-tastelanc-text-faint text-xs truncate">{tab.description}</p>
      </div>

      <StatusChip count={count} />
    </div>
  );
}

function CustomizeContent() {
  const { restaurant } = useRestaurant();
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [counts, setCounts] = useState<SectionCounts>({});
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
        // Merge saved order with defaults (ignore legacy `hidden` field — sections now always visible)
        const savedKeys = savedTabs.map(t => t.key);
        const merged: TabConfig[] = [
          ...savedTabs
            .map(saved => DEFAULT_TABS.find(d => d.key === saved.key))
            .filter((t): t is TabConfig => !!t),
          ...DEFAULT_TABS.filter(d => !savedKeys.includes(d.key)),
        ];
        setTabs(merged);
      } else {
        setTabs(DEFAULT_TABS);
      }
    } catch {
      setTabs(DEFAULT_TABS);
    } finally {
      setIsLoading(false);
    }
  }, [restaurant?.id]);

  const loadCounts = useCallback(async () => {
    if (!restaurant?.id) return;
    const supabase = createClient();
    const [hh, sp, ev, mn, cp, rec, feat] = await Promise.all([
      supabase.from('happy_hours').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
      supabase.from('specials').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
      supabase.from('menus').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
      supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
      supabase.from('video_recommendations').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
      Promise.resolve({ count: ((restaurant as any).features?.length ?? 0) }),
    ]);
    setCounts({
      happy_hours: hh.count ?? 0,
      specials: sp.count ?? 0,
      events: ev.count ?? 0,
      menu: mn.count ?? 0,
      coupons: cp.count ?? 0,
      recommendations: rec.count ?? 0,
      features: feat.count ?? 0,
    });
  }, [restaurant?.id]);

  useEffect(() => {
    loadPreferences();
    loadCounts();
  }, [loadPreferences, loadCounts]);

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

  const handleSave = async () => {
    if (!restaurant?.id) return;
    setIsSaving(true);
    try {
      const tabPreferences: TabPreference[] = tabs.map(t => ({ key: t.key, hidden: false }));
      const res = await fetch(`/api/dashboard/display-preferences?restaurant_id=${restaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs: tabPreferences }),
      });

      if (!res.ok) throw new Error('Save failed');

      setIsDirty(false);
      toast.success('Display order saved — changes reflect instantly in the app');
    } catch {
      toast.error('Failed to save display order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTabs(DEFAULT_TABS);
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-tastelanc-text-primary">Customize Your App Profile</h2>
        <p className="text-tastelanc-text-muted text-sm mt-1">
          Drag to reorder the tabs in your restaurant profile. Changes are instant — no app update needed.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-tastelanc-surface-light">
          <h3 className="font-medium text-tastelanc-text-primary">Profile Tabs</h3>
          <p className="text-xs text-tastelanc-text-muted mt-0.5">
            Drag to reorder
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map(t => t.key)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-tastelanc-surface-light">
              {tabs.map(tab => (
                <SortableTabRow key={tab.key} tab={tab} count={counts[tab.key] ?? 0} />
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

      <div className="text-xs text-tastelanc-text-faint bg-tastelanc-surface rounded-lg p-3 leading-relaxed">
        <strong className="text-tastelanc-text-muted">How empty sections work:</strong> Your profile sections are always visible to customers. When a section has no content, nearby restaurants with that content show as suggestions in its place. As soon as you add your own content, it takes over that spot automatically.
      </div>
    </div>
  );
}

export default function CustomizePage() {
  return (
    <TierGate
      requiredTier="premium"
      feature="Profile Customization"
      description="Reorder tabs in your app profile to match how you want to present your restaurant to customers."
    >
      <CustomizeContent />
    </TierGate>
  );
}
