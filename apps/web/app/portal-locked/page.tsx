import { getPortalLockState } from '@/lib/portal-lock';
import PortalLocked from '@/components/PortalLocked';

export const dynamic = 'force-dynamic';

export default async function PortalLockedPage() {
  const { message } = await getPortalLockState();
  return <PortalLocked message={message} />;
}
