-- Per-restaurant display config (tab order + visibility)
-- display_preferences JSONB shape:
--   { tabs: Array<{ key: string; hidden: boolean }> }
--   Array is ORDERED — position = display position in the app
--   NULL = use default app behavior (backward compatible)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS display_preferences JSONB DEFAULT NULL;

-- Per-menu visibility control within the Menu tab
-- When true, this menu will not appear in the restaurant's Menu tab in the app
ALTER TABLE public.menus
  ADD COLUMN IF NOT EXISTS is_hidden_from_tab BOOLEAN DEFAULT false NOT NULL;
