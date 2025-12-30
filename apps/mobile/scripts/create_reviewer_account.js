/**
 * Creates a test account for app store reviewers (Apple/Google)
 *
 * Run: node scripts/create_reviewer_account.js
 *
 * Note: Premium access for reviewers needs to be set directly in Supabase dashboard
 * or via RevenueCat promotional entitlements.
 */

const { createClient } = require('@supabase/supabase-js');

// Use PRODUCTION Supabase for app store submissions
const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ';

// Reviewer account credentials
const REVIEWER_EMAIL = 'reviewer@tastelanc.com';
const REVIEWER_PASSWORD = 'TasteLanc2025!';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createReviewerAccount() {
  console.log('Creating reviewer account...\n');

  // Try to sign up first
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: REVIEWER_EMAIL,
    password: REVIEWER_PASSWORD,
  });

  let userId = signUpData?.user?.id;

  if (signUpError) {
    // If already registered, try sign in
    if (signUpError.message.includes('registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: REVIEWER_EMAIL,
        password: REVIEWER_PASSWORD,
      });

      if (signInError) {
        console.error('Error:', signInError.message);
        return;
      }
      userId = signInData.user?.id;
      console.log('✓ Existing account found\n');
    } else {
      console.error('Error:', signUpError.message);
      return;
    }
  } else {
    console.log('✓ New account created\n');
  }

  console.log(`User ID: ${userId}\n`);

  // Print credentials
  console.log('═══════════════════════════════════════════════════════');
  console.log('  REVIEWER ACCOUNT CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  Email:    ' + REVIEWER_EMAIL);
  console.log('  Password: ' + REVIEWER_PASSWORD);
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('');
  console.log('To grant premium access to this reviewer account:');
  console.log('');
  console.log('OPTION 1 - Via RevenueCat (Recommended):');
  console.log('  1. Go to RevenueCat Dashboard → Customers');
  console.log('  2. Search for user: ' + userId);
  console.log('  3. Grant promotional entitlement for "premium"');
  console.log('');
  console.log('OPTION 2 - Via Supabase Dashboard:');
  console.log('  1. Go to Supabase → tastelanc-prod → Table Editor → profiles');
  console.log('  2. Find row with id = ' + userId);
  console.log('  3. Set premium_active = true (if column exists)');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('COPY THIS FOR GOOGLE PLAY / APP STORE REVIEW:');
  console.log('');
  console.log('-------- App Access Instructions --------');
  console.log('');
  console.log('To test premium features in the TasteLanc app:');
  console.log('');
  console.log('1. Open the TasteLanc app');
  console.log('2. Tap "Sign In" on the Profile tab');
  console.log('3. Enter these credentials:');
  console.log('   Email: ' + REVIEWER_EMAIL);
  console.log('   Password: ' + REVIEWER_PASSWORD);
  console.log('');
  console.log('4. Premium features available to test:');
  console.log('   - Voting for local restaurants (Rewards tab)');
  console.log('   - Exclusive deals section');
  console.log('   - Priority Rosie AI access');
  console.log('');
  console.log('Note: This test account has full premium access.');
  console.log('No payment is required - just log in to access all features.');
  console.log('');
  console.log('-----------------------------------------');
}

createReviewerAccount().catch(console.error);
