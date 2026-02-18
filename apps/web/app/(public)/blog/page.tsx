import Image from 'next/image';
import Link from 'next/link';
import { fetchBlogPosts } from '@/lib/seo/data';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { BRAND } from '@/config/market';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;
const authorName = BRAND.aiName;
export const revalidate = 900;

export async function generateMetadata() {
  return buildMeta({
    title: `${BRAND.name} Blog | ${BRAND.countyShort} Food, Specials & Events`,
    description: `${BRAND.countyShort} food and nightlife guides, specials, and ${BRAND.aiName} picks. Your insider guide to eating and drinking in ${BRAND.county}, ${BRAND.state}.`,
    url: `${siteUrl}/blog`,
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

export default async function BlogPage() {
  const allPosts = await fetchBlogPosts();
  // Only show posts with cover images - no exceptions
  const posts = allPosts.filter(p => p.cover_image_url);

  const urls = posts.map((p) => `${siteUrl}/blog/${p.slug}`);
  const jsonLd = itemListJsonLd(urls);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Page Header with AI */}
      <section className="border-b border-gray-800 py-12 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* AI Intro - Clean and Simple */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-4">
              {BRAND.aiAvatarImage ? (
                <Image
                  src={BRAND.aiAvatarImage}
                  alt={BRAND.aiName}
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-amber-500/50 shadow-lg shadow-amber-500/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-tastelanc-accent/20 border-2 border-tastelanc-accent/50 shadow-lg shadow-tastelanc-accent/20 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-tastelanc-accent" />
                </div>
              )}
              <h1 className="text-4xl md:text-6xl font-bold text-white">
                Taste {BRAND.countyShort}
              </h1>
            </div>
            <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto">
              {BRAND.countyShort}&apos;s food scene, unfiltered. No fluff, no paid promos—just {BRAND.aiName}&apos;s honest take on what&apos;s actually good.
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 border-t border-gray-800 pt-8">
            <span className="bg-tastelanc-accent text-white px-4 py-2 rounded-full text-base font-medium">All</span>
            <Link href="/blog/tag/hidden-gems" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Hidden Gems</Link>
            <Link href="/blog/tag/date-night" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Date Night</Link>
            <Link href="/blog/tag/family" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Family</Link>
            <Link href="/blog/tag/happy-hours" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Happy Hours</Link>
            <Link href="/blog/tag/brunch" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Brunch</Link>
            <Link href="/blog/tag/nightlife" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Nightlife</Link>
            <Link href="/blog/tag/events" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Events</Link>
            <Link href="/blog/tag/live-music" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Live Music</Link>
            <Link href="/blog/tag/late-night" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Late Night</Link>
            <Link href="/blog/tag/budget-eats" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Budget Eats</Link>
            <Link href="/blog/tag/best-of" className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-gray-300 hover:text-white px-4 py-2 rounded-full text-base font-medium transition-colors">Best Of</Link>
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
            <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
            <p className="text-gray-400">
              {authorName} is cooking up some content. Check back soon for guides, reviews, and insider tips.
            </p>
          </div>
        ) : (
          <>
            {/* Featured Post - Same overlay style as cards, just bigger */}
            {posts.length > 0 && (
              <Link
                href={`/blog/${posts[0].slug}`}
                className="block mb-10 group"
              >
                <article className="relative h-[450px] md:h-[550px] overflow-hidden rounded-lg group-hover:shadow-2xl group-hover:shadow-amber-500/20 transition-all duration-500">
                  {/* Full bleed background image */}
                  <Image
                    src={posts[0].cover_image_url!}
                    alt={posts[0].title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent group-hover:via-black/60 transition-all duration-500" />
                  {/* Gold accent line on hover */}
                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-amber-500 group-hover:w-full transition-all duration-500" />

                  {/* Text overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                    {/* Tags */}
                    {posts[0].tags && posts[0].tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {posts[0].tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-amber-500/20 backdrop-blur-sm text-amber-400/90 text-xs font-semibold uppercase tracking-wide border border-amber-500/30"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight group-hover:text-amber-400 transition-colors duration-300">
                      {posts[0].title}
                    </h2>

                    {/* Summary */}
                    <p className="text-gray-200 text-base md:text-lg mb-6 line-clamp-2 max-w-3xl">
                      {posts[0].summary}
                    </p>

                    {/* Author & Meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{authorName}</span>
                        <span>•</span>
                        <span>{formatDate(posts[0].created_at)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {estimateReadTime(posts[0].body_html || '')} min
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-amber-500/50 group-hover:text-amber-400 transition-colors hidden md:block" />
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* Rest of Posts Grid - Magazine Style with Overlay */}
            {posts.length > 1 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(1).map((post) => (
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
                            {post.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-amber-500/15 backdrop-blur-sm text-amber-400/80 text-xs font-medium uppercase tracking-wide"
                              >
                                {tag}
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
          </>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-tastelanc-surface to-tastelanc-surface-light p-8 md:p-10 rounded-lg border border-amber-500/10">
          <h2 className="text-2xl font-bold text-white mb-3">
            Get {BRAND.countyShort}&apos;s Best Dining Intel
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join {BRAND.name} for real-time happy hours, specials, and personalized recommendations from {BRAND.aiName}.
          </p>
          {BRAND.appStoreUrls.ios ? (
            <a
              href={BRAND.appStoreUrls.ios}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-500 text-black font-semibold px-6 py-3 hover:bg-amber-400 transition-colors rounded"
            >
              Download the App
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <span className="text-gray-400 font-medium">App Coming Soon</span>
          )}
        </div>
      </main>
    </>
  );
}
