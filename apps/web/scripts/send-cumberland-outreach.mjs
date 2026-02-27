#!/usr/bin/env node

/**
 * TasteCumberland Restaurant Outreach Email Campaign
 *
 * Reads the filtered email list from extract-cumberland-emails.ts output,
 * sends personalized outreach emails via Resend, and tracks everything
 * in Supabase (email_campaigns, email_sends, business_leads).
 *
 * Uses minimal HTML template designed for primary inbox delivery
 * (based on simple-announcement.tsx pattern).
 *
 * Usage:
 *   cd apps/web
 *   node scripts/send-cumberland-outreach.mjs                     # DRY RUN (default)
 *   node scripts/send-cumberland-outreach.mjs --send --limit=5    # Test send to first 5
 *   node scripts/send-cumberland-outreach.mjs --send              # Full send
 *   node scripts/send-cumberland-outreach.mjs --import-leads      # Import to business_leads only
 *   node scripts/send-cumberland-outreach.mjs --preview           # Output HTML to file for browser preview
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { readFileSync, writeFileSync } from 'fs';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// ─────────────────────────────────────────────────────────
// ENV + CLIENTS
// ─────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
  console.error('Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────

const INPUT_FILE = '/tmp/cumberland-outreach/outreach_ready.json';
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 200;

// Sender identity — personal name only (no brand) for Primary inbox
const FROM_EMAIL = 'Leander Toney <noreply@tastelanc.com>';
const REPLY_TO = 'leandertoney@gmail.com';

// ─────────────────────────────────────────────────────────
// EMAIL CONTENT — APPROVED
// ─────────────────────────────────────────────────────────

const CAMPAIGN = {
  name: 'TasteCumberland Restaurant Outreach - Feb 2026',
  subject: (businessName) => `Local Spotlight: ${businessName}`,
  previewText: '', // empty — let first line of body show naturally in inbox
  body: `{business_name} came up as a spot that people in Cumberland County love — so I had to reach out.

I built TasteLanc, a mobile app that's become the go-to way people discover restaurants, happy hours, and events in Lancaster County — locals and visitors alike. I'm now bringing it to Cumberland County as TasteCumberland, and I'm putting together the founding restaurant network.

Open to a quick call this week? I'd love to tell you more. Just reply here — happy to work around your schedule.

P.S. Not relevant? Just let me know and I won't follow up.`,
};

// ─────────────────────────────────────────────────────────
// PLAIN TEXT ONLY — Gmail routes plain text to Primary inbox
// No HTML = no styled divs, no hidden preview, no marketing signals
// ─────────────────────────────────────────────────────────

function renderPlainText({ contactName, body }) {
  const greeting = contactName ? `Hi ${contactName},` : 'Hi there,';

  return `${greeting}

${body}

Best,
Leander Toney
Founder, TasteLanc | TasteCumberland
tastelanc.com`;
}

// ─────────────────────────────────────────────────────────
// PERSONALIZATION
// ─────────────────────────────────────────────────────────

function personalize(text, businessName, contactName) {
  let result = text;
  if (businessName) {
    result = result.replace(/\{business_name\}/g, businessName);
  }
  if (contactName) {
    result = result.replace(/\{contact_name\}/g, contactName);
  }
  return result;
}

// ─────────────────────────────────────────────────────────
// CLI ARGS
// ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isSend = args.includes('--send');
const isImportLeads = args.includes('--import-leads');
const isPreview = args.includes('--preview');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  TASTECUMBERLAND RESTAURANT OUTREACH');
  console.log('══════════════════════════════════════════════════════');

  if (isPreview) {
    console.log('Mode: PREVIEW (output HTML to file)');
  } else if (isImportLeads) {
    console.log('Mode: IMPORT LEADS (write to business_leads table)');
  } else if (isSend) {
    console.log(`Mode: SEND${limit ? ` (limit: ${limit})` : ' (ALL)'}`);
  } else {
    console.log('Mode: DRY RUN (no emails sent)');
  }
  console.log('');

  // ── Load recipient list ──
  let recipients;
  try {
    const raw = readFileSync(INPUT_FILE, 'utf8');
    recipients = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${INPUT_FILE}`);
    console.error('Run extract-cumberland-emails.ts first:');
    console.error('  npx tsx scripts/extract-cumberland-emails.ts');
    process.exit(1);
  }

  console.log(`Loaded ${recipients.length} recipients from ${INPUT_FILE}`);

  // ── Check B2B unsubscribes ──
  const { data: unsubscribes } = await supabase
    .from('b2b_unsubscribes')
    .select('email');

  const unsubscribedEmails = new Set(
    (unsubscribes || []).map(u => u.email.toLowerCase())
  );

  const activeRecipients = recipients.filter(
    r => !unsubscribedEmails.has(r.email.toLowerCase())
  );

  if (unsubscribedEmails.size > 0) {
    console.log(`B2B unsubscribes: ${unsubscribedEmails.size}`);
  }

  // ── Check already-sent emails (from previous runs of this campaign) ──
  const { data: previousSends } = await supabase
    .from('email_sends')
    .select('recipient_email')
    .like('campaign_id', '%') // All campaigns
    .in('recipient_email', activeRecipients.slice(0, 1000).map(r => r.email));

  const alreadySentEmails = new Set(
    (previousSends || []).map(s => s.recipient_email.toLowerCase())
  );

  // For now, don't filter out already-sent — let the user decide
  // const finalRecipients = activeRecipients.filter(r => !alreadySentEmails.has(r.email.toLowerCase()));

  let finalRecipients = activeRecipients;
  if (limit) {
    finalRecipients = finalRecipients.slice(0, limit);
  }

  console.log(`Active recipients (after unsubscribe check): ${activeRecipients.length}`);
  if (limit) {
    console.log(`Limit applied: sending to first ${limit}`);
  }
  console.log(`Final recipient count: ${finalRecipients.length}`);
  console.log('');

  // ══════════════════════════════════════════════════════
  // PREVIEW MODE — output HTML to file
  // ══════════════════════════════════════════════════════

  if (isPreview) {
    const sample = finalRecipients[0] || {
      name: 'Sample Restaurant',
      email: 'sample@example.com',
      contact_name: 'John',
      contact_title: 'owner',
    };

    const personalizedBody = personalize(CAMPAIGN.body, sample.name, sample.contact_name || null);

    const text = renderPlainText({
      contactName: sample.contact_name || null,
      body: personalizedBody,
    });

    const previewPath = '/tmp/cumberland-outreach/email_preview.txt';
    writeFileSync(previewPath, text);
    console.log(`Preview written to: ${previewPath}`);
    console.log('');
    console.log(`Subject: ${CAMPAIGN.subject(sample.name)}`);
    console.log(`From: ${FROM_EMAIL}`);
    console.log(`Reply-To: ${REPLY_TO}`);
    console.log(`To: ${sample.name} <${sample.email}>`);
    console.log('');
    console.log('── EMAIL BODY ──');
    console.log(text);
    return;
  }

  // ══════════════════════════════════════════════════════
  // IMPORT LEADS MODE — upsert into business_leads
  // ══════════════════════════════════════════════════════

  if (isImportLeads) {
    console.log('Importing leads into business_leads table...');

    // Get Cumberland market ID
    const { data: marketData } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', 'cumberland-pa')
      .single();

    const marketId = marketData?.id || null;
    if (marketId) {
      console.log(`Cumberland market ID: ${marketId}`);
    } else {
      console.log('Warning: Cumberland market not found in markets table. Importing without market_id.');
    }

    const leadsToUpsert = activeRecipients.map(r => ({
      business_name: r.name,
      contact_name: r.contact_name || null,
      email: r.email.toLowerCase(),
      phone: r.phone || null,
      website: r.website || null,
      address: r.address || null,
      city: r.city || null,
      state: 'PA',
      category: r.category || null,
      source: 'csv_import',
      status: 'new',
      tags: ['cumberland-outreach-feb-2026'],
    }));

    // Upsert in batches of 50
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < leadsToUpsert.length; i += 50) {
      const batch = leadsToUpsert.slice(i, i + 50);
      const { error } = await supabase
        .from('business_leads')
        .upsert(batch, { onConflict: 'email' });

      if (error) {
        console.error(`  Batch ${Math.floor(i / 50) + 1} error:`, error.message);
        failed += batch.length;
      } else {
        imported += batch.length;
        console.log(`  Imported ${imported}/${leadsToUpsert.length}...`);
      }
    }

    console.log('');
    console.log(`Imported: ${imported}`);
    console.log(`Failed: ${failed}`);
    return;
  }

  // ══════════════════════════════════════════════════════
  // DRY RUN — print what would be sent
  // ══════════════════════════════════════════════════════

  if (!isSend) {
    console.log('── WOULD SEND TO ──');
    for (const r of finalRecipients) {
      const contact = r.contact_name ? ` [${r.contact_name}]` : '';
      const subject = CAMPAIGN.subject(r.name);
      console.log(`  ${r.name} <${r.email}>${contact}`);
      console.log(`    Subject: ${subject}`);
    }
    console.log('');
    console.log(`Total: ${finalRecipients.length} emails`);
    console.log('');
    console.log('Run with --send to actually send:');
    console.log('  node scripts/send-cumberland-outreach.mjs --send');
    console.log('  node scripts/send-cumberland-outreach.mjs --send --limit=5  (test first)');
    return;
  }

  // ══════════════════════════════════════════════════════
  // SEND MODE
  // ══════════════════════════════════════════════════════

  if (finalRecipients.length === 0) {
    console.log('No recipients to send to. Exiting.');
    return;
  }

  // 1. Create campaign record
  console.log('Creating campaign record...');

  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .insert({
      name: CAMPAIGN.name,
      headline: 'TasteCumberland Restaurant Outreach',
      subject: CAMPAIGN.subject('{business_name}'),
      preview_text: CAMPAIGN.previewText || '',
      body: CAMPAIGN.body,
      segment: 'cumberland-outreach',
      status: 'sending',
      total_recipients: finalRecipients.length,
    })
    .select()
    .single();

  if (campaignError) {
    console.error('Failed to create campaign:', campaignError);
    process.exit(1);
  }

  console.log(`Campaign created: ${campaign.id}`);
  console.log('');

  // 2. Send emails in batches
  console.log('Sending emails...');
  console.log('');

  let totalSent = 0;
  let totalFailed = 0;
  const sendRecords = [];

  for (let i = 0; i < finalRecipients.length; i += BATCH_SIZE) {
    const batch = finalRecipients.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(finalRecipients.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} emails)...`);

    const emailsToSend = batch.map(recipient => {
      const personalizedBody = personalize(
        CAMPAIGN.body,
        recipient.name,
        recipient.contact_name || null
      );
      const subject = CAMPAIGN.subject(recipient.name);

      return {
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: recipient.email,
        subject,
        text: renderPlainText({
          contactName: recipient.contact_name || null,
          body: personalizedBody,
        }),
      };
    });

    try {
      const result = await resend.batch.send(emailsToSend);

      const batchData = result.data?.data || result.data;

      if (batchData && Array.isArray(batchData)) {
        batchData.forEach((sendResult, index) => {
          const recipient = batch[index];
          if (sendResult && 'id' in sendResult) {
            totalSent++;
            sendRecords.push({
              campaign_id: campaign.id,
              recipient_email: recipient.email,
              resend_id: sendResult.id,
              status: 'sent',
              error_message: null,
            });
          } else {
            totalFailed++;
            sendRecords.push({
              campaign_id: campaign.id,
              recipient_email: recipient.email,
              resend_id: null,
              status: 'failed',
              error_message: sendResult?.error?.message || 'Unknown error',
            });
          }
        });
        console.log(`  Sent ${batchData.length} emails`);
      } else if (result.error) {
        console.error(`  Batch failed:`, result.error.message);
        batch.forEach(recipient => {
          totalFailed++;
          sendRecords.push({
            campaign_id: campaign.id,
            recipient_email: recipient.email,
            resend_id: null,
            status: 'failed',
            error_message: result.error.message,
          });
        });
      }
    } catch (error) {
      console.error(`  Batch exception:`, error.message);
      batch.forEach(recipient => {
        totalFailed++;
        sendRecords.push({
          campaign_id: campaign.id,
          recipient_email: recipient.email,
          resend_id: null,
          status: 'failed',
          error_message: error.message,
        });
      });
    }

    // Delay between batches
    if (i + BATCH_SIZE < finalRecipients.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // 3. Save send records
  if (sendRecords.length > 0) {
    const { error: sendError } = await supabase
      .from('email_sends')
      .insert(sendRecords);

    if (sendError) {
      console.error('Warning: Failed to save some send records:', sendError.message);
    }
  }

  // 4. Update campaign status
  await supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      total_sent: totalSent,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaign.id);

  // 5. Update business_leads if they exist
  for (const recipient of finalRecipients) {
    await supabase
      .from('business_leads')
      .update({
        status: 'contacted',
        last_contacted_at: new Date().toISOString(),
      })
      .eq('email', recipient.email.toLowerCase());
  }

  // 6. Summary
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  CAMPAIGN COMPLETE');
  console.log('══════════════════════════════════════════════════════');
  console.log(`Total Recipients: ${finalRecipients.length}`);
  console.log(`Successfully Sent: ${totalSent}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Campaign ID: ${campaign.id}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
