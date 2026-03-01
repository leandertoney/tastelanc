import OpenAI from 'openai';
import { BRAND } from '@/config/market';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Types for email generation
export type EmailObjective =
  | 'launch_countdown'
  | 'waitlist_reminder'
  | 'feature_announcement'
  | 'partnership_announcement'
  | 'welcome'
  | 'follow_up'
  | 'b2b_cold_outreach'
  | 'b2b_follow_up'
  | 'general';

export type EmailTone = 'professional' | 'friendly' | 'urgent' | 'casual' | 'excited';

export type AudienceType = 'consumer' | 'b2b';

export interface EmailGenerationContext {
  objective: EmailObjective;
  audienceType: AudienceType;
  tone: EmailTone;
  keyPoints?: string[];
  businessContext?: {
    launchDate?: string;
    discountDeadline?: string;
    discountDetails?: string;
    partnerName?: string;
    featureName?: string;
    featureDescription?: string;
    daysUntilLaunch?: number;
    daysUntilDeadline?: number;
  };
  recipientContext?: {
    businessName?: string;
    contactName?: string;
    city?: string;
  };
}

export interface GeneratedEmail {
  subject: string;
  previewText: string;
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

// System prompts for different objectives
const SYSTEM_PROMPTS: Record<EmailObjective, string> = {
  launch_countdown: `You are an expert email marketer for ${BRAND.name}, a mobile app that helps people discover local restaurants, happy hours, events, and specials in ${BRAND.countyShort}, ${BRAND.state}. You're writing countdown emails to build excitement for the app launch.

Key value propositions:
- Discover happy hours, events, and daily specials
- Get personalized recommendations
- Earn rewards at local restaurants
- AI assistant "${BRAND.aiName}" helps find perfect dining spots
- Support local ${BRAND.countyShort} businesses`,

  waitlist_reminder: `You are an expert email marketer for ${BRAND.name}. You're writing friendly reminder emails to waitlist members about the upcoming launch.

Key value propositions:
- Be among the first to try ${BRAND.name} when we launch
- Early access members get special pricing
- Exclusive features and rewards for waitlist members
- Help shape the future of ${BRAND.countyShort} dining discovery`,

  feature_announcement: `You are an expert email marketer for ${BRAND.name}. You're announcing an exciting new feature to waitlist members.

Key value propositions:
- Innovative features that make dining discovery easier
- AI-powered recommendations
- Real-time updates on specials and events
- Community-driven restaurant insights`,

  partnership_announcement: `You are an expert email marketer for ${BRAND.name}. You're announcing a new restaurant partnership to get users excited.

Key value propositions:
- More amazing local restaurants joining
- Exclusive deals from partners
- Support local ${BRAND.countyShort} businesses
- Growing community of food lovers`,

  welcome: `You are an expert email marketer for ${BRAND.name}. You're writing welcome emails for new waitlist signups. Be warm, friendly, and make them feel special for being early adopters.

Key value propositions:
- They're part of an exclusive early access group
- They'll be first to experience the app
- They're supporting local ${BRAND.countyShort} businesses
- Great perks await them`,

  follow_up: `You are an expert email marketer for ${BRAND.name}. You're writing follow-up emails to keep waitlist members engaged and excited.

Key value propositions:
- Keep them updated on progress
- Build anticipation
- Remind them why they signed up
- Create a sense of community`,

  b2b_cold_outreach: `You are a professional business development representative for ${BRAND.name}. You're writing cold outreach emails to restaurant owners and managers in ${BRAND.countyShort}, ${BRAND.state}.

Key value propositions for restaurants:
- Free marketing to local food lovers
- Increase foot traffic during slow hours
- Promote happy hours and specials effectively
- Join a growing network of local restaurants
- Easy-to-use platform with no upfront costs
- Analytics and insights on customer engagement

Tone should be professional but warm, focusing on how ${BRAND.name} helps THEIR business succeed.`,

  b2b_follow_up: `You are a professional business development representative for ${BRAND.name}. You're writing follow-up emails to restaurants who haven't responded to your initial outreach.

Be respectful of their time, provide additional value, and make it easy for them to learn more without pressure.`,

  general: `You are an expert email marketer for ${BRAND.name}, a mobile app that helps people discover local restaurants, happy hours, events, and specials in ${BRAND.countyShort}, ${BRAND.state}.

Write engaging, effective marketing emails that drive action while maintaining authenticity.`,
};

// Generate a complete email
export async function generateEmail(context: EmailGenerationContext): Promise<GeneratedEmail> {
  const systemPrompt = SYSTEM_PROMPTS[context.objective];

  let userPrompt = `Generate a marketing email with the following context:

Objective: ${context.objective.replace(/_/g, ' ')}
Audience: ${context.audienceType === 'consumer' ? 'Waitlist members (consumers)' : 'Business owners/restaurant managers'}
Tone: ${context.tone}
${context.keyPoints?.length ? `Key points to include:\n${context.keyPoints.map(p => `- ${p}`).join('\n')}` : ''}
`;

  if (context.businessContext) {
    const bc = context.businessContext;
    userPrompt += `\nBusiness context:`;
    if (bc.launchDate) userPrompt += `\n- Launch date: ${bc.launchDate}`;
    if (bc.daysUntilLaunch !== undefined) userPrompt += `\n- Days until launch: ${bc.daysUntilLaunch}`;
    if (bc.discountDeadline) userPrompt += `\n- Discount deadline: ${bc.discountDeadline}`;
    if (bc.daysUntilDeadline !== undefined) userPrompt += `\n- Days until deadline: ${bc.daysUntilDeadline}`;
    if (bc.discountDetails) userPrompt += `\n- Discount details: ${bc.discountDetails}`;
    if (bc.partnerName) userPrompt += `\n- New partner: ${bc.partnerName}`;
    if (bc.featureName) userPrompt += `\n- Feature name: ${bc.featureName}`;
    if (bc.featureDescription) userPrompt += `\n- Feature description: ${bc.featureDescription}`;
  }

  if (context.recipientContext && context.audienceType === 'b2b') {
    const rc = context.recipientContext;
    userPrompt += `\nRecipient context (for personalization):`;
    if (rc.businessName) userPrompt += `\n- Business name: ${rc.businessName}`;
    if (rc.contactName) userPrompt += `\n- Contact name: ${rc.contactName}`;
    if (rc.city) userPrompt += `\n- City: ${rc.city}`;
  }

  userPrompt += `

Please generate the email in the following JSON format (and nothing else):
{
  "subject": "Subject line (max 60 chars, compelling, creates curiosity)",
  "previewText": "Preview text (max 100 chars, complements subject)",
  "headline": "Main headline in email (max 80 chars, attention-grabbing)",
  "body": "Email body content. Use \\n\\n for paragraph breaks. Keep it concise but persuasive. 2-4 paragraphs max.",
  "ctaText": "Call-to-action button text (2-4 words, action-oriented)",
  "ctaUrl": "https://${BRAND.domain}"
}

Important:
- Subject should create curiosity without being clickbait
- Body should be scannable with short paragraphs
- End with a clear call-to-action
- Don't use excessive exclamation marks
- Be genuine and authentic, not salesy
- For B2B: Focus on their business benefits, not just features`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const email = JSON.parse(jsonStr) as GeneratedEmail;

    // Set default CTA URL based on audience type if not provided
    if (!email.ctaUrl || email.ctaUrl === `https://${BRAND.domain}`) {
      email.ctaUrl = context.audienceType === 'b2b'
        ? `https://${BRAND.domain}/for-restaurants`
        : `https://${BRAND.domain}`;
    }

    return email;
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse email content from AI response');
  }
}

