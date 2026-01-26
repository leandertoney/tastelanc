import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers at TasteLanc — Join Our Team in Lancaster, PA',
  description:
    'TasteLanc is hiring! Apply for open positions including Restaurant Partnership Manager. Build relationships with Lancaster restaurants and earn commission-based income with a flexible schedule.',
  keywords:
    'TasteLanc careers, TasteLanc jobs, restaurant partnership manager, Lancaster PA jobs, food industry jobs Lancaster, hospitality jobs Lancaster PA, commission sales Lancaster',
  openGraph: {
    title: 'Careers at TasteLanc — Join Our Team',
    description:
      'We\'re hiring a Restaurant Partnership Manager in Lancaster, PA. Commission-based role with flexible schedule and uncapped earnings. Apply now.',
    url: 'https://tastelanc.com/careers',
    siteName: 'TasteLanc',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careers at TasteLanc — Join Our Team',
    description:
      'We\'re hiring a Restaurant Partnership Manager in Lancaster, PA. Commission-based with flexible schedule. Apply now.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tastelanc.com/careers',
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
