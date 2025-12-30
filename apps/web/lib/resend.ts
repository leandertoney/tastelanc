import { Resend } from 'resend';

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_CONFIG = {
  from: 'TasteLanc <noreply@tastelanc.com>',
  replyTo: 'info@tastelanc.com',
  batchSize: 100, // Resend batch limit
} as const;

// Types
export interface EmailRecipient {
  id: string;
  email: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface BatchEmailParams {
  to: string;
  subject: string;
  html: string;
}

// Send single email
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo = EMAIL_CONFIG.replyTo,
}: SendEmailParams) {
  return resend.emails.send({
    from: EMAIL_CONFIG.from,
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

// Send batch emails (for campaigns)
export async function sendBatchEmails(emails: BatchEmailParams[]) {
  // Chunk into batches of 100 (Resend limit)
  const batches: BatchEmailParams[][] = [];
  for (let i = 0; i < emails.length; i += EMAIL_CONFIG.batchSize) {
    batches.push(emails.slice(i, i + EMAIL_CONFIG.batchSize));
  }

  const results = [];
  for (const batch of batches) {
    try {
      const result = await resend.batch.send(
        batch.map((email) => ({
          from: EMAIL_CONFIG.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
        }))
      );
      results.push(result);
    } catch (error) {
      console.error('Batch send error:', error);
      results.push({ error });
    }
  }

  return results;
}

// Get recipients by segment from Supabase
export async function getRecipientsBySegment(
  supabase: any,
  segment: 'all' | 'unconverted' | 'converted'
): Promise<EmailRecipient[]> {
  let query = supabase.from('early_access_signups').select('id, email');

  if (segment === 'unconverted') {
    query = query.is('converted_at', null);
  } else if (segment === 'converted') {
    query = query.not('converted_at', 'is', null);
  }

  const { data: recipients, error } = await query;

  if (error) {
    console.error('Error fetching recipients:', error);
    return [];
  }

  // Filter out unsubscribed emails
  const { data: unsubscribes } = await supabase
    .from('email_unsubscribes')
    .select('email');

  const unsubscribedEmails = new Set(
    (unsubscribes || []).map((u: { email: string }) => u.email.toLowerCase())
  );

  return (recipients || []).filter(
    (r: EmailRecipient) => !unsubscribedEmails.has(r.email.toLowerCase())
  );
}

// Get recipient count by segment
export async function getRecipientCount(
  supabase: any,
  segment: 'all' | 'unconverted' | 'converted'
): Promise<number> {
  const recipients = await getRecipientsBySegment(supabase, segment);
  return recipients.length;
}

// Business lead recipient interface
export interface BusinessLeadRecipient {
  id: string;
  email: string;
  business_name: string;
  contact_name: string | null;
}

// Filter interface for B2B campaigns
export interface BusinessLeadFilter {
  status?: string[];
  category?: string[];
  tags?: string[];
}

// Get business leads by filter for B2B campaigns
export async function getBusinessLeadsByFilter(
  supabase: any,
  filter?: BusinessLeadFilter
): Promise<BusinessLeadRecipient[]> {
  let query = supabase
    .from('business_leads')
    .select('id, email, business_name, contact_name');

  // Apply filters
  if (filter?.status && filter.status.length > 0) {
    query = query.in('status', filter.status);
  }

  if (filter?.category && filter.category.length > 0) {
    query = query.in('category', filter.category);
  }

  // Tags filter uses array overlap
  if (filter?.tags && filter.tags.length > 0) {
    query = query.overlaps('tags', filter.tags);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('Error fetching business leads:', error);
    return [];
  }

  // Filter out B2B unsubscribes
  const { data: unsubscribes } = await supabase
    .from('b2b_unsubscribes')
    .select('email');

  const unsubscribedEmails = new Set(
    (unsubscribes || []).map((u: { email: string }) => u.email.toLowerCase())
  );

  return (leads || []).filter(
    (l: BusinessLeadRecipient) => !unsubscribedEmails.has(l.email.toLowerCase())
  );
}

// Get business lead count by filter
export async function getBusinessLeadCount(
  supabase: any,
  filter?: BusinessLeadFilter
): Promise<number> {
  const leads = await getBusinessLeadsByFilter(supabase, filter);
  return leads.length;
}
