/**
 * Regenerate app icons for Fayetteville with refined prompt
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CITY_ID = 'c2b81571-48f6-45b2-8d8f-7c019c6c405b';

async function generateIcon(prompt: string, fileName: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'hd',
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) return null;

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) return null;

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  await supabase.storage.from('images').upload(fileName, imageBuffer, {
    contentType: 'image/png',
    upsert: true,
  });

  const { data: publicUrl } = supabase.storage.from('images').getPublicUrl(fileName);
  return publicUrl.publicUrl;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: brands } = await supabase
    .from('expansion_brand_drafts')
    .select('*')
    .eq('city_id', CITY_ID)
    .order('variant_number', { ascending: true });

  if (!brands?.length) { console.error('No brands found'); process.exit(1); }

  // Common description of what the existing icons look like
  const seriesDesc = `This icon MUST match an existing series of app icons. Here is what the series looks like:

ICON 1 (TasteLanc): A large map/location pin shape in dark maroon/red color centered on a dark charcoal background (#2A2A2A). Inside the pin, the words "Taste" and "Lanc" are stacked in two lines in white/cream text. A green fork is centered vertically — the tines poke up inside the pin and the handle extends down below the pin, forming the pointed tail of the pin shape. The design is extremely simple and flat with zero decoration, zero patterns, zero extra elements.

ICON 2 (TasteCumberland): Same exact layout but different colors. A large map/location pin shape in dark navy blue centered on a warm cream/beige background (#F4EBDD). Inside the pin, the words "Taste" and "Cumberland" are stacked in two lines in dark green text. A gold/yellow fork is centered — tines inside the pin, handle extending below as the pin tail. Same minimal flat style.`;

  const variants = [
    {
      // V1: Red pin on dark navy (like TasteLanc's dark vibe but with Fayetteville red/blue)
      accent: '#C8102E',
      bg: '#1E3044',
      forkColor: 'gold/yellow',
      textColor: 'white',
    },
    {
      // V2: Blue pin on cream (like TasteCumberland's light vibe but with Fayetteville blue)
      accent: '#1E3044',
      bg: '#F5F5F5',
      forkColor: 'red (#C8102E)',
      textColor: 'white',
    },
    {
      // V3: Red pin on white (clean patriotic feel)
      accent: '#C8102E',
      bg: '#FFFFFF',
      forkColor: 'navy blue (#1E3044)',
      textColor: 'white',
    },
  ];

  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];
    const v = variants[i];

    const prompt = `${seriesDesc}

NOW CREATE ICON 3 (TasteFayetteville) following the EXACT same layout:
- A large map/location pin shape in ${v.accent} color, centered on a solid flat ${v.bg} background
- Inside the pin: the word "Taste" on one line and "Fayetteville" below it, in ${v.textColor} text
- A ${v.forkColor} fork centered vertically — tines inside the upper part of the pin, handle extending below the pin as the pointed tail
- NOTHING ELSE. No leaves, no circles, no extra shapes, no phone mockups, no color swatches, no shadows, no 3D effects
- Flat vector style, clean and minimal, matching the series exactly
- Square 1024x1024 composition`;

    console.log(`Generating V${brand.variant_number}: ${v.accent} pin on ${v.bg}...`);

    const iconUrl = await generateIcon(prompt, `expansion-icons/fayetteville-nc-v${brand.variant_number}.png`);

    if (iconUrl) {
      await supabase
        .from('expansion_brand_drafts')
        .update({ app_icon_url: iconUrl })
        .eq('id', brand.id);
      console.log(`  -> done\n`);
    } else {
      console.log(`  -> FAILED\n`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
