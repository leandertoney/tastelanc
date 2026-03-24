# Feature Announcement Email — March 2026
## For: Premium & Elite Restaurant Partners
## Status: DRAFT — Review before sending

---

## SUBJECT LINE OPTIONS (pick one)

1. **You're invited — TasteLanc Industry Night + what's new in your dashboard**
2. **An invite for you + 5 new features in your dashboard**
3. **Industry night invite + coupons, push notifications, email campaigns, and more**

---

## EMAIL BODY

---

Hi [First Name],

We've been heads down building this month. There are several new features in your dashboard — and one invitation we want to make sure reaches you personally.

---

**You're invited: TasteLanc Industry Night — April 20**

We're hosting an industry evening after Restaurant Week wraps up, just for the restaurant owners and partners who are part of TasteLanc. Come meet the team in person, connect with other owners in the area, and see what we've been building.

This is not a public event — spots are limited and reserved for partners. Reply to this email to let us know you're coming and we'll send you the details.

---

**We're coming to you — Content Shoot**

We want to send our social media manager to your location to capture footage and photos we can use to promote your restaurant across our channels. No cost to you — it's part of your Premium or Elite plan.

Reply to this email if you're interested and we'll get something scheduled.

---

**New: Digital Coupons**

Create digital coupons that customers claim and redeem directly inside the app. Set a discount type (% off, $ off, BOGO, free item), an expiration date, and a claim limit. Your dashboard tracks every coupon: total claims, redemptions, conversion rate, and average time to redeem.

Dashboard → Content → Coupons

---

**New: Push Notifications**

Send push notifications directly to customers who've favorited your restaurant in the app. Preview exactly how it will appear on their phone before you send — title, body, and tap destination.

Dashboard → Growth → Marketing → Push Notifications

---

**New: Email Campaigns**

Import your own customer email list and send branded campaigns directly to your audience — specials, events, announcements, whatever you need. You control the content and timing.

Dashboard → Growth → Marketing → Email Campaigns

---

**New: Display Preferences**

Customize how your listing appears in the app — which sections are most prominent and how your content is ordered.

Dashboard → Settings → Customize

---

**New: Help & Support — Ask Rose**

We've added a support assistant called Rose inside your dashboard. Ask her anything about a feature and she'll walk you through it. There's also a direct contact form if you need to reach our team.

Dashboard → Support → Help & Support

---

Questions? Just reply to this email or reach us at info@tastelanc.com.

— The TasteLanc Team

[Log in to your dashboard →](https://dashboard.tastelanc.com)

---

---

## SEND STRATEGY (for review — do not execute without approval)

**Audience:** Premium and Elite restaurant owners only — this email contains tier-specific offers (content shoot) and should not go to Basic/free accounts.

### How to pull the list
- Query `profiles` with `role = 'owner'` + join `subscriptions` where `tier IN ('premium', 'elite')`
- Or filter in Admin → App Users by subscription tier
- Use `sendBatchEmails()` from `apps/web/lib/resend.ts`

### Notes
- No push notification for this send — dashboard news for owners, not consumer app news
- "Reply to this email" is the RSVP and shoot-interest mechanism — confirm replyTo is set to `info@tastelanc.com` (it is, via `EMAIL_CONFIG.replyTo`)
- Unsubscribe link required (CAN-SPAM) — confirm Resend appends it
- Subject line should read like it's from a person, not a marketing blast

---

## REVIEW CHECKLIST
- [ ] Approve/edit subject line
- [ ] Confirm party venue details to include (Hempfield Apothetique, 100 W Walnut St, Lancaster — or keep vague until RSVP reply?)
- [ ] Confirm content shoot offer is ready to fulfill before sending
- [ ] Confirm Rose / support section is live before sending
- [ ] Confirm send list is scoped to Premium + Elite only
- [ ] Confirm unsubscribe handling is active
