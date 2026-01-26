const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const DEFAULT_OG_IMAGE = `${siteUrl}/icons/icon-512.png`;

type BaseMeta = {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
};

export function buildMeta({
  title,
  description,
  url,
  image,
  type = 'website',
}: BaseMeta) {
  const ogImage = image || DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type,
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [ogImage],
    },
  };
}
