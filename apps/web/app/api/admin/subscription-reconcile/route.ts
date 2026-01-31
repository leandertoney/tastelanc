import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getStripe, ALL_CONSUMER_PRICE_IDS, SELF_PROMOTER_PRICE_IDS } from '@/lib/stripe';
import { Resend } from 'resend';
import {
  findMatchingRestaurant,
  logUnmatchedSubscription,
  markSubscriptionMatched,
  type StripeCustomerInfo,
} from '@/lib/subscription-matching';

const resend = new Resend(process.env.RESEND_API_KEY);

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isConsumerSubscription(priceId: string): boolean {
  return ALL_CONSUMER_PRICE_IDS.includes(priceId as typeof ALL_CONSUMER_PRICE_IDS[number]);
}

function isSelfPromoterSubscription(priceId: string): boolean {
  return priceId === SELF_PROMOTER_PRICE_IDS.monthly;
}

/**
 * POST /api/admin/subscription-reconcile
 *
 * Reconciles Stripe subscriptions with database records.
 * - Finds all active Stripe subscriptions
 * - Checks which ones are linked to restaurants
 * - Attempts to auto-match unlinked ones
 * - Logs unmatched ones for admin review
 */
export async function POST(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== 'admin@tastelanc.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const stripe = getStripe();

    const results = {
      totalSubscriptions: 0,
      alreadyLinked: 0,
      newlyMatched: [] as { subscriptionId: string; restaurantName: string; method: string; confidence: number }[],
      unmatched: [] as { subscriptionId: string; customerEmail: string | null; customerName: string | null; amount: number }[],
      consumers: 0,
      selfPromoters: 0,
      errors: [] as string[],
    };

    // Get all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.customer'],
    });

    results.totalSubscriptions = subscriptions.data.length;

    // Get all restaurants with their stripe_subscription_id
    const { data: linkedRestaurants } = await supabaseAdmin
      .from('restaurants')
      .select('stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null);

    const linkedSubIds = new Set(linkedRestaurants?.map(r => r.stripe_subscription_id) || []);

    for (const sub of subscriptions.data) {
      try {
        const customer = sub.customer;
        if (typeof customer !== 'object' || customer.deleted) continue;

        const priceId = sub.items.data[0]?.price.id;
        const amountCents = sub.items.data[0]?.price.unit_amount || 0;
        const billingInterval = sub.items.data[0]?.price.recurring?.interval || 'month';

        // Skip consumer subscriptions
        if (isConsumerSubscription(priceId)) {
          results.consumers++;
          continue;
        }

        // Skip self-promoter subscriptions
        if (isSelfPromoterSubscription(priceId)) {
          results.selfPromoters++;
          continue;
        }

        // Check if already linked
        if (linkedSubIds.has(sub.id)) {
          results.alreadyLinked++;
          continue;
        }

        // Not linked - try to match
        const customerInfo: StripeCustomerInfo = {
          customerId: customer.id,
          email: customer.email ?? null,
          name: customer.name ?? null,
          phone: customer.phone ?? null,
          metadata: customer.metadata || {},
        };

        const matchResult = await findMatchingRestaurant(
          supabaseAdmin,
          customerInfo,
          sub.id
        );

        if (matchResult.matched && matchResult.restaurantId) {
          // Get tier for this price
          const tier = amountCents >= 100000 ? 'elite' : 'premium';
          const { data: tierData } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', tier)
            .single();

          if (tierData) {
            // Update restaurant
            await supabaseAdmin
              .from('restaurants')
              .update({
                tier_id: tierData.id,
                stripe_subscription_id: sub.id,
                stripe_customer_id: customer.id,
              })
              .eq('id', matchResult.restaurantId);

            await markSubscriptionMatched(supabaseAdmin, sub.id, matchResult.restaurantId, 'reconcile');

            results.newlyMatched.push({
              subscriptionId: sub.id,
              restaurantName: matchResult.restaurantName || 'Unknown',
              method: matchResult.matchMethod || 'unknown',
              confidence: matchResult.confidence,
            });
          }
        } else {
          // Log unmatched
          await logUnmatchedSubscription(
            supabaseAdmin,
            sub.id,
            customerInfo,
            amountCents,
            billingInterval,
            matchResult.attempts
          );

          results.unmatched.push({
            subscriptionId: sub.id,
            customerEmail: customer.email ?? null,
            customerName: customer.name ?? null,
            amount: amountCents / 100,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`${sub.id}: ${message}`);
      }
    }

    // Send summary email if there are unmatched subscriptions
    if (results.unmatched.length > 0) {
      const unmatchedHtml = results.unmatched.map(u =>
        `<tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${u.customerEmail || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${u.customerName || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">$${u.amount.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><a href="https://dashboard.stripe.com/subscriptions/${u.subscriptionId}">View</a></td>
        </tr>`
      ).join('');

      try {
        await resend.emails.send({
          from: 'TasteLanc <hello@tastelanc.com>',
          to: 'admin@tastelanc.com',
          subject: `🔄 Reconciliation Report: ${results.unmatched.length} Unmatched, ${results.newlyMatched.length} Newly Matched`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Subscription Reconciliation Report</h2>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${results.alreadyLinked}</div>
                  <div style="color: #6b7280; font-size: 14px;">Already Linked</div>
                </div>
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${results.newlyMatched.length}</div>
                  <div style="color: #6b7280; font-size: 14px;">Newly Matched</div>
                </div>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${results.unmatched.length}</div>
                  <div style="color: #6b7280; font-size: 14px;">Unmatched</div>
                </div>
              </div>

              ${results.newlyMatched.length > 0 ? `
                <h3 style="margin-top: 30px; color: #22c55e;">✅ Newly Matched Subscriptions</h3>
                <ul style="background: #f0fdf4; padding: 15px 15px 15px 35px; border-radius: 8px;">
                  ${results.newlyMatched.map(m =>
                    `<li style="margin: 5px 0;"><strong>${m.restaurantName}</strong> - ${m.method} (${m.confidence}% confidence)</li>`
                  ).join('')}
                </ul>
              ` : ''}

              ${results.unmatched.length > 0 ? `
                <h3 style="margin-top: 30px; color: #dc2626;">⚠️ Unmatched Subscriptions (Need Manual Review)</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                  <thead>
                    <tr style="background: #f9fafb;">
                      <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Email</th>
                      <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Name</th>
                      <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Amount</th>
                      <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Stripe</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${unmatchedHtml}
                  </tbody>
                </table>
              ` : ''}

              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                Total Stripe subscriptions: ${results.totalSubscriptions} (${results.consumers} consumer, ${results.selfPromoters} self-promoter, ${results.totalSubscriptions - results.consumers - results.selfPromoters} restaurant)
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send reconciliation email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { error: 'Reconciliation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/subscription-reconcile
 *
 * Returns current reconciliation status - shows unmatched subscriptions
 */
export async function GET(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== 'admin@tastelanc.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get unmatched subscriptions
    const { data: unmatched, error } = await supabaseAdmin
      .from('unmatched_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get counts
    const { count: pendingCount } = await supabaseAdmin
      .from('unmatched_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: matchedCount } = await supabaseAdmin
      .from('unmatched_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'matched');

    // Get all restaurants with subscriptions
    const { data: linkedRestaurants } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, stripe_subscription_id, stripe_customer_id')
      .not('stripe_subscription_id', 'is', null);

    return NextResponse.json({
      unmatched: unmatched || [],
      counts: {
        pending: pendingCount || 0,
        matched: matchedCount || 0,
        linkedRestaurants: linkedRestaurants?.length || 0,
      },
      linkedRestaurants: linkedRestaurants || [],
    });
  } catch (error) {
    console.error('Error fetching reconciliation status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/subscription-reconcile
 *
 * Manually match an unmatched subscription to a restaurant
 */
export async function PATCH(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== 'admin@tastelanc.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { unmatchedId, restaurantId, subscriptionId } = body;

    if (!unmatchedId || !restaurantId || !subscriptionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const stripe = getStripe();

    // Get subscription from Stripe to get customer ID and amount
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer as string;
    const amountCents = subscription.items.data[0]?.price.unit_amount || 0;

    // Determine tier
    const tier = amountCents >= 100000 ? 'elite' : 'premium';
    const { data: tierData } = await supabaseAdmin
      .from('tiers')
      .select('id')
      .eq('name', tier)
      .single();

    if (!tierData) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 500 });
    }

    // Update restaurant
    const { error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        tier_id: tierData.id,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
      })
      .eq('id', restaurantId);

    if (updateError) throw updateError;

    // Mark as matched
    await supabaseAdmin
      .from('unmatched_subscriptions')
      .update({
        status: 'matched',
        matched_restaurant_id: restaurantId,
        matched_at: new Date().toISOString(),
        matched_by: user.id,
      })
      .eq('id', unmatchedId);

    // Get restaurant name for response
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('name')
      .eq('id', restaurantId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Subscription manually matched to ${restaurant?.name || 'restaurant'}`,
    });
  } catch (error) {
    console.error('Manual match error:', error);
    return NextResponse.json(
      { error: 'Failed to match subscription' },
      { status: 500 }
    );
  }
}
