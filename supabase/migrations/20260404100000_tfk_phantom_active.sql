-- Make the TFK phantom restaurant active so its events pass the restaurants!inner join
-- in the events API. The phantom is used for franchise/unlinkable venues (P.J. Whelihan's,
-- Joe's Hideout, etc.) that have no restaurant profile in our DB.
-- is_active=true is safe — the phantom has no photos, hours, or content,
-- and isLinkedVenue() in ThirstyKnowledgeScreen already suppresses the tap chevron for it.

UPDATE public.restaurants
SET is_active = true
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
