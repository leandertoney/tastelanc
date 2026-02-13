-- Market Insights: restaurant_content_scores view
-- Pre-computes content counts per restaurant for efficient competitive analysis

CREATE OR REPLACE VIEW public.restaurant_content_scores AS
SELECT
  r.id AS restaurant_id,
  r.name,
  r.city,
  r.categories,
  r.average_rating,
  r.description,
  r.updated_at AS restaurant_updated_at,
  COALESCE(menu_counts.item_count, 0) AS menu_item_count,
  COALESCE(hh.cnt, 0) AS happy_hour_count,
  COALESCE(sp.cnt, 0) AS active_specials_count,
  COALESCE(ev.cnt, 0) AS upcoming_events_count,
  COALESCE(ph.cnt, 0) AS photo_count,
  GREATEST(
    COALESCE(hh.latest, '1970-01-01'::timestamptz),
    COALESCE(sp.latest, '1970-01-01'::timestamptz),
    COALESCE(ev.latest, '1970-01-01'::timestamptz),
    COALESCE(menu_counts.latest, '1970-01-01'::timestamptz)
  ) AS last_content_update
FROM restaurants r
LEFT JOIN LATERAL (
  SELECT count(*) AS item_count, max(m.updated_at) AS latest
  FROM menu_items mi
  JOIN menu_sections ms ON mi.section_id = ms.id
  JOIN menus m ON ms.menu_id = m.id
  WHERE m.restaurant_id = r.id
) menu_counts ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt, max(created_at) AS latest
  FROM happy_hours WHERE restaurant_id = r.id
) hh ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt, max(updated_at) AS latest
  FROM specials WHERE restaurant_id = r.id
    AND is_active = true
    AND (
      is_recurring = true
      OR end_date IS NULL
      OR end_date >= CURRENT_DATE
    )
) sp ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt, max(updated_at) AS latest
  FROM events WHERE restaurant_id = r.id
    AND is_active = true
    AND (
      is_recurring = true
      OR event_date >= CURRENT_DATE
    )
) ev ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM restaurant_photos WHERE restaurant_id = r.id
) ph ON true
WHERE r.is_active = true;

ALTER VIEW public.restaurant_content_scores OWNER TO postgres;
GRANT SELECT ON public.restaurant_content_scores TO authenticated;
GRANT SELECT ON public.restaurant_content_scores TO service_role;

COMMENT ON VIEW public.restaurant_content_scores IS 'Pre-computed content counts per restaurant for Market Insights feature';
