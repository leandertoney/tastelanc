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
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
