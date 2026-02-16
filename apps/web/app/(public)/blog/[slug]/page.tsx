import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchBlogPostBySlug, fetchBlogPosts } from '@/lib/seo/data';
import { buildMeta } from '@/lib/seo/meta';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/structured';
import { ROSIE_AUTHOR_BIO } from '@/lib/rosie/blog-system-prompt';
import { BRAND } from '@/config/market';
import { Clock, ArrowLeft, ArrowRight, Instagram } from 'lucide-react';

// Editorial cover image data structure
interface CoverImageData {
  type: 'single' | 'dual' | 'triple' | 'quad' | 'none';
  images: string[];
  layout: 'full' | 'split-diagonal' | 'split-vertical' | 'grid' | 'collage';
}

// Editorial Cover Component - Magazine-style layouts
function EditorialCover({ coverData, title }: { coverData: CoverImageData | null; title: string }) {
  if (!coverData || coverData.type === 'none' || coverData.images.length === 0) {
    return null;
  }

  // Single image - full bleed with diagonal accent
  if (coverData.type === 'single') {
    return (
      <div className="relative h-[45vh] md:h-[55vh] w-full overflow-hidden">
        <Image
          src={coverData.images[0]}
          alt={title}
          fill
          className="object-cover"
          priority
          referrerPolicy="no-referrer"
        />
        {/* Diagonal accent overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-tastelanc-bg via-transparent to-transparent"
          style={{ clipPath: 'polygon(0 0, 40% 0, 0 60%)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-tastelanc-bg via-tastelanc-bg/40 to-transparent" />
      </div>
    );
  }

  // Dual images - diagonal split
  if (coverData.type === 'dual') {
    return (
      <div className="relative h-[45vh] md:h-[55vh] w-full overflow-hidden">
        {/* Left image - triangle cut */}
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0 0, 65% 0, 35% 100%, 0 100%)' }}
        >
          <Image
            src={coverData.images[0]}
            alt={title}
            fill
            className="object-cover"
            priority
            referrerPolicy="no-referrer"
          />
        </div>
        {/* Right image - triangle cut */}
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(65% 0, 100% 0, 100% 100%, 35% 100%)' }}
        >
          <Image
            src={coverData.images[1]}
            alt={title}
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        {/* Center line accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom right, transparent 49%, var(--brand-gold-hex) 49%, var(--brand-gold-hex) 51%, transparent 51%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-tastelanc-bg via-transparent to-transparent" />
      </div>
    );
  }

  // Triple images - collage with featured image
  if (coverData.type === 'triple') {
    return (
      <div className="relative h-[50vh] md:h-[60vh] w-full overflow-hidden">
        {/* Main image - takes 2/3 width */}
        <div className="absolute left-0 top-0 w-2/3 h-full">
          <Image
            src={coverData.images[0]}
            alt={title}
            fill
            className="object-cover"
            priority
            referrerPolicy="no-referrer"
          />
        </div>
        {/* Right column - 2 stacked images */}
        <div className="absolute right-0 top-0 w-1/3 h-1/2 border-l-4 border-b-2 border-lancaster-gold">
          <Image
            src={coverData.images[1]}
            alt={title}
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute right-0 bottom-0 w-1/3 h-1/2 border-l-4 border-t-2 border-lancaster-gold">
          <Image
            src={coverData.images[2]}
            alt={title}
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-tastelanc-bg via-transparent to-transparent" />
      </div>
    );
  }

  // Quad images - grid with accent lines
  if (coverData.type === 'quad') {
    return (
      <div className="relative h-[50vh] md:h-[60vh] w-full overflow-hidden">
        <div className="grid grid-cols-2 grid-rows-2 h-full gap-1 bg-lancaster-gold">
          {coverData.images.slice(0, 4).map((img, i) => (
            <div key={i} className="relative">
              <Image
                src={img}
                alt={`${title} - ${i + 1}`}
                fill
                className="object-cover"
                priority={i === 0}
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-tastelanc-bg via-transparent to-transparent" />
      </div>
    );
  }

  return null;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (!post) return buildMeta({ title: 'Blog | TasteLanc', description: 'Not found', url: `${siteUrl}/blog/${slug}` });
  return buildMeta({
    title: `${post.title} | TasteLanc Blog`,
    description: post.summary,
    url: `${siteUrl}/blog/${post.slug}`,
    image: post.cover_image_url || undefined,
    type: 'article',
  });
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (!post) notFound();

  const allPosts = await fetchBlogPosts();
  const relatedPosts = allPosts.filter(p => p.slug !== slug).slice(0, 3);

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Blog', url: `${siteUrl}/blog` },
    { name: post.title, url: `${siteUrl}/blog/${post.slug}` },
  ]);
  const article = articleJsonLd(post);
  const readTime = estimateReadTime(post.body_html || '');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      {/* Editorial Hero Cover - uses real restaurant photos */}
      {(() => {
        // Parse cover_image_data if available
        let coverData: CoverImageData | null = null;
        if ((post as unknown as { cover_image_data?: string }).cover_image_data) {
          try {
            coverData = JSON.parse((post as unknown as { cover_image_data: string }).cover_image_data);
          } catch {
            // Fall back to single image if parsing fails
          }
        }

        // If we have editorial cover data, use the new component
        if (coverData && coverData.images.length > 0) {
          return <EditorialCover coverData={coverData} title={post.title} />;
        }

        // Single image cover - REQUIRED (no fallback)
        return (
          <div className="relative h-[45vh] md:h-[55vh] w-full overflow-hidden">
            <Image
              src={post.cover_image_url!}
              alt={post.title}
              fill
              className="object-cover"
              priority
              referrerPolicy="no-referrer"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-tastelanc-bg via-transparent to-transparent"
              style={{ clipPath: 'polygon(0 0, 40% 0, 0 60%)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-tastelanc-bg via-tastelanc-bg/40 to-transparent" />
          </div>
        );
      })()}

      {/* Two-Column Layout like FIG Lancaster */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content Column */}
          <div className="flex-1 max-w-3xl">
            {/* Back Link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>

            {/* Article Header */}
            <header className="mb-10">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                {post.title}
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed mb-6">
                {post.summary}
              </p>

              {/* Author & Meta - Clean like FIG */}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="font-medium text-white">By Rosie</span>
                <span>•</span>
                <span>{formatDate(post.created_at)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {readTime} min read
                </span>
              </div>
            </header>

            {/* Article Body - Clean Magazine Style */}
            <article
              className="prose prose-invert prose-lg max-w-none
                /* Clean typography */
                prose-headings:text-white prose-headings:font-bold

                /* Clean H2 - no borders, just bold */
                prose-h2:text-white prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6

                /* H3 subheaders */
                prose-h3:text-white prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4

                /* Clean paragraph styling */
                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6

                /* Links - gold color only, NO underlines */
                prose-a:text-lancaster-gold prose-a:no-underline prose-a:font-medium
                hover:prose-a:text-yellow-400
                prose-strong:text-white prose-strong:font-semibold

                /* Clean lists */
                prose-ul:text-gray-300 prose-ul:my-6
                prose-li:text-gray-300 prose-li:marker:text-lancaster-gold
                prose-ol:text-gray-300 prose-ol:my-6

                /* Blockquotes */
                prose-blockquote:border-l-4 prose-blockquote:border-lancaster-gold
                prose-blockquote:pl-6 prose-blockquote:my-8
                prose-blockquote:text-gray-300 prose-blockquote:italic

                /* Restaurant links - gold, NO underlines or borders */
                [&_.restaurant-link]:text-lancaster-gold [&_.restaurant-link]:font-semibold
                [&_.restaurant-link]:no-underline [&_.restaurant-link:hover]:text-yellow-400

                /* Restaurant feature images - clean */
                [&_.restaurant-feature]:my-10 [&_.restaurant-feature]:overflow-hidden
                [&_.restaurant-img]:w-full [&_.restaurant-img]:aspect-[16/10] [&_.restaurant-img]:object-cover
                [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-gray-400
                [&_figcaption]:py-3 [&_figcaption]:font-medium

                /* Restaurant grid layout */
                [&_.restaurant-grid]:grid [&_.restaurant-grid]:grid-cols-1 [&_.restaurant-grid]:md:grid-cols-2
                [&_.restaurant-grid]:gap-6 [&_.restaurant-grid]:my-10
                [&_.restaurant-card]:bg-tastelanc-surface [&_.restaurant-card]:overflow-hidden
                [&_.restaurant-card_img]:aspect-[4/3] [&_.restaurant-card_img]:object-cover [&_.restaurant-card_img]:w-full
                [&_.restaurant-card_h4]:px-4 [&_.restaurant-card_h4]:pt-4 [&_.restaurant-card_h4]:pb-1 [&_.restaurant-card_h4]:font-bold [&_.restaurant-card_h4]:text-white
                [&_.restaurant-card_p]:px-4 [&_.restaurant-card_p]:pb-4 [&_.restaurant-card_p]:text-sm [&_.restaurant-card_p]:text-gray-400
              "
              dangerouslySetInnerHTML={{ __html: post.body_html }}
            />

            {/* Author Bio Box */}
            <div className="mt-12 p-6 bg-tastelanc-surface">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-shrink-0">
                  <Image
                    src="/images/rosie_dark_new.png"
                    alt="Rosie"
                    width={80}
                    height={80}
                    className="rounded-full border-4 border-lancaster-gold"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">About Rosie</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {ROSIE_AUTHOR_BIO}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    {BRAND.appStoreUrls.ios && (
                      <a
                        href={BRAND.appStoreUrls.ios}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-lancaster-gold text-sm font-medium hover:gap-2 transition-all"
                      >
                        Get the App
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    )}
                    <a
                      href={BRAND.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-gray-400 hover:text-lancaster-gold text-sm transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      {BRAND.socialHandle}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Sticky CTA like FIG Lancaster */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              {/* Newsletter/App CTA Box */}
              <div className="bg-tastelanc-surface p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-3">
                  Your Guide to {BRAND.countyShort} Dining
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Get real-time happy hours, specials, and personalized recommendations from {BRAND.aiName} delivered to you.
                </p>
                {BRAND.appStoreUrls.ios && (
                  <a
                    href={BRAND.appStoreUrls.ios}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-lancaster-gold text-black text-center font-semibold py-3 hover:bg-yellow-400 transition-colors"
                  >
                    DOWNLOAD FOR iOS
                  </a>
                )}
                {BRAND.appStoreUrls.android && (
                  <a
                    href={BRAND.appStoreUrls.android}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-600 text-white text-center font-semibold py-3 hover:bg-green-700 transition-colors mt-2"
                  >
                    DOWNLOAD FOR ANDROID
                  </a>
                )}
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Topics
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog/tag/${encodeURIComponent(tag)}`}
                        className="px-3 py-1 bg-tastelanc-surface text-gray-300 text-sm hover:bg-lancaster-gold hover:text-black transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Posts in Sidebar */}
              {relatedPosts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                    More from Rosie
                  </h4>
                  <div className="space-y-4">
                    {relatedPosts.slice(0, 3).map((relatedPost) => (
                      <Link
                        key={relatedPost.id}
                        href={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <h5 className="font-medium text-white group-hover:text-lancaster-gold transition-colors line-clamp-2 text-sm">
                          {relatedPost.title}
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(relatedPost.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
