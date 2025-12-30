import { renderBaseLayout } from './base-layout';

export interface B2BEmailProps {
  headline: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  previewText?: string;
  unsubscribeUrl: string;
  // Personalization
  businessName?: string;
  contactName?: string;
}

export function renderB2BEmail({
  headline,
  body,
  ctaText,
  ctaUrl,
  previewText,
  unsubscribeUrl,
  businessName,
  contactName,
}: B2BEmailProps): string {
  // Replace placeholders in body
  let personalizedBody = body;
  if (businessName) {
    personalizedBody = personalizedBody.replace(/\{business_name\}/g, businessName);
  }
  if (contactName) {
    personalizedBody = personalizedBody.replace(/\{contact_name\}/g, contactName);
  }

  // Convert body newlines to <br> and paragraphs
  const formattedBody = personalizedBody
    .split('\n\n')
    .map((paragraph) => `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.7; color: #FFFFFF;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const content = `
    <!-- Professional Greeting -->
    ${contactName ? `
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #FFFFFF;">
      Hi ${contactName},
    </p>
    ` : `
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #FFFFFF;">
      Hello,
    </p>
    `}

    <!-- Headline -->
    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; line-height: 1.4; color: #FFFFFF;">
      ${headline}
    </h1>

    <!-- Body Content -->
    <div style="margin-bottom: 32px;">
      ${formattedBody}
    </div>

    ${ctaText && ctaUrl ? `
    <!-- CTA Button - Professional Style -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 8px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="10%" strokecolor="#E63946" fillcolor="#E63946">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${ctaText}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a
            href="${ctaUrl}"
            target="_blank"
            style="display: inline-block; background: #E63946 !important; background-color: #E63946 !important; color: #FFFFFF !important; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; border: 2px solid #E63946;"
          >
            <span style="color: #FFFFFF !important;">${ctaText}</span>
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- Value Proposition Summary -->
    <div style="margin-top: 32px;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #FFFFFF;">
        Why partner with TasteLanc?
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #FFFFFF; font-size: 14px; line-height: 1.6;">
        <li style="margin-bottom: 6px;">Free marketing to local food lovers</li>
        <li style="margin-bottom: 6px;">Increase foot traffic during happy hours</li>
        <li style="margin-bottom: 6px;">Easy-to-use platform with no upfront costs</li>
        <li style="margin-bottom: 0;">Join Lancaster's growing restaurant network</li>
      </ul>
    </div>

    <!-- Professional Signature -->
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1F1F1F;">
      <p style="margin: 0 0 8px 0; font-size: 15px; color: #FFFFFF;">
        Best regards,
      </p>
      <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #FFFFFF;">
        The TasteLanc Team
      </p>
      <p style="margin: 0; font-size: 13px; color: #CCCCCC;">
        Lancaster's Local Food & Drink Discovery Platform
      </p>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #CCCCCC;">
        <a href="https://tastelanc.com/for-restaurants" style="color: #E63946; text-decoration: underline;">tastelanc.com/for-restaurants</a>
      </p>
    </div>

    <!-- Compliance Notice -->
    <div style="margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #CCCCCC;">
        You're receiving this email because we believe ${businessName || 'your establishment'} would be a great fit for TasteLanc.
        If you'd prefer not to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #E63946; text-decoration: underline;">unsubscribe here</a>.
      </p>
    </div>
  `;

  return renderBaseLayout({
    children: content,
    previewText,
    unsubscribeUrl,
  });
}

// Pre-built B2B templates
export const B2B_TEMPLATES = {
  coldOutreach: {
    name: "Cold Outreach - Introduction",
    subject: "Partner with TasteLanc - Free marketing for {business_name}",
    previewText: "Reach more local customers with zero upfront cost",
    headline: "Grow Your Business with TasteLanc",
    body: `I'm reaching out because {business_name} caught our attention as one of Lancaster's great local spots.

TasteLanc is a new app launching this month that helps locals discover restaurants, happy hours, events, and daily specials in Lancaster, PA.

Here's what we offer restaurant partners:

• **Free listing** in our app - no setup fees, no monthly costs
• **Promote your happy hours & specials** to hungry locals
• **Analytics dashboard** to track customer engagement
• **Featured placement** for early partners

We're launching December 13th and building our founding restaurant network now. Early partners get priority placement and founding member perks.

Would you be open to a quick 10-minute call to learn more? I'd love to show you how TasteLanc can help bring more customers through your doors.`,
    ctaText: "Schedule a Call",
    ctaUrl: "https://tastelanc.com/for-restaurants",
  },
  followUp: {
    name: "Follow Up - Second Touch",
    subject: "Quick follow-up: TasteLanc partnership for {business_name}",
    previewText: "Just checking in - free marketing opportunity",
    headline: "Following Up on TasteLanc Partnership",
    body: `I wanted to follow up on my previous email about partnering with TasteLanc.

We're launching in just a few days, and I didn't want {business_name} to miss out on being part of our founding restaurant network.

Quick reminder of what you get:
• Free listing and promotion in our app
• Reach thousands of local food lovers
• No contracts or commitments

Several Lancaster restaurants have already joined, and I'd love to add {business_name} to the list.

Would it help if I sent over more details about how it works? Happy to answer any questions.`,
    ctaText: "Learn More",
    ctaUrl: "https://tastelanc.com/for-restaurants",
  },
  valueProposition: {
    name: "Value Focused - Benefits Heavy",
    subject: "Free marketing for {business_name} - no catch",
    previewText: "Promote your happy hours and specials to thousands of locals",
    headline: "Let's Help Fill Your Seats",
    body: `Running a restaurant is hard. Marketing it shouldn't be.

TasteLanc is launching a free app that helps Lancaster locals discover where to eat, drink, and enjoy happy hours. And we want {business_name} to be part of it.

What's in it for you?

**Free Marketing** - We promote your restaurant to our growing user base at no cost to you.

**Happy Hour Promotion** - Showcase your specials exactly when people are deciding where to go.

**Local Focus** - We're 100% focused on Lancaster. Your customers are our users.

**Easy Management** - Update your specials, hours, and events anytime through a simple dashboard.

No contracts. No fees. Just more customers discovering {business_name}.

Ready to get started?`,
    ctaText: "Join Free",
    ctaUrl: "https://tastelanc.com/for-restaurants",
  },
} as const;
