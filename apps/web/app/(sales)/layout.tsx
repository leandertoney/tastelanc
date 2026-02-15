import type { Metadata } from 'next';
import SalesLayoutClient from '@/components/sales/SalesLayoutClient';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SalesLayoutClient>{children}</SalesLayoutClient>;
}
