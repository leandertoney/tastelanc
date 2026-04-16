# Cumberland County Email Campaign - Ready to Send

## ✅ Completed Tasks

### 1. CSV Import
- **File**: `Sunchilld1-1000 - Sheet1 (1).csv`
- **Imported**: 534 unique contacts
- **Source Label**: "Partner List"
- **Market**: Cumberland County

### 2. Email Campaign Created
- **Campaign ID**: `22c44e95-0628-48d9-80ad-936853b75c9e`
- **Name**: Cumberland Welcome - April 2026
- **Subject**: Welcome to TasteCumberland!
- **Status**: Draft (ready to send)

### 3. Test Email Sent
- **Recipient**: leandertoney@gmail.com
- **Resend ID**: `22002dca-b959-4cb4-8ccd-b4b2a1f80536`
- **Status**: ✅ Sent successfully

## 📧 Email Content

**Subject**: Welcome to TasteCumberland!

**Preview Text**: Discover the best restaurants, exclusive deals, and events in Cumberland County

**Body**:
```
We're excited to introduce TasteCumberland — your free guide to discovering the best restaurants, events, and nightlife in Cumberland County.

Here's what you'll love about the app:

🍽️ **Discover Local Favorites** — Find hidden gems and popular spots all in one place

💎 **Exclusive App-Only Deals** — Get access to special offers you won't find anywhere else (like $8 off at Caddy Shack, available now!)

🎉 **Upcoming Events** — Never miss trivia nights, live music, and special happenings

⏰ **Happy Hour Alerts** — Find the best deals on drinks and appetizers near you

✨ **Personalized Recommendations** — Get suggestions based on what you love

The best part? We're just getting started. More restaurants are joining every week, bringing you even more exclusive deals and insider access to Cumberland County's dining scene.

Download TasteCumberland today and see what's happening around you!
```

**CTA Button**: "Download TasteCumberland" → https://cumberland.tastelanc.com/download

**Branding**:
- From: TasteCumberland <campaigns@tastelanc.com>
- Logo: TasteCumberland logo
- App Store Links: iOS & Android

## 👥 Audience Details

### Total Contacts in Database
- **All Cumberland contacts**: ~5,245 (including new CSV import)
- **Contacts with app**: TBD (checked at send time)
- **Contacts without app**: ~4,000-5,000 (estimated)
- **Filtered**: Only sending to contacts WITHOUT the app

### Email Filtering
✅ Only Cumberland County market
✅ Not unsubscribed
✅ Don't already have the app installed

## 📝 Next Steps - After You Approve the Test Email

### Check Your Email
1. Open your inbox at **leandertoney@gmail.com**
2. Look for email from **TasteCumberland <campaigns@tastelanc.com>**
3. Subject: **Welcome to TasteCumberland!**
4. This is EXACTLY how recipients will see it

### If Approved - Send to Full Audience

Run this command from the project root:
```bash
cd /Users/leandertoney/tastelanc/apps/web
npx tsx scripts/send-cumberland-campaign-full.ts
```

This will:
- Check all Cumberland contacts
- Filter out anyone who already has the app
- Send to ~4,000-5,000 people
- Send in batches of 100 (per Resend limits)
- Track all sends in the database
- Mark campaign as "sent"

### If Changes Needed

If you want to modify the email:
1. Tell me what changes you need
2. I'll update the campaign in the database
3. I'll send another test email
4. Repeat until approved

## 📊 Monitoring After Send

### Check Send Results
```bash
PGPASSWORD='LTMackin!23' psql "postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -c "
SELECT
  status,
  COUNT(*) as count
FROM platform_email_sends
WHERE campaign_id = '22c44e95-0628-48d9-80ad-936853b75c9e'
GROUP BY status;
"
```

### Resend Dashboard
- Login to Resend: https://resend.com/emails
- View delivery status, opens, clicks
- Check for bounces or spam reports

## 🚨 Important Notes

- ✅ Campaign uses "deals" and "offers" terminology (NOT "coupons")
- ✅ Features Caddy Shack $8 off deal as example
- ✅ Implies more deals coming from other restaurants
- ✅ Only sends to people WITHOUT the app
- ✅ Test email sent - check your inbox!
- ⏸️  Campaign still in "draft" status - safe to send when approved

## 📂 Script Files Created

All scripts are in `/Users/leandertoney/tastelanc/apps/web/scripts/`:

1. `import-sunchild-contacts.ts` - ✅ Already run
2. `create-cumberland-welcome-campaign.ts` - ✅ Already run
3. `send-test-email.ts` - ✅ Already run
4. `send-cumberland-campaign-full.ts` - ⏸️ Ready to run after approval

---

## 🎯 Ready to Send!

Check the test email in your inbox, and when you're ready to send to everyone, just run:

```bash
cd /Users/leandertoney/tastelanc/apps/web && npx tsx scripts/send-cumberland-campaign-full.ts
```
