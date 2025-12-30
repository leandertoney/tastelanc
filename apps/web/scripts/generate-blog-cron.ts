/**
 * Daily cron script to generate 1–3 Lancaster-focused articles.
 * Drafts should be passed through the verification agent before publish.
 */
import { verifyAndPublish } from './verify-and-publish-blog';

const sampleTopics = [
  'Best Brunch Spots in Lancaster (Updated Monthly)',
  'Live Music in Lancaster This Weekend',
  'Happy Hours You Can’t Miss Today',
  'Rosie’s Top Picks Tonight',
  'Where to Eat Near F&M College',
  'Best Date Night Restaurants in Lancaster',
];

function draftFromTopic(topic: string) {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return {
    slug,
    title: topic,
    summary: `Rosie’s take on ${topic.toLowerCase()}.`,
    body_html: `<p>Rosie highlights real Lancaster spots for ${topic.toLowerCase()}.</p>`,
    tags: ['lancaster', 'tastelanc', 'rosie'],
    cover_image_url: null,
  };
}

async function main() {
  const count = Math.floor(Math.random() * 3) + 1;
  const picks = sampleTopics.sort(() => 0.5 - Math.random()).slice(0, count);
  for (const topic of picks) {
    const draft = draftFromTopic(topic);
    await verifyAndPublish(draft);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
