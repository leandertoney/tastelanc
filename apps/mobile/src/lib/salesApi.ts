/**
 * Sales CRM API Client
 * Handles all sales-related API calls (inbox, leads, AI email generation)
 */

import { supabase } from './supabase';

const API_BASE = __DEV__
  ? 'http://192.168.1.243:3000/api/mobile/sales'
  : 'https://tastelanc.com/api/mobile/sales';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No active session');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

// ============================================================
// Inbox
// ============================================================

export interface Conversation {
  counterparty_email: string;
  counterparty_name: string | null;
  last_message_at: string;
  last_message_snippet: string | null;
  last_message_subject: string | null;
  last_message_direction: 'sent' | 'received';
  unread_count: number;
  lead_id: string | null;
  lead_business_name: string | null;
  message_count: number;
}

export interface SenderIdentity {
  name: string;
  email: string;
  replyEmail: string;
  title: string;
}

export interface InboxResponse {
  conversations: Conversation[];
  isAdmin: boolean;
  userIdentity: SenderIdentity | null;
}

export async function fetchConversations(params?: {
  search?: string;
  filter?: 'all' | 'unread';
  inbox?: 'crm' | 'info';
}): Promise<InboxResponse> {
  const headers = await getAuthHeaders();
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.filter) searchParams.set('filter', params.filter);
  if (params?.inbox) searchParams.set('inbox', params.inbox);

  const qs = searchParams.toString();
  const response = await fetch(`${API_BASE}/inbox${qs ? `?${qs}` : ''}`, { headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch inbox' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Thread
// ============================================================

export interface ThreadMessage {
  id: string;
  direction: 'sent' | 'received';
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  headline: string | null;
  timestamp: string;
  lead_id: string | null;
  resend_id: string | null;
  is_read: boolean;
  delivery_status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  attachments: Array<{ url?: string; filename: string; size: number; contentType?: string }>;
}

export async function fetchThread(counterpartyEmail: string): Promise<{ messages: ThreadMessage[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE}/inbox/thread?email=${encodeURIComponent(counterpartyEmail)}`,
    { headers }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch thread' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Send Email
// ============================================================

export interface SendEmailParams {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  headline: string;
  emailBody: string;
  ctaText?: string;
  ctaUrl?: string;
  senderName?: string;
  senderEmail?: string;
  cc?: string;
  inReplyToMessageId?: string;
  threadId?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean;
  resendId: string | null;
  linkedLeadId: string | null;
  message: string;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/inbox/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to send email' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Sender Identity
// ============================================================

export async function fetchSenderIdentity(): Promise<{
  identity: SenderIdentity | null;
  isAdmin: boolean;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/inbox/identity`, { headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch identity' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Unread Count
// ============================================================

export async function fetchUnreadCount(): Promise<{ count: number; crmCount: number; infoCount: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/inbox/unread-count`, { headers });

  if (!response.ok) {
    console.warn('[Sales] Unread count fetch failed:', response.status);
    return { count: 0, crmCount: 0, infoCount: 0 };
  }

  return response.json();
}

// ============================================================
// Leads
// ============================================================

export interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  category: string | null;
  notes: string | null;
  tags: string[];
  assigned_to: string | null;
  assigned_to_name: string | null;
  has_unread_replies: boolean;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  activity_types: string[];
}

export interface LeadsResponse {
  leads: Lead[];
  stats: {
    total: number;
    new: number;
    contacted: number;
    interested: number;
    notInterested: number;
    converted: number;
  };
  currentUserId: string;
  isAdmin: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchLeads(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<LeadsResponse> {
  const headers = await getAuthHeaders();
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page != null && params.page > 0) searchParams.set('page', params.page.toString());
  if (params?.limit != null) searchParams.set('limit', params.limit.toString());

  const qs = searchParams.toString();
  const response = await fetch(`${API_BASE}/leads${qs ? `?${qs}` : ''}`, { headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch leads' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Lead Detail
// ============================================================

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LeadDetailResponse {
  lead: Lead & {
    restaurants?: { id: string; name: string; is_active: boolean } | null;
  };
  activities: LeadActivity[];
  ownership: {
    isOwner: boolean;
    isLocked: boolean;
    isNudge: boolean;
    isStale: boolean;
    daysSinceUpdate: number;
    currentUserId: string;
    isAdmin: boolean;
  };
}

export async function fetchLeadDetail(leadId: string): Promise<LeadDetailResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/leads/${leadId}`, { headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch lead' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function updateLead(leadId: string, data: Record<string, unknown>): Promise<{ lead: Lead }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/leads/${leadId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to update lead' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// AI Email Generation
// ============================================================

export interface GenerateEmailParams {
  action: 'generate' | 'subjects' | 'improve';
  recipientName?: string;
  recipientEmail?: string;
  businessName?: string;
  objective?: string;
  tone?: string;
  existingContent?: string;
  instruction?: string;
}

export async function generateAiEmail(params: GenerateEmailParams): Promise<{
  subject?: string;
  headline?: string;
  body?: string;
  ctaText?: string;
  subjects?: string[];
  improved?: string;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/ai/generate-email`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'AI generation failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
