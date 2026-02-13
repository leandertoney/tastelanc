'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PhotosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/dashboard/profile${params ? `?${params}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-tastelanc-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
