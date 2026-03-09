-- Add Coffee Shop tier ($49/month, month-to-month)
-- Features: logo and menu display, no analytics or push notifications
INSERT INTO public.tiers (name, display_name, price_monthly, price_yearly, has_logo, has_menu, has_analytics, has_push_notifications, has_preferred_placement)
VALUES ('coffee_shop', 'Coffee Shop', 49.00, 0, true, true, false, false, false)
ON CONFLICT (name) DO NOTHING;
