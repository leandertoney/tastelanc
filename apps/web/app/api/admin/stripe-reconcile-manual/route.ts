import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getStripe, ALL_CONSUMER_PRICE_IDS, SELF_PROMOTER_PRICE_IDS, ELITE_PRICE_IDS } from '@/lib/stripe';
import { Resend } from 'resend';
import {
  findMatchingRestaurant,
  logUnmatchedSubscription,
  markSubscriptionMatched,
  type StripeCustomerInfo,
} from '@/lib/subscription-matching';
import { BRAND } from '@/config/market';
import { sendBrandedWelcomeEmailWithToken, getMarketBrandForRestaurant } from '@/lib/welcome-email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Allow up to 60 seconds for batch processing
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_SENDER_DOMAIN = 'tastelanc.com';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isConsumerPriceId(priceId: string): boolean {
  return ALL_CONSUMER_PRICE_IDS.includes(priceId as typeof ALL_CONSUMER_PRICE_IDS[number]);
}

function isSelfPromoterPriceId(priceId: string): boolean {
  return priceId === SELF_PROMOTER_PRICE_IDS.monthly;
}

function getRestaurantTier(priceId: string): string {
  if ((ELITE_PRICE_IDS as readonly string[]).includes(priceId)) return 'elite';
  return 'premium';
}

/**
 * POST /api/admin/stripe-reconcile-manual
 *
 * Scans paid Stripe invoices from the past N hours and auto-onboards any
 * restaurants that weren't caught by webhooks.
 *
 * Accepts either:
 *   - Admin session cookie (for manual use from dashboard)
 *   - x-cron-secret header (for Netlify scheduled function)
 */
