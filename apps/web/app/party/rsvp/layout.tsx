import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export const metadata: Metadata = {
  title: 'Industry Social RSVP | TasteLanc',
  description: 'You\'re invited to an exclusive industry-only event. RSVP now to secure your spot at Lancaster\'s hottest industry social.',
  openGraph: {
    title: '🎉 You\'re Invited: Industry Social',
    description: 'Exclusive industry-only event. Free drinks, food, and networking with Lancaster\'s best. RSVP to secure your spot.',
    url: `${siteUrl}/party/rsvp`,
    siteName: 'TasteLanc',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '🎉 You\'re Invited: Industry Social',
    description: 'Exclusive industry-only event. Free drinks, food, and networking with Lancaster\'s best. RSVP now.',
  },
};

export default function PartyRSVPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
