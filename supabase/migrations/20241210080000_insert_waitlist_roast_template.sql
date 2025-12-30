-- Seed waitlist roast template
INSERT INTO email_templates (
  name,
  category,
  subject,
  preview_text,
  headline,
  body,
  cta_text,
  cta_url,
  is_ai_generated
)
VALUES (
  'Roast TasteLanc testers',
  'consumer',
  'Roast TasteLanc — tell us what you notice',
  'Click to let us know your device and we will send a test build',
  'Roast TasteLanc and help us ship it right',
  $$Hi there,

We have a shiny build ready and need waitlist members to roast it. Explore the app, poke around a bunch, and tell us what feels great and what trips you up. When you click the button that matches your phone, we will take that as your opt-in and follow up with the right instructions—no reply required.

Thanks for being brave, honest, and early.
$$,
  'Roast us',
  'https://tastelanc.com',
  false
);