export async function POST(request: Request) {
  // Auth: accept admin session OR cron secret
  const cronSecret = process.env.CRON_SECRET;
  const incomingSecret = request.headers.get('x-cron-secret');
  const isCronCall = cronSecret && incomingSecret === cronSecret;

  if (!isCronCall) {
    // Fall back to admin auth for manual calls
    try {
      const supabase = await createClient();
      await verifyAdminAccess(supabase);
    } catch {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const lookbackHours: number = body.lookbackHours ?? 24;
  const yesterdayUnix = Math.floor((Date.now() - lookbackHours * 60 * 60 * 1000) / 1000);

  const supabaseAdmin = getSupabaseAdmin();
  const stripe = getStripe();

  const stats = {
    invoicesScanned: 0,
    alreadyLinked: 0,
    newlyOnboarded: 0,
    unmatched: 0,
    skipped: 0,
    errors: 0,
  };

  const unmatchedList: Array<{ email: string | null; name: string | null; amount: number; invoiceId: string }> = [];

  try {
    // Paginate all paid invoices in the lookback window
    let startingAfter: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const invoices = await stripe.invoices.list({
        status: 'paid',
        created: { gte: yesterdayUnix },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      hasMore = invoices.has_more;
      if (invoices.data.length > 0) {
        startingAfter = invoices.data[invoices.data.length - 1].id;
      }

      for (const invoice of invoices.data) {
        stats.invoicesScanned++;

        const lineItem = invoice.lines?.data?.[0];
        const pricingRef = lineItem?.pricing?.price_details?.price;
        const priceId = typeof pricingRef === 'string' ? pricingRef : pricingRef?.id;
        if (!priceId || isConsumerPriceId(priceId) || isSelfPromoterPriceId(priceId)) {
          stats.skipped++;
          continue;
        }

        const customerId = invoice.customer as string;
        if (!customerId) {
          stats.skipped++;
          continue;
        }

        const subscriptionData = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscriptionData === 'string'
          ? subscriptionData
          : subscriptionData?.id;

        // Idempotency: skip if already linked by subscription or customer ID
        if (subscriptionId) {
          const { data: linkedBySub } = await supabaseAdmin
            .from('restaurants')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

          if (linkedBySub) {
            stats.alreadyLinked++;
            continue;
          }
        }

        const { data: linkedByCust } = await supabaseAdmin
          .from('restaurants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (linkedByCust) {
          stats.alreadyLinked++;
          continue;
        }

        // Not linked — attempt matching
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if ('deleted' in customer) {
            stats.skipped++;
            continue;
          }

          const tier = getRestaurantTier(priceId);
          const { data: tierData } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', tier)
            .single();

          if (!tierData) {
            stats.skipped++;
            continue;
          }

          const customerInfo: StripeCustomerInfo = {
            customerId,
            email: customer.email ?? null,
            name: customer.name ?? null,
            business_name: customer.business_name ?? null,
            phone: customer.phone ?? null,
            metadata: (customer.metadata || {}) as Record<string, string>,
          };

          const matchResult = await findMatchingRestaurant(
            supabaseAdmin,
            customerInfo,
            subscriptionId
          );

          if (matchResult.matched && matchResult.restaurantId) {
            // Update restaurant tier + Stripe IDs
            await supabaseAdmin
              .from('restaurants')
              .update({
                tier_id: tierData.id,
                stripe_subscription_id: subscriptionId || null,
                stripe_customer_id: customerId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', matchResult.restaurantId);

            if (subscriptionId) {
              await markSubscriptionMatched(supabaseAdmin, subscriptionId, matchResult.restaurantId, 'reconcile_cron');
            }

            // Find or create owner account and send welcome email
            if (customer.email) {
              const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('owner_id, name, cover_image_url')
                .eq('id', matchResult.restaurantId)
                .single();

              let userId: string | null = restaurant?.owner_id || null;

              if (!userId) {
                const { data: existingProfile } = await supabaseAdmin
                  .from('profiles')
                  .select('id')
                  .eq('email', customer.email.toLowerCase())
                  .single();

                if (existingProfile) {
                  userId = existingProfile.id;
                  await supabaseAdmin
                    .from('restaurants')
                    .update({ owner_id: userId })
                    .eq('id', matchResult.restaurantId);
                } else {
                  const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
                    email: customer.email,
                    password: crypto.randomUUID().slice(0, 12),
                    email_confirm: true,
                    user_metadata: {
                      full_name: customer.name || restaurant?.name || 'Restaurant Owner',
                      role: 'restaurant_owner',
                    },
                  });

                  if (newUser?.user) {
                    userId = newUser.user.id;
                    await supabaseAdmin.from('profiles').upsert({
                      id: userId,
                      email: customer.email,
                      display_name: customer.name || restaurant?.name || 'Restaurant Owner',
                      role: 'restaurant_owner',
                    }, { onConflict: 'id' });

                    await supabaseAdmin
                      .from('restaurants')
                      .update({ owner_id: userId })
                      .eq('id', matchResult.restaurantId);
                  }
                }
              }

              // Always send welcome email after account is linked (new or existing user)
              if (userId) {
                try {
                  const marketBrand = await getMarketBrandForRestaurant(supabaseAdmin, matchResult.restaurantId);
                  await sendBrandedWelcomeEmailWithToken(
                    supabaseAdmin,
                    customer.email,
                    customer.name || '',
                    restaurant?.name || '',
                    restaurant?.cover_image_url || undefined,
                    userId,
                    marketBrand
                  );
                } catch (emailErr) {
                  console.error(`[reconcile] Failed to send welcome email to ${customer.email}:`, emailErr);
                }
              }
            }

            stats.newlyOnboarded++;
            console.log(`[reconcile] Onboarded ${matchResult.restaurantName} from invoice ${invoice.id}`);
          } else {
            await logUnmatchedSubscription(
              supabaseAdmin,
              subscriptionId || `invoice_${invoice.id}`,
              customerInfo,
              invoice.amount_paid || 0,
              subscriptionId ? 'year' : 'one_time',
              matchResult.attempts
            );
            stats.unmatched++;
            unmatchedList.push({
              email: customer.email ?? null,
              name: customer.name ?? null,
              amount: invoice.amount_paid || 0,
              invoiceId: invoice.id,
            });
          }
        } catch (innerErr) {
          console.error(`[reconcile] Error processing invoice ${invoice.id}:`, innerErr);
          stats.errors++;
        }
      }
    }

    // Send summary email to admin
    try {
      const unmatchedHtml = unmatchedList.length > 0
        ? `<ul>${unmatchedList.map(u => `<li>${u.email || u.name || 'unknown'} — $${(u.amount / 100).toFixed(2)} — invoice ${u.invoiceId}</li>`).join('')}</ul>`
        : '<p>None</p>';

      await resend.emails.send({
        from: `${BRAND.name} <hello@${EMAIL_SENDER_DOMAIN}>`,
        to: 'admin@tastelanc.com',
        subject: `📊 Daily Stripe Reconcile: ${stats.newlyOnboarded} onboarded, ${stats.unmatched} unmatched`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Daily Stripe Reconciliation Report</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; color: #6b7280;">Invoices scanned:</td><td style="padding: 8px; font-weight: 600;">${stats.invoicesScanned}</td></tr>
              <tr><td style="padding: 8px; color: #6b7280;">Already linked:</td><td style="padding: 8px;">${stats.alreadyLinked}</td></tr>
              <tr><td style="padding: 8px; color: #6b7280;">Newly onboarded:</td><td style="padding: 8px; color: #22c55e; font-weight: 600;">${stats.newlyOnboarded}</td></tr>
              <tr><td style="padding: 8px; color: #6b7280;">Unmatched (needs review):</td><td style="padding: 8px; color: ${stats.unmatched > 0 ? '#dc2626' : '#6b7280'}; font-weight: ${stats.unmatched > 0 ? '600' : 'normal'};">${stats.unmatched}</td></tr>
              <tr><td style="padding: 8px; color: #6b7280;">Skipped (non-restaurant):</td><td style="padding: 8px;">${stats.skipped}</td></tr>
              <tr><td style="padding: 8px; color: #6b7280;">Errors:</td><td style="padding: 8px; color: ${stats.errors > 0 ? '#f59e0b' : '#6b7280'};">${stats.errors}</td></tr>
            </table>
            ${stats.unmatched > 0 ? `
              <h3 style="margin-top: 20px; color: #dc2626;">Unmatched Invoices (manual review needed)</h3>
              ${unmatchedHtml}
              <p><a href="https://${BRAND.domain}/admin/restaurants" style="color: #3b82f6;">Go to Admin → Restaurants</a></p>
            ` : ''}
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Lookback: last ${lookbackHours}h</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[reconcile] Failed to send summary email:', emailErr);
    }

    return NextResponse.json({ success: true, stats });
  } catch (err) {
    console.error('[stripe-reconcile-manual] Fatal error:', err);
    return NextResponse.json({ error: 'Internal server error', stats }, { status: 500 });
  }
}
