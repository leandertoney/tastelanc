import { BRAND } from '@/config/market';

export interface SenderIdentity {
  name: string;
  email: string;
  replyEmail: string; // @in.tastelanc.com address for Reply-To routing
  title: string;
}

/**
 * Available sender identities for sales rep outreach emails.
 * All addresses must be on the verified Resend domain.
 *
 * `email` = used in the From line (brand identity)
 * `replyEmail` = used in the Reply-To header (routes to Resend inbound)
 */
export const SENDER_IDENTITIES: SenderIdentity[] = [
  {
    name: 'Leander',
    email: `leander@${BRAND.domain}`,
    replyEmail: `leander@${BRAND.replyDomain}`,
    title: 'Founder',
  },
  {
    name: 'Jordan',
    email: `jordan@${BRAND.domain}`,
    replyEmail: `jordan@${BRAND.replyDomain}`,
    title: 'Co-Founder',
  },
  {
    name: 'Mason',
    email: `mason@${BRAND.domain}`,
    replyEmail: `mason@${BRAND.replyDomain}`,
    title: 'Business Development',
  },
  {
    name: 'Jamie',
    email: `jamie@${BRAND.domain}`,
    replyEmail: `jamie@${BRAND.replyDomain}`,
    title: 'Partnership Manager',
  },
  {
    name: `${BRAND.name} Team`,
    email: `team@${BRAND.domain}`,
    replyEmail: `team@${BRAND.replyDomain}`,
    title: '',
  },
];

/** Get all sender emails including reply domain variants (for inbox queries) */
export function getAllSenderEmails(): string[] {
  const emails: string[] = [];
  for (const s of SENDER_IDENTITIES) {
    emails.push(s.email);
    if (s.replyEmail !== s.email) emails.push(s.replyEmail);
  }
  return emails;
}

/** Get a sender identity by email (matches both email and replyEmail) */
export function getSenderByEmail(email: string): SenderIdentity | undefined {
  return SENDER_IDENTITIES.find((s) => s.email === email || s.replyEmail === email);
}

/** Get the default (most professional) sender identity */
export function getDefaultSender(): SenderIdentity {
  return SENDER_IDENTITIES[0];
}
