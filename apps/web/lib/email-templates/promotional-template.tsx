import { renderBaseLayout } from './base-layout';

export interface PromotionalEmailProps {
  headline: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  previewText?: string;
  unsubscribeUrl: string;
}

export function renderPromotionalEmail({
  headline,
  body,
  ctaText,
  ctaUrl,
  previewText,
  unsubscribeUrl,
}: PromotionalEmailProps): string {
  // Convert body newlines to <br> and paragraphs
  const formattedBody = body
    .split('\n\n')
    .map((paragraph) => `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #FFFFFF;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const content = `
    <!-- Headline -->
    <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; line-height: 1.3; color: #FFFFFF;">
      ${headline}
    </h1>

    <!-- Body Content -->
    <div style="margin-bottom: 32px;">
      ${formattedBody}
    </div>

    ${ctaText && ctaUrl ? `
    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding: 8px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaUrl}" style="height:52px;v-text-anchor:middle;width:200px;" arcsize="15%" strokecolor="#E63946" fillcolor="#E63946">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">${ctaText}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a
            href="${ctaUrl}"
            target="_blank"
            style="display: inline-block; background: #E63946 !important; background-color: #E63946 !important; color: #FFFFFF !important; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; border: 2px solid #E63946;"
          >
            <span style="color: #FFFFFF !important;">${ctaText}</span>
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- Signature -->
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1F1F1F;">
      <p style="margin: 0; font-size: 14px; color: #CCCCCC;">
        You're receiving this email because you signed up for TasteLanc early access.
      </p>
    </div>
  `;

  return renderBaseLayout({
    children: content,
    previewText,
    unsubscribeUrl,
  });
}

// Pre-built template content for quick campaigns
export const PRE_BUILT_TEMPLATES = {
  anticipation: {
    name: "We're Almost Ready!",
    subject: "TasteLanc is launching soon - here's what's coming",
    previewText: "Get ready to discover Lancaster like never before",
    headline: "Get Ready to Discover Lancaster Like Never Before",
    body: `We've been working hard behind the scenes, and TasteLanc is almost ready to launch!

As an early access member, you'll be among the first to experience Lancaster's ultimate food and drink discovery platform.

Here's what's coming:
• Discover the best happy hours, specials, and events in Lancaster
• Get personalized recommendations from Rosie, our AI concierge
• Earn rewards just for exploring local spots
• Access exclusive deals only for TasteLanc members

We can't wait to show you what we've built. Stay tuned for launch day!`,
    ctaText: "Learn More",
    ctaUrl: "https://tastelanc.com",
  },
  benefits: {
    name: "Your Exclusive Early Access Perks",
    subject: "Here's what you get as an early supporter",
    previewText: "Thank you for being one of our first supporters",
    headline: "Thank You for Being an Early Supporter",
    body: `As one of our first supporters, you've locked in some incredible perks that won't be available once we officially launch.

Your Early Access Benefits:
• FREE Premium membership for your first month ($4.99 value)
• Founding Member badge on your profile - forever
• Priority access to new features before anyone else
• Exclusive founding member rewards and bonuses

These perks are our way of saying thank you for believing in TasteLanc from the beginning.

When we launch, you'll receive an email with instructions to claim your benefits. Make sure to whitelist our emails so you don't miss it!`,
    ctaText: "See All Benefits",
    ctaUrl: "https://tastelanc.com",
  },
  urgency: {
    name: "Don't Miss Out",
    subject: "Early access ends soon - lock in your spot",
    previewText: "Time is running out to claim your founding member perks",
    headline: "Time is Running Out",
    body: `Our early access period is ending soon, and this is your last chance to lock in your founding member benefits.

Once early access ends:
• No more free Premium month for new signups
• Founding Member badges will no longer be available
• Regular pricing kicks in

You're already signed up, which is great! But if you have friends or family who'd love to discover Lancaster's best food and drink spots, now's the time to let them know.

Share the love and help them lock in their perks before it's too late.`,
    ctaText: "Share with Friends",
    ctaUrl: "https://tastelanc.com",
  },
  feedbackRoast: {
    name: "Beta Feedback - Roast Us",
    subject: "Roast TasteLanc — help us ship a better app",
    previewText: "Tell us your device so we send the right TestFlight or Play link.",
    headline: "Roast Our App and Help Shape Launch",
    body: `We just pushed a fresh build and need candid testers to roast it. Jump in, explore, and tell us what feels great and what needs work.

Here's how to help:
• Try the flows you care about: finding specials, saving favorites, chatting with Rosie.
• Send quick notes on what feels confusing, broken, or surprisingly good (screenshots welcome).
• Reply with your phone type (iPhone or Android) and OS version so we send the right TestFlight or Play Store link.

Thanks for being early and honest—your feedback directly shapes launch week.`,
    ctaText: "I can test it",
    ctaUrl: "https://tastelanc.com/testers",
  },
  iosLaunch: {
    name: "iOS App Launch Announcement",
    subject: "TasteLanc is Live! Download Now for iPhone",
    previewText: "The wait is over - discover Lancaster's best dining & nightlife",
    headline: "TasteLanc is Officially Live!",
    body: `Big news — TasteLanc is now available on the App Store!

After months of building and your amazing support as an early member, we're thrilled to announce that you can download TasteLanc today and start discovering Lancaster's best restaurants, happy hours, and nightlife.

What's waiting for you:
• Real-time happy hours and specials
• Live events across Lancaster
• Rosie, your AI dining assistant
• Rewards for checking in at your favorite spots

As one of our founding members, you've already earned early access perks. Download the app and sign in with the email you used to join the waitlist to unlock them.

Android version coming soon — we'll let you know when it's ready!`,
    ctaText: "Download for iPhone",
    ctaUrl: "https://apps.apple.com/us/app/tastelanc/id6755852717",
  },
} as const;
