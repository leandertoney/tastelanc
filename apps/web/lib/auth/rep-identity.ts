import { SENDER_IDENTITIES, getAllSenderEmails, type SenderIdentity } from '@/config/sender-identities';
import { BRAND } from '@/config/market';
import { createServiceRoleClient } from '@/lib/supabase/server';

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

interface AccessContext {
  userId: string | null;
  isAdmin: boolean;
}

/**
 * Get the single sender identity for a sales rep.
 *
 * Resolution order:
 * 1. preferred_sender_email → match in SENDER_IDENTITIES → return known identity
 * 2. preferred_sender_email → not in SENDER_IDENTITIES → auto-generate with reply domain
 * 3. rep name → match in SENDER_IDENTITIES → return known identity
 * 4. rep name → not in SENDER_IDENTITIES → auto-generate firstname@domain
 *
 * Works identically for every rep, current and future.
 */
export async function getUserIdentity(
  serviceClient: ServiceClient,
  access: AccessContext,
): Promise<SenderIdentity | null> {
  if (!access.userId) return null;

  const { data: rep } = await serviceClient
    .from('sales_reps')
    .select('preferred_sender_email, name')
    .eq('id', access.userId)
    .single();

  // 1. Check preferred sender email
  if (rep?.preferred_sender_email) {
    const found = SENDER_IDENTITIES.find(s => s.email === rep.preferred_sender_email);
    if (found) return found;

    // Auto-generate identity from the preferred email (domain-verified)
    if (rep.preferred_sender_email.endsWith(`@${BRAND.domain}`)) {
      const localPart = rep.preferred_sender_email.replace(`@${BRAND.domain}`, '');
      return {
        name: rep.name?.split(' ')[0] || localPart,
        email: rep.preferred_sender_email,
        replyEmail: `${localPart}@${BRAND.replyDomain}`,
        title: 'Sales Representative',
      };
    }
  }

  // 2. Fall back to rep name
  if (rep?.name) {
    const firstName = rep.name.split(' ')[0].toLowerCase();
    const matched = SENDER_IDENTITIES.find(s => s.name.toLowerCase() === firstName);
    if (matched) return matched;

    // Auto-generate from first name (domain is verified, any address works)
    return {
      name: rep.name.split(' ')[0],
      email: `${firstName}@${BRAND.domain}`,
      replyEmail: `${firstName}@${BRAND.replyDomain}`,
      title: 'Sales Representative',
    };
  }

  return null;
}

/**
 * Get the list of email addresses a rep can see in inbox queries.
 * Admins see all known identities; reps see only their own (both domains).
 */
export async function getRepSenderEmails(
  serviceClient: ServiceClient,
  access: AccessContext,
): Promise<string[]> {
  if (access.isAdmin) {
    return getAllSenderEmails();
  }

  const identity = await getUserIdentity(serviceClient, access);
  if (identity) return [identity.email, identity.replyEmail];

  return [];
}
