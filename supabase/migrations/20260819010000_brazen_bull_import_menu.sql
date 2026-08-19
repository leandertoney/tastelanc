-- Import The Brazen Bull Pizza Co.'s opening menu.
--
-- Parsed from https://www.brazenbullpizza.com/menu using the same extraction +
-- gpt-4o-mini prompt the dashboard URL importer runs
-- (apps/web/app/api/dashboard/menus/import/url), then written through the same
-- menus -> menu_sections -> menu_items shape the importer's save step uses.
--
-- Note: the site's homepage carries no menu items, only marketing copy. The
-- importer must be pointed at /menu directly.
--
-- Roman style pizza al taglio is not on the menu yet; the site says they are
-- opening with the 12" rounds only. Add the Roman slices when they launch.
DO $$
DECLARE
  brazen_bull_id UUID := 'a0bcf79a-0ee7-438e-a056-d2f51b973d40';
  new_menu_id    UUID;
  round_pies_id  UUID;
  next_order     INT;
BEGIN
  SELECT COALESCE(MAX(display_order), -1) + 1 INTO next_order
    FROM public.menus WHERE restaurant_id = brazen_bull_id;

  INSERT INTO public.menus (restaurant_id, name, description, is_active, display_order)
  VALUES (
    brazen_bull_id, 'Menu',
    'Imported from https://www.brazenbullpizza.com/menu',
    true, next_order
  )
  RETURNING id INTO new_menu_id;

  INSERT INTO public.menu_sections (menu_id, name, description, display_order)
  VALUES (
    new_menu_id, '12" Round Pies',
    'Six slices to a pie. Same starter and cold ferment across all of them.', 0
  )
  RETURNING id INTO round_pies_id;

  INSERT INTO public.menu_items
    (section_id, name, description, price, is_available, is_featured, dietary_flags, display_order)
  VALUES
    (round_pies_id, 'Classic',          'Tomato sauce, mozzarella, parmesan, basil',                                        17, true, false, '{}', 0),
    (round_pies_id, 'She''s Kinda Hot', 'Tomato sauce, mozzarella, Cy_Eats chili oil, pepperoni, hot honey, basil',         19, true, false, '{}', 1),
    (round_pies_id, 'Vodka',            'Spicy vodka sauce, mozzarella, sausage, red onion, basil',                         19, true, false, '{}', 2),
    (round_pies_id, 'Game Day',         'Parm cream, mozzarella, garlic, sweet peppers, sausage, red onion, basil',         19, true, false, '{}', 3),
    (round_pies_id, 'Seeing Red',       'Double tomato sauce, garlic, chili flake, oregano, olive oil, basil',              16, true, false, '{}', 4),
    (round_pies_id, 'Shroom n Gloom',   'Parm cream, mozzarella, roasted mixed mushrooms, garlic, red onion, basil',        18, true, false, '{}', 5),
    (round_pies_id, 'Cheese the Day',   'Mozzarella, whipped ricotta, garlic, olive oil',                                   17, true, false, '{}', 6),
    (round_pies_id, 'The Broccodile',   'Parm cream, mozzarella, garlic, broccoli, bacon, red onion',                       18, true, false, '{}', 7),
    (round_pies_id, 'Corn to Run',      'Mozzarella, parm cream, bacon, local sweet corn, red onion, black pepper, basil',  18, true, false, '{}', 8);
END $$;
