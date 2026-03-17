import { BRAND } from '@/config/market';

export interface SenderIdentity {
  name: string;
  email: string;
  replyEmail: string; // @in.tastelanc.com address for Reply-To routing
  title: string;
  /** Legacy/alias emails that should also route to this identity (inbound + inbox queries) */
  aliases?: string[];
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
    email: `lt@${BRAND.domain}`,
    replyEmail: `lt@${BRAND.replyDomain}`,
    title: 'Founder',
    aliases: [
      `leander@${BRAND.domain}`,
      `leander@${BRAND.replyDomain}`,
    ],
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
    name: 'Kush',
    email: `kush@${BRAND.domain}`,
    replyEmail: `kush@${BRAND.replyDomain}`,
    title: 'Partnership Manager',
  },
  {
    name: `${BRAND.name} Team`,
    email: `team@${BRAND.domain}`,
    replyEmail: `team@${BRAND.replyDomain}`,
    title: '',
  },
];

/**
 * Inbound-only email addresses for the Info@ inbox tab.
 * Emails TO these addresses show up in the separate Info@ inbox view.
 */
export const INFO_INBOX_EMAILS: string[] = [
  `info@${BRAND.domain}`,
  `inbox@${BRAND.replyDomain}`,
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

/** Get all emails for a specific identity including aliases (for personal inbox) */
export function getIdentityEmails(identity: SenderIdentity): string[] {
  const emails = [identity.email];
  if (identity.replyEmail !== identity.email) emails.push(identity.replyEmail);
  if (identity.aliases) emails.push(...identity.aliases);
  return emails;
}

/** Get a sender identity by email (matches email, replyEmail, and aliases) */
export function getSenderByEmail(email: string): SenderIdentity | undefined {
  const lower = email.toLowerCase();
  return SENDER_IDENTITIES.find(
    (s) => s.email.toLowerCase() === lower
      || s.replyEmail.toLowerCase() === lower
      || s.aliases?.some(a => a.toLowerCase() === lower)
  );
}

/** Get the default (most professional) sender identity */
export function getDefaultSender(): SenderIdentity {
  return SENDER_IDENTITIES[0];
}
