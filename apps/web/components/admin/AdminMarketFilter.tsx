'use client';

import { useRouter } from 'next/navigation';

interface Market {
  id: string;
  name: string;
  slug: string;
}

export default function AdminMarketFilter({
  markets,
  currentMarket,
  basePath,
}: {
  markets: Market[];
  currentMarket: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <select
      value={currentMarket}
      onChange={(e) => {
        const value = e.target.value;
        const url = value === 'all' ? basePath : `${basePath}?market=${value}`;
        router.push(url);
      }}
      className="px-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
    >
      <option value="all">All Markets</option>
      {markets.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
