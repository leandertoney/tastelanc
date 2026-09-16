import type { Metadata } from 'next';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';
import { createClient } from '@/lib/supabase/server';
import { getPortalLockState, isPortalLockExempt } from '@/lib/portal-lock';
import PortalLocked from '@/components/PortalLocked';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// The lock flag is read per request, so flipping it in SQL takes effect
// without a redeploy.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isPortalLockExempt(user?.id)) {
    const { isLocked, message } = await getPortalLockState();
    if (isLocked) {
      return <PortalLocked message={message} />;
    }
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
