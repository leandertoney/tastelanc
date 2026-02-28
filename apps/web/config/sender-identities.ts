import { BRAND } from '@/config/market';

export interface SenderIdentity {
  name: string;
  email: string;
  title: string;
}

/**
 * Available sender identities for sales rep outreach emails.
 * All addresses must be on the verified Resend domain.
 * Expandable to DB-driven later.
 */
export const SENDER_IDENTITIES: SenderIdentity[] = [
  {
    name: 'Mason',
    email: `mason@${BRAND.domain}`,
    title: 'Business Development',
  },
  {
    name: 'Jamie',
    email: `jamie@${BRAND.domain}`,
    title: 'Partnership Manager',
  },
  {
    name: `${BRAND.name} Team`,
    email: `team@${BRAND.domain}`,
    title: '',
  },
];

/** Get a sender identity by email */
export function getSenderByEmail(email: string): SenderIdentity | undefined {
  return SENDER_IDENTITIES.find((s) => s.email === email);
}

/** Get the default (most professional) sender identity */
export function getDefaultSender(): SenderIdentity {
  return SENDER_IDENTITIES[0];
}
