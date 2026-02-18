import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchBlogPostsByTag } from '@/lib/seo/data';
import { buildMeta } from '@/lib/seo/meta';
import { Clock, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;
const authorName = BRAND.aiName;
export const revalidate = 900;

// Map URL slugs to display names and search tags
const TAG_MAP: Record<string, { display: string; searchTags: string[] }> = {
  'hidden-gems': { display: 'Hidden Gems', searchTags: ['hidden gems', 'hidden-gems', 'underrated', 'secret', 'overlooked', 'local favorites'] },
  'date-night': { display: 'Date Night', searchTags: ['date night', 'date-night', 'romantic', 'romantic spots', 'anniversary', 'couples'] },
  'family': { display: 'Family', searchTags: ['family', 'family-friendly', 'kids', 'kid-friendly', 'family dining', 'Family Dining', 'Kid-Friendly', 'children'] },
  'happy-hours': { display: 'Happy Hours', searchTags: ['happy hour', 'happy-hour', 'happy hours', 'deals', 'specials'] },
  'nightlife': { display: 'Nightlife', searchTags: ['nightlife', `${BRAND.countyShort} nightlife`, 'bars', 'clubs', 'dancing', 'dance clubs', 'cocktails'] },
  'events': { display: 'Events', searchTags: ['events', 'trivia', 'trivia night', 'Friday night', 'entertainment', 'festival', 'wine tasting', 'comedy'] },
  'live-music': { display: 'Live Music', searchTags: ['live music', 'live-music', 'jazz', 'acoustic', 'open mic', 'concert', 'band'] },
  'brunch': { display: 'Brunch', searchTags: ['brunch', 'weekend brunch', 'sunday brunch', 'breakfast'] },
  'late-night': { display: 'Late Night', searchTags: ['late night', 'late-night', 'after hours', 'midnight', 'night owl'] },
  'budget-eats': { display: 'Budget Eats', searchTags: ['budget', 'budget-eats', 'cheap eats', 'value', 'affordable'] },
  'best-of': { display: 'Best Of', searchTags: ['best of', 'best-of', 'top', 'ranking', 'winners', 'best'] },
};

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tag } = await params;
  const tagInfo = TAG_MAP[tag];

  if (!tagInfo) {
    return buildMeta({
      title: `Tag Not Found | ${BRAND.name} Blog`,
      description: 'This tag does not exist.',
      url: `${siteUrl}/blog/tag/${tag}`,
    });
  }

  return buildMeta({
    title: `${tagInfo.display} | ${BRAND.name} Blog`,
    description: `${BRAND.countyShort} ${tagInfo.display.toLowerCase()} - ${authorName}'s picks and honest reviews. No fluff, just what's actually good.`,
    url: `${siteUrl}/blog/tag/${tag}`,
  });
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;
  const tagInfo = TAG_MAP[tag];

  if (!tagInfo) {
    notFound();
  }

  // Fetch posts for all possible tag variations
  const allPosts = await Promise.all(
    tagInfo.searchTags.map(t => fetchBlogPostsByTag(t))
  );

  // Flatten and dedupe by ID
  const seenIds = new Set<string>();
  const posts = allPosts.flat().filter(post => {
    if (seenIds.has(post.id)) return false;
    seenIds.add(post.id);
    return post.cover_image_url; // Only show posts with images
  });

  return (
    <>
      {/* Page Header */}
      <section className="border-b border-gray-800 py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all posts
          </Link>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
            {BRAND.aiAvatarImage ? (
              <Image
                src={BRAND.aiAvatarImage}
                alt={BRAND.aiName}
                width={80}
                height={80}
                className="rounded-full border-2 border-amber-500/50 shadow-lg shadow-amber-500/10"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-tastelanc-accent/20 border-2 border-tastelanc-accent/50 shadow-lg shadow-tastelanc-accent/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-tastelanc-accent" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {tagInfo.display}
              </h1>
              <p className="text-gray-400 text-base md:text-lg">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'} from {BRAND.aiName}
              </p>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 border-t border-gray-800 pt-8 mt-8">
            <Link href="/blog" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">All</Link>
            <Link href="/blog/tag/hidden-gems" className={tag === 'hidden-gems' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Hidden Gems</Link>
            <Link href="/blog/tag/date-night" className={tag === 'date-night' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Date Night</Link>
            <Link href="/blog/tag/family" className={tag === 'family' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Family</Link>
            <Link href="/blog/tag/happy-hours" className={tag === 'happy-hours' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Happy Hours</Link>
            <Link href="/blog/tag/brunch" className={tag === 'brunch' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Brunch</Link>
            <Link href="/blog/tag/nightlife" className={tag === 'nightlife' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Nightlife</Link>
            <Link href="/blog/tag/events" className={tag === 'events' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Events</Link>
            <Link href="/blog/tag/live-music" className={tag === 'live-music' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Live Music</Link>
            <Link href="/blog/tag/late-night" className={tag === 'late-night' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Late Night</Link>
            <Link href="/blog/tag/budget-eats" className={tag === 'budget-eats' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Budget Eats</Link>
            <Link href="/blog/tag/best-of" className={tag === 'best-of' ? 'bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium' : 'bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors'}>Best Of</Link>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-tastelanc-surface mx-auto mb-4 flex items-center justify-center">
              {BRAND.aiAvatarImage ? (
                <Image
                  src={BRAND.aiAvatarImage}
                  alt={BRAND.aiName}
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              ) : (
                <Sparkles className="w-8 h-8 text-tastelanc-accent" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Posts Yet</h2>
            <p className="text-gray-400 mb-6">
              {authorName} hasn&apos;t written about {tagInfo.display.toLowerCase()} yet. Check back soon!
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all posts
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <article className="relative h-[350px] md:h-[400px] overflow-hidden rounded-lg group-hover:shadow-xl group-hover:shadow-amber-500/10 transition-all duration-500">
                  {/* Full bleed background image */}
                  <Image
                    src={post.cover_image_url!}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent group-hover:via-black/60 transition-all duration-500" />
                  {/* Gold accent line on hover */}
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-500 group-hover:w-full transition-all duration-500" />

                  {/* Text overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-amber-500/15 backdrop-blur-sm text-amber-400/80 text-xs font-medium uppercase tracking-wide"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors duration-300 line-clamp-2">
                      {post.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2 group-hover:text-gray-200 transition-colors">
                      {post.summary}
                    </p>

                    {/* Author & Meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{authorName}</span>
                        <span>•</span>
                        <span>{formatDate(post.created_at)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {estimateReadTime(post.body_html || '')} min
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-500/50 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