// Generate multiple subject line variations
export async function generateSubjectLines(
  context: EmailGenerationContext,
  count: number = 5
): Promise<string[]> {
  const systemPrompt = SYSTEM_PROMPTS[context.objective];

  let userPrompt = `Generate ${count} different email subject line variations for a ${context.objective.replace(/_/g, ' ')} email.

Audience: ${context.audienceType === 'consumer' ? 'Waitlist members' : 'Business owners'}
Tone: ${context.tone}
${context.keyPoints?.length ? `Key themes: ${context.keyPoints.join(', ')}` : ''}
${context.businessContext?.daysUntilLaunch !== undefined ? `Days until launch: ${context.businessContext.daysUntilLaunch}` : ''}
${context.businessContext?.daysUntilDeadline !== undefined ? `Days until deadline: ${context.businessContext.daysUntilDeadline}` : ''}

Requirements:
- Max 60 characters each
- Create curiosity without clickbait
- Vary the approaches (question, statement, urgency, benefit, etc.)
- No excessive punctuation

Return ONLY a JSON array of strings, nothing else:
["Subject 1", "Subject 2", "Subject 3", ...]`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 512,
    temperature: 0.8,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    // Extract JSON array from response
    let jsonStr = content;
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    return JSON.parse(jsonStr) as string[];
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse subject lines from AI response');
  }
}

