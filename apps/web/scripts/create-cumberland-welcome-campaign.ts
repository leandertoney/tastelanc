import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY';
const CUMBERLAND_MARKET_ID = '0602afe2-fae2-4e46-af2c-7b374bfc9d45';
const CADDY_SHACK_COUPON_ID = 'bcaccafb-0975-4134-8e3e-2531a7eb3312';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const emailBody = `We're excited to introduce TasteCumberland — your free guide to discovering the best restaurants, events, and nightlife in Cumberland County.

Here's what you'll love about the app:

🍽️ **Discover Local Favorites** — Find hidden gems and popular spots all in one place

💎 **Exclusive App-Only Deals** — Get access to special offers you won't find anywhere else (like $8 off at Caddy Shack, available now!)

🎉 **Upcoming Events** — Never miss trivia nights, live music, and special happenings

⏰ **Happy Hour Alerts** — Find the best deals on drinks and appetizers near you

✨ **Personalized Recommendations** — Get suggestions based on what you love

The best part? We're just getting started. More restaurants are joining every week, bringing you even more exclusive deals and insider access to Cumberland County's dining scene.

Download TasteCumberland today and see what's happening around you!`;

async function createCampaign() {
  console.log('📧 Creating Cumberland County Welcome Campaign...\n');

  const { data, error } = await supabase
    .from('platform_email_campaigns')
    .insert({
      name: 'Cumberland Welcome - April 2026',
      subject: 'Welcome to TasteCumberland!',
      preview_text: 'Discover the best restaurants, exclusive deals, and events in Cumberland County',
      body: emailBody,
      cta_text: 'Download TasteCumberland',
      cta_url: 'https://cumberland.tastelanc.com/download',
      audience_market_id: CUMBERLAND_MARKET_ID,
      status: 'draft'
    })
    .select('id, name, subject')
    .single();

  if (error) {
    console.error('❌ Error creating campaign:', error.message);
    process.exit(1);
  }

  console.log('✅ Campaign created successfully!');
  console.log(`   ID: ${data.id}`);
  console.log(`   Name: ${data.name}`);
  console.log(`   Subject: ${data.subject}`);
  console.log(`\n📝 Email Body Preview:`);
  console.log('─'.repeat(60));
  console.log(emailBody);
  console.log('─'.repeat(60));
  console.log(`\n🔗 CTA: "Download TasteCumberland" → https://cumberland.tastelanc.com/download`);
  console.log('\n✅ Ready to send test email!');
}

createCampaign().catch(console.error);
