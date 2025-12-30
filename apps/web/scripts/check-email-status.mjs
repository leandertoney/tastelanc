#!/usr/bin/env node

/**
 * Check Email Status Script
 *
 * Checks waitlist subscribers and recent blog posts to help verify email delivery
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('='.repeat(60));
  console.log('EMAIL STATUS CHECK');
  console.log('='.repeat(60));
  console.log();

  // 1. Get waitlist count
  const { data: subscribers, error: subError } = await supabase
    .from('early_access_signups')
    .select('id, email, created_at');

  if (subError) {
    console.error('Error fetching subscribers:', subError.message);
    return;
  }

  // Deduplicate by email
  const uniqueEmails = new Map();
  subscribers.forEach(s => {
    const email = s.email.toLowerCase();
    if (!uniqueEmails.has(email)) {
      uniqueEmails.set(email, s);
    }
  });

  console.log('--- WAITLIST STATUS ---');
  console.log(`Total signups in database: ${subscribers.length}`);
  console.log(`Unique email addresses: ${uniqueEmails.size}`);
  console.log(`Duplicates: ${subscribers.length - uniqueEmails.size}`);
  console.log();

  // 2. Get unsubscribed
  const { data: unsubscribes } = await supabase
    .from('email_unsubscribes')
    .select('email');

  const unsubscribedEmails = new Set(
    (unsubscribes || []).map(u => u.email.toLowerCase())
  );

  console.log(`Unsubscribed: ${unsubscribedEmails.size}`);

  // Calculate eligible recipients
  let eligibleCount = 0;
  uniqueEmails.forEach((_, email) => {
    if (!unsubscribedEmails.has(email)) {
      eligibleCount++;
    }
  });

  console.log(`Eligible for emails: ${eligibleCount}`);
  console.log();

  // 3. Get today's blog posts
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, created_at')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: true });

  console.log('--- TODAY\'S BLOG POSTS ---');
  if (todayPosts && todayPosts.length > 0) {
    console.log(`Posts created today: ${todayPosts.length}`);
    todayPosts.forEach((post, i) => {
      const time = new Date(post.created_at).toLocaleTimeString();
      console.log(`  ${i + 1}. "${post.title}" at ${time}`);
    });
  } else {
    console.log('No posts created today');
  }
  console.log();

  // 4. Get recent posts (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: recentPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, created_at')
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false });

  console.log('--- RECENT POSTS (Last 7 Days) ---');
  if (recentPosts && recentPosts.length > 0) {
    recentPosts.forEach(post => {
      const date = new Date(post.created_at).toLocaleDateString();
      const time = new Date(post.created_at).toLocaleTimeString();
      console.log(`  - "${post.title}"`);
      console.log(`    ${date} ${time}`);
    });
  }
  console.log();

  // Summary
  console.log('--- SUMMARY ---');
  console.log(`If emails were sent for each post today, ${todayPosts?.length || 0} x ${eligibleCount} = ${(todayPosts?.length || 0) * eligibleCount} total emails`);
  console.log();
  console.log('To verify actual delivery, check your Resend dashboard:');
  console.log('  https://resend.com/emails');
  console.log();
  console.log('='.repeat(60));
}

main();
