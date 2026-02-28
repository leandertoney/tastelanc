import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui';
import ApplicationForm from '@/components/careers/ApplicationForm';
import { JobListingCard } from './JobListingCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface ExpansionCity {
  id: string;
  city_name: string;
  county: string;
  state: string;
  slug: string;
}

interface BrandDraft {
  app_name: string;
  tagline: string;
  ai_assistant_name: string;
  avatar_image_url: string | null;
  colors: {
    accent?: string;
    accentHover?: string;
    [key: string]: string | undefined;
  } | null;
}

interface JobListing {
  id: string;
  title: string;
  role_type: string;
  description: string;
  requirements: string[] | null;
  compensation_summary: string | null;
  location: string | null;
  is_remote: boolean;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_unit: string | null;
  status: string;
  created_at: string;
  posted_at: string | null;
  valid_through: string | null;
}

// ─────────────────────────────────────────────────────────
// Helper: Build Google for Jobs JSON-LD
// ─────────────────────────────────────────────────────────

function buildJobPostingJsonLd(
  job: JobListing,
  city: ExpansionCity,
  brandName: string,
  slug: string
) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.posted_at || job.created_at,
    employmentType: job.employment_type || 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: brandName,
      sameAs: `https://tastelanc.com/careers/${slug}`,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.city_name,
        addressRegion: city.state,
        addressCountry: 'US',
      },
    },
  };

  if (job.valid_through) {
    jsonLd.validThrough = job.valid_through;
  }

  if (job.salary_min != null && job.salary_max != null) {
    jsonLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salary_min,
        maxValue: job.salary_max,
        unitText: job.salary_unit || 'MONTH',
      },
    };
  }

  return jsonLd;
}

// ─────────────────────────────────────────────────────────
// Helper: Map role_type to display label
// ─────────────────────────────────────────────────────────

function roleTypeLabel(roleType: string): string {
  const labels: Record<string, string> = {
    sales_rep: 'Sales',
    market_manager: 'Management',
    content_creator: 'Content',
    community_manager: 'Community',
  };
  return labels[roleType] || roleType;
}

function employmentTypeLabel(type: string | null): string {
  if (!type) return 'Contractor';
  const labels: Record<string, string> = {
    CONTRACTOR: 'Contractor',
    FULL_TIME: 'Full-Time',
    PART_TIME: 'Part-Time',
    INTERN: 'Intern',
    TEMPORARY: 'Temporary',
  };
  return labels[type] || type;
}

// ─────────────────────────────────────────────────────────
// Page Component (Server Component)
// ─────────────────────────────────────────────────────────

export default async function MarketCareersPage({
  params,
}: {
  params: Promise<{ 'market-slug': string }>;
}) {
  const { 'market-slug': slug } = await params;
  const serviceClient = createServiceRoleClient();

  // 1. Fetch the expansion city
  const { data: city, error: cityError } = await serviceClient
    .from('expansion_cities')
    .select('id, city_name, county, state, slug')
    .eq('slug', slug)
    .in('status', ['brand_ready', 'approved', 'setup_in_progress', 'live'])
    .single();

  if (cityError || !city) {
    notFound();
  }

  // 2. Fetch selected brand
  const { data: brand } = await serviceClient
    .from('expansion_brand_drafts')
    .select('app_name, tagline, ai_assistant_name, avatar_image_url, colors')
    .eq('city_id', city.id)
    .eq('is_selected', true)
    .single();

  // 3. Fetch posted/approved job listings
  const { data: jobs } = await serviceClient
    .from('expansion_job_listings')
    .select('*')
    .eq('city_id', city.id)
    .in('status', ['approved', 'posted'])
    .order('created_at', { ascending: false });

  if (!jobs || jobs.length === 0) {
    notFound();
  }

  const brandName = brand?.app_name || `Taste${city.city_name}`;
  const brandTagline = brand?.tagline || `Discover ${city.city_name}'s Best Dining & Nightlife`;
  const avatarUrl = brand?.avatar_image_url || null;
  const accentColor = brand?.colors?.accent || undefined;

  // Unique position titles for the application form dropdown
  const positionTitles = Array.from(new Set(jobs.map((j: JobListing) => j.title)));

  return (
    <>
      {/* Google for Jobs JSON-LD structured data */}
      {jobs.map((job: JobListing) => (
        <script
          key={job.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildJobPostingJsonLd(job, city, brandName, slug)),
          }}
        />
      ))}

      <div className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* ───────────── Header ───────────── */}
          <div className="text-center mb-12">
            <Badge variant="accent" className="mb-4">
              We&apos;re Hiring
            </Badge>

            {/* Brand avatar + name */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {avatarUrl && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-tastelanc-surface-light flex-shrink-0">
                  <Image
                    src={avatarUrl}
                    alt={`${brandName} mascot`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                <span
                  style={accentColor ? { color: accentColor } : undefined}
                  className={!accentColor ? 'text-tastelanc-accent' : undefined}
                >
                  {brandName}
                </span>{' '}
                is Hiring in {city.city_name}, {city.state}
              </h1>
            </div>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {brandTagline}. Join our team and help connect local restaurants with the community.
            </p>
          </div>

          {/* ───────────── Job Listings ───────────── */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">
              Open Positions
            </h2>

            <div className="space-y-4">
              {jobs.map((job: JobListing, index: number) => (
                <JobListingCard
                  key={job.id}
                  job={{
                    id: job.id,
                    title: job.title,
                    roleType: roleTypeLabel(job.role_type),
                    description: job.description,
                    requirements: job.requirements,
                    compensationSummary: job.compensation_summary,
                    location: job.location || `${city.city_name}, ${city.state}`,
                    isRemote: job.is_remote,
                    employmentType: employmentTypeLabel(job.employment_type),
                  }}
                  defaultExpanded={index === 0}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </div>

          {/* ───────────── Application Form ───────────── */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Apply Now</h2>
            <p className="text-gray-400">
              Interested in joining the {brandName} team? Fill out the form below and we&apos;ll be in touch.
            </p>
          </div>

          <ApplicationForm
            position={positionTitles[0]}
            positions={positionTitles}
            cityId={city.id}
            marketSlug={slug}
            brandName={brandName}
          />
        </div>
      </div>
    </>
  );
}