// Improve existing email content
export async function improveEmail(
  currentContent: string,
  instruction: string,
  audienceType: AudienceType = 'consumer'
): Promise<string> {
  const systemPrompt = `You are an expert email copywriter for ${BRAND.name}, a local restaurant discovery app. Help improve email content while maintaining brand voice.

${BRAND.name} brand voice:
- Friendly and approachable
- Excited about local food scene
- Supportive of local businesses
- Authentic, not corporate
- ${BRAND.countyShort}, ${BRAND.state} proud`;

  const userPrompt = `Here is the current email content:

"""
${currentContent}
"""

Please improve this content according to this instruction: ${instruction}

Audience: ${audienceType === 'consumer' ? 'Waitlist members (consumers)' : 'Business owners/restaurant managers'}

Return ONLY the improved content, nothing else. Maintain the same general structure but make the requested improvements.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return content.trim();
}

// Calculate days until a date
export function daysUntil(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Pre-configured generators for common scenarios
export const emailPresets = {
  // Consumer countdown email
  launchCountdown: (daysLeft: number) => generateEmail({
    objective: 'launch_countdown',
    audienceType: 'consumer',
    tone: daysLeft <= 3 ? 'urgent' : 'excited',
    businessContext: {
      launchDate: 'December 13, 2025',
      daysUntilLaunch: daysLeft,
    },
    keyPoints: [
      `Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} until launch`,
      'Be among the first to discover local gems',
      'Early access perks await',
    ],
  }),

  // Waitlist reminder
  waitlistReminder: () => generateEmail({
    objective: 'waitlist_reminder',
    audienceType: 'consumer',
    tone: 'friendly',
    businessContext: {
      discountDetails: 'Early access pricing for waitlist members',
    },
    keyPoints: [
      `Be the first to try ${BRAND.name} when we launch`,
      'Early access members get special pricing',
      'Join the waitlist to unlock exclusive perks',
    ],
  }),

  // B2B cold outreach
  coldOutreach: (businessName?: string, contactName?: string) => generateEmail({
    objective: 'b2b_cold_outreach',
    audienceType: 'b2b',
    tone: 'professional',
    recipientContext: {
      businessName,
      contactName,
      city: BRAND.countyShort,
    },
    keyPoints: [
      'Free marketing to local food lovers',
      'Increase visibility during happy hours',
      `Join growing network of ${BRAND.countyShort} restaurants`,
      'Easy setup, no commitment required',
    ],
  }),

  // Welcome email
  welcome: () => generateEmail({
    objective: 'welcome',
    audienceType: 'consumer',
    tone: 'friendly',
    keyPoints: [
      'Thank them for joining early',
      'What to expect',
      'They\'re supporting local',
    ],
  }),
};
