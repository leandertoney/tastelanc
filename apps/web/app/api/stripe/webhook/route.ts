export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  getStripe,
  CONSUMER_PRICE_IDS,
  EARLY_ACCESS_PRICE_IDS,
  ALL_CONSUMER_PRICE_IDS,
  RESTAURANT_PRICE_IDS,
  SELF_PROMOTER_PRICE_IDS,
  DURATION_TO_INTERVAL,
} from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type Stripe from 'stripe';
import crypto from 'crypto';
import {
  findMatchingRestaurant,
  logUnmatchedSubscription,
  markSubscriptionMatched,
  type StripeCustomerInfo,
} from '@/lib/subscription-matching';

// Generate a secure setup token for password setup with personalization
interface SetupTokenOptions {
  name?: string;
  restaurantName?: string;
  coverImageUrl?: string;
}

async function generateSetupToken(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  email: string,
  options?: SetupTokenOptions
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabaseAdmin.from('password_setup_tokens').insert({
    user_id: userId,
    email,
    token,
    expires_at: expiresAt.toISOString(),
    name: options?.name || null,
    restaurant_name: options?.restaurantName || null,
    cover_image_url: options?.coverImageUrl || null,
  });

  return token;
}

// Generate branded welcome email HTML with restaurant cover image
function generateBrandedWelcomeEmail(
  setupLink: string,
  contactName: string,
  restaurantName: string,
  coverImageUrl?: string
): string {
  const firstName = contactName?.split(' ')[0] || '';

  // If we have a cover image, use the branded split-screen style
  if (coverImageUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
          <tr>
            <td align="center" style="padding: 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
                <!-- Restaurant Cover Image -->
                <tr>
                  <td style="position: relative;">
                    <img src="${coverImageUrl}" alt="${restaurantName}" width="600" style="display: block; width: 100%; height: 280px; object-fit: cover;" />
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 30px; background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Logo -->
                    <img src="https://tastelanc.com/images/tastelanc_new_dark.png" alt="TasteLanc" height="36" style="margin-bottom: 24px;" />

                    <!-- Restaurant Name Badge -->
                    <div style="background-color: #2563eb; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
                      ${restaurantName}
                    </div>

                    <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">
                      Hey ${firstName}! 👋
                    </h1>

                    <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Welcome to TasteLanc! Your <strong style="color: #ffffff;">${restaurantName}</strong> dashboard is ready and waiting for you.
                    </p>

                    <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                      Just one quick step — set your password and you're in. Takes less than a minute.
                    </p>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                      <tr>
                        <td style="background-color: #3b82f6; border-radius: 10px;">
                          <a href="${setupLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                            Set Up Your Account →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                      Once you're in, you can:
                    </p>
                    <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                      <li>Update your restaurant profile & photos</li>
                      <li>Post specials and happy hours</li>
                      <li>See your analytics and engagement</li>
                      <li>Connect with Lancaster foodies</li>
                    </ul>

                    <p style="color: #737373; font-size: 14px; margin: 0;">
                      Questions? Just reply to this email — we're here to help!
                    </p>

                    <!-- Divider -->
                    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />

                    <p style="color: #525252; font-size: 12px; text-align: center; margin: 0;">
                      TasteLanc — Lancaster's Local Food Guide<br/>
                      <a href="https://tastelanc.com" style="color: #6b7280;">tastelanc.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // Fallback to simpler branded email without image
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px;">
                  <!-- Logo -->
                  <img src="https://tastelanc.com/images/tastelanc_new_dark.png" alt="TasteLanc" height="36" style="margin-bottom: 24px;" />

                  <!-- Restaurant Name Badge -->
                  <div style="background-color: #2563eb; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
                    ${restaurantName}
                  </div>

                  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">
                    Hey ${firstName}! 👋
                  </h1>

                  <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Welcome to TasteLanc! Your <strong style="color: #ffffff;">${restaurantName}</strong> dashboard is ready and waiting for you.
                  </p>

                  <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    Just one quick step — set your password and you're in. Takes less than a minute.
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td style="background-color: #3b82f6; border-radius: 10px;">
                        <a href="${setupLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                          Set Up Your Account →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                    Once you're in, you can:
                  </p>
                  <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                    <li>Update your restaurant profile & photos</li>
                    <li>Post specials and happy hours</li>
                    <li>See your analytics and engagement</li>
                    <li>Connect with Lancaster foodies</li>
                  </ul>

                  <p style="color: #737373; font-size: 14px; margin: 0;">
                    Questions? Just reply to this email — we're here to help!
                  </p>

                  <!-- Divider -->
                  <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />

                  <p style="color: #525252; font-size: 12px; text-align: center; margin: 0;">
                    TasteLanc — Lancaster's Local Food Guide<br/>
                    <a href="https://tastelanc.com" style="color: #6b7280;">tastelanc.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Initialize Resend for sending emails
const resend = new Resend(process.env.RESEND_API_KEY);

// Use service role key for webhook to bypass RLS
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

// Helper to check if price ID is a consumer subscription (includes early access)
function isConsumerSubscription(priceId: string): boolean {
  return ALL_CONSUMER_PRICE_IDS.includes(priceId as typeof ALL_CONSUMER_PRICE_IDS[number]);
}

// Helper to determine billing period from price ID
function getConsumerBillingPeriod(priceId: string): 'monthly' | 'yearly' {
  if (
    priceId === CONSUMER_PRICE_IDS.premium_yearly ||
    priceId === EARLY_ACCESS_PRICE_IDS.yearly
  ) {
    return 'yearly';
  }
  return 'monthly';
}

// Helper to check if this is an early access/founder subscription
function isFounderSubscription(priceId: string): boolean {
  return (
    priceId === EARLY_ACCESS_PRICE_IDS.monthly ||
    priceId === EARLY_ACCESS_PRICE_IDS.yearly
  );
}

// Helper to check if this is a self-promoter subscription
function isSelfPromoterSubscription(priceId: string): boolean {
  return priceId === SELF_PROMOTER_PRICE_IDS.monthly;
}

// Helper to determine restaurant tier from price ID (Starter tier removed)
function getRestaurantTier(priceId: string): string {
  if (priceId.includes('elite') || priceId.includes('Elite')) return 'elite';
  // Default to premium for any paid subscription (starter tier removed)
  return 'premium';
}

// Helper to get price ID from plan and duration
function getPriceId(plan: string, duration: string): string | null {
  const key = `${plan}_${duration}` as keyof typeof RESTAURANT_PRICE_IDS;
  return RESTAURANT_PRICE_IDS[key] || null;
}

// Helper to find or create a user account for admin sales
// NOTE: Does NOT send welcome email - caller must send after restaurant linking
interface RestaurantBrandingInfo {
  restaurantId?: string;
  restaurantName: string;
  coverImageUrl?: string;
}

interface FindOrCreateUserResult {
  userId: string | null;
  isNewUser: boolean;
}

async function findOrCreateUser(
  email: string,
  contactName: string,
  businessNames: string[],
  phone: string,
  stripeCustomerId: string,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
): Promise<FindOrCreateUserResult> {
  // Check if user already exists by email
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    console.log(`Found existing user: ${existingUser.id}`);
    return { userId: existingUser.id, isNewUser: false };
  }

  // Create new user account via Supabase Auth
  const displayName = contactName || businessNames[0] || 'Restaurant Owner';
  const tempPassword = crypto.randomUUID().slice(0, 12);
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: displayName,
      role: 'restaurant_owner',
    },
  });

  if (createError || !newUser.user) {
    console.error('Failed to create user:', createError);
    return { userId: null, isNewUser: false };
  }

  const userId = newUser.user.id;
  console.log(`Created new user: ${userId}`);

  // Create profile for new user
  await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email,
    full_name: displayName,
    role: 'restaurant_owner',
    stripe_customer_id: stripeCustomerId,
  }, {
    onConflict: 'id',
  });

  return { userId, isNewUser: true };
}

// Send branded welcome email with setup token - call AFTER restaurant linking is confirmed
async function sendBrandedWelcomeEmailWithToken(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  contactName: string,
  restaurantName: string,
  coverImageUrl?: string,
  userId?: string,
): Promise<void> {
  if (!userId) return;

  const setupToken = await generateSetupToken(supabaseAdmin, userId, email, {
    name: contactName,
    restaurantName,
    coverImageUrl,
  });
  const setupLink = `https://tastelanc.com/setup-account?token=${setupToken}`;

  await resend.emails.send({
    from: 'TasteLanc <hello@tastelanc.com>',
    to: email,
    subject: `Welcome to TasteLanc! Set Up Your ${restaurantName} Account`,
    html: generateBrandedWelcomeEmail(setupLink, contactName, restaurantName, coverImageUrl),
  });
  console.log(`Branded welcome email sent to ${email}`);
}

// Handle multi-restaurant checkout completion
async function handleMultiRestaurantCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
) {
  const salesOrderId = session.metadata?.sales_order_id;
  if (!salesOrderId) {
    console.error('Missing sales_order_id in multi-restaurant checkout');
    return;
  }

  // Check idempotency - skip if already processed
  const { data: existingOrder } = await supabaseAdmin
    .from('sales_orders')
    .select('status')
    .eq('id', salesOrderId)
    .single();

  if (existingOrder && existingOrder.status !== 'pending') {
    console.log(`Sales order ${salesOrderId} already processed (status: ${existingOrder.status})`);
    return;
  }

  // Fetch order + items
  const { data: salesOrder } = await supabaseAdmin
    .from('sales_orders')
    .select('*')
    .eq('id', salesOrderId)
    .single();

  if (!salesOrder) {
    console.error(`Sales order ${salesOrderId} not found`);
    return;
  }

  const { data: orderItems } = await supabaseAdmin
    .from('sales_order_items')
    .select('*')
    .eq('sales_order_id', salesOrderId);

  if (!orderItems || orderItems.length === 0) {
    console.error(`No items found for sales order ${salesOrderId}`);
    return;
  }

  // Update order status to processing
  await supabaseAdmin
    .from('sales_orders')
    .update({
      status: 'processing',
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_checkout_session_id: session.id,
    })
    .eq('id', salesOrderId);

  const email = salesOrder.customer_email;
  const contactName = salesOrder.customer_name || '';
  const phone = salesOrder.customer_phone || '';
  const customerId = session.customer as string;
  const discountPercent = salesOrder.discount_percent;

  console.log('Processing multi-restaurant checkout:', {
    salesOrderId,
    email,
    restaurantCount: orderItems.length,
    discountPercent,
  });

  // Fetch primary restaurant branding for welcome email
  let primaryRestaurant: RestaurantBrandingInfo | undefined;
  const firstItemWithRestaurant = orderItems.find((item: { restaurant_id?: string }) => item.restaurant_id);
  if (firstItemWithRestaurant?.restaurant_id) {
    const { data: restaurantData } = await supabaseAdmin
      .from('restaurants')
      .select('name, cover_image_url')
      .eq('id', firstItemWithRestaurant.restaurant_id)
      .single();

    if (restaurantData) {
      primaryRestaurant = {
        restaurantId: firstItemWithRestaurant.restaurant_id,
        restaurantName: restaurantData.name,
        coverImageUrl: restaurantData.cover_image_url || undefined,
      };
      console.log(`Fetched primary restaurant branding: ${restaurantData.name}`);
    }
  }

  // Find or create user account (does NOT send welcome email yet)
  const businessNames = orderItems.map((item: { restaurant_name: string }) => item.restaurant_name);
  const { userId, isNewUser } = await findOrCreateUser(email, contactName, businessNames, phone, customerId, supabaseAdmin);

  if (!userId) {
    await supabaseAdmin
      .from('sales_orders')
      .update({ status: 'failed' })
      .eq('id', salesOrderId);
    console.error('Failed to find or create user for multi-restaurant checkout');
    return;
  }

  // Process each order item - link restaurants BEFORE sending welcome email
  let allSucceeded = true;
  for (const item of orderItems) {
    try {
      // Link or create restaurant
      let linkedRestaurantId: string;

      if (item.restaurant_id && !item.is_new_restaurant) {
        // Link existing restaurant to user
        const { error: linkError } = await supabaseAdmin
          .from('restaurants')
          .update({ owner_id: userId })
          .eq('id', item.restaurant_id);

        if (linkError) {
          throw new Error(`Failed to link restaurant ${item.restaurant_id}: ${linkError.message}`);
        }

        // Verify owner_id was actually set
        const { data: verifyData } = await supabaseAdmin
          .from('restaurants')
          .select('owner_id')
          .eq('id', item.restaurant_id)
          .single();

        if (!verifyData || verifyData.owner_id !== userId) {
          throw new Error(`owner_id verification failed for restaurant ${item.restaurant_id}: expected ${userId}, got ${verifyData?.owner_id}`);
        }

        linkedRestaurantId = item.restaurant_id;
        console.log(`Linked restaurant ${item.restaurant_id} to user ${userId} (verified)`);
      } else {
        // Create new restaurant
        const slug = item.restaurant_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const { data: newRestaurant, error: restaurantError } = await supabaseAdmin
          .from('restaurants')
          .insert({
            name: item.restaurant_name,
            slug: `${slug}-${Date.now().toString(36)}`,
            owner_id: userId,
            phone,
            is_active: true,
            is_verified: false,
            city: 'Lancaster',
            state: 'PA',
          })
          .select('id')
          .single();

        if (!newRestaurant) {
          throw new Error(`Failed to create restaurant: ${restaurantError?.message}`);
        }
        linkedRestaurantId = newRestaurant.id;
        console.log(`Created new restaurant: ${linkedRestaurantId}`);
      }

      // Create individual Stripe subscription with deferred billing
      const priceId = getPriceId(item.plan, item.duration);
      if (!priceId) {
        throw new Error(`Invalid plan/duration: ${item.plan}/${item.duration}`);
      }

      const intervalInfo = DURATION_TO_INTERVAL[item.duration];

      // Calculate billing_cycle_anchor to defer the first charge (already paid via sales order)
      // Using billing_cycle_anchor instead of trial_end avoids Stripe labeling it as a "trial"
      const now = new Date();
      let anchorDate: Date;
      if (intervalInfo.interval === 'year') {
        anchorDate = new Date(now.getFullYear() + intervalInfo.interval_count, now.getMonth(), now.getDate());
      } else {
        anchorDate = new Date(now.getFullYear(), now.getMonth() + intervalInfo.interval_count, now.getDate());
      }

      const subParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        billing_cycle_anchor: Math.floor(anchorDate.getTime() / 1000),
        proration_behavior: 'none',
        metadata: {
          sales_order_id: salesOrderId,
          sales_order_item_id: item.id,
          restaurant_id: linkedRestaurantId,
          admin_sale: 'true',
          multi_restaurant: 'true',
        },
      };

      const subscription = await getStripe().subscriptions.create(subParams);

      // Update restaurant with tier and subscription
      const tier = item.plan; // 'premium' or 'elite'
      const { data: tierData } = await supabaseAdmin
        .from('tiers')
        .select('id')
        .eq('name', tier)
        .single();

      if (tierData) {
        await supabaseAdmin
          .from('restaurants')
          .update({
            tier_id: tierData.id,
            stripe_subscription_id: subscription.id,
          })
          .eq('id', linkedRestaurantId);

        console.log(`Restaurant ${linkedRestaurantId} upgraded to ${tier} tier (subscription: ${subscription.id})`);
      }

      // Update order item status
      await supabaseAdmin
        .from('sales_order_items')
        .update({
          stripe_subscription_id: subscription.id,
          linked_restaurant_id: linkedRestaurantId,
          processing_status: 'subscription_created',
        })
        .eq('id', item.id);

    } catch (error) {
      console.error(`Failed to process order item ${item.id}:`, error);
      allSucceeded = false;
      await supabaseAdmin
        .from('sales_order_items')
        .update({
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', item.id);
    }
  }

  // Update order status
  await supabaseAdmin
    .from('sales_orders')
    .update({
      status: allSucceeded ? 'completed' : 'partially_failed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', salesOrderId);

  // Send welcome email AFTER all restaurants are linked (only for new users)
  if (isNewUser && allSucceeded) {
    // Determine email branding from primary restaurant
    const businessNamesList = businessNames.length > 1
      ? businessNames.slice(0, -1).join(', ') + ' and ' + businessNames[businessNames.length - 1]
      : businessNames[0];
    const emailRestaurantName = primaryRestaurant?.restaurantName || businessNamesList;
    const emailCoverImage = primaryRestaurant?.coverImageUrl;

    try {
      await sendBrandedWelcomeEmailWithToken(
        supabaseAdmin, email, contactName, emailRestaurantName, emailCoverImage, userId
      );
    } catch (emailError) {
      console.error('Failed to send welcome email (restaurants are linked, email failed):', emailError);
      // Don't fail the order - restaurants are linked, email can be resent manually
    }
  } else if (isNewUser && !allSucceeded) {
    console.error('CRITICAL: New user created but restaurant linking partially failed - welcome email NOT sent to prevent broken setup');
    console.error(`User ${userId} (${email}) needs manual intervention`);
  }

  // Send admin notification
  const amountPaid = session.amount_total ? (session.amount_total / 100).toFixed(2) : 'N/A';
  const restaurantList = orderItems.map((item: { restaurant_name: string; plan: string; duration: string }) => {
    const planName = item.plan.charAt(0).toUpperCase() + item.plan.slice(1);
    return `${item.restaurant_name} (${planName} - ${item.duration})`;
  }).join(', ');

  try {
    await resend.emails.send({
      from: 'TasteLanc <hello@tastelanc.com>',
      to: 'admin@tastelanc.com',
      subject: `Multi-Restaurant Payment: ${orderItems.length} restaurants - $${amountPaid}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Multi-Restaurant Payment</h2>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Contact:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${contactName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Email:</td>
              <td style="padding: 8px 0; color: #1a1a1a;"><a href="mailto:${email}" style="color: #3b82f6;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
              <td style="padding: 8px 0; color: #1a1a1a;">${phone || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Restaurants:</td>
              <td style="padding: 8px 0; color: #1a1a1a;">${restaurantList}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Discount:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${discountPercent}% off</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Total Paid:</td>
              <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">$${amountPaid}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Status:</td>
              <td style="padding: 8px 0; color: #1a1a1a;">${allSucceeded ? 'All subscriptions created' : 'Some items failed - check logs'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Stripe Customer:</td>
              <td style="padding: 8px 0; color: #1a1a1a;"><a href="https://dashboard.stripe.com/customers/${customerId}" style="color: #3b82f6;">${customerId}</a></td>
            </tr>
          </table>
        </div>
      `,
    });
    console.log('Admin notification sent for multi-restaurant checkout');
  } catch (notifyError) {
    console.error('Failed to send admin notification:', notifyError);
  }

  console.log(`Multi-restaurant checkout ${allSucceeded ? 'completed' : 'partially failed'}: ${orderItems.length} restaurants for ${email}`);
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`Processing webhook event: ${event.type}`);

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionType = session.metadata?.subscription_type; // 'consumer' or 'restaurant'
        const subscriptionId = session.subscription as string;
        const isAdminSale = session.metadata?.admin_sale === 'true';

        const isMultiRestaurant = session.metadata?.multi_restaurant === 'true';

        console.log('Checkout completed:', { subscriptionType, subscriptionId, isAdminSale, isMultiRestaurant });

        // Handle multi-restaurant checkout (payment mode - no subscription ID)
        if (isAdminSale && isMultiRestaurant) {
          await handleMultiRestaurantCheckout(session, supabaseAdmin);
          break;
        }

        if (!subscriptionId) {
          console.error('Missing subscriptionId in checkout session');
          break;
        }

        // Get subscription details from Stripe
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
        const subscriptionItem = subscription.items.data[0];
        const priceId = subscriptionItem.price.id;

        // Handle admin sales (restaurant subscriptions created by sales team)
        if (isAdminSale && subscriptionType === 'restaurant') {
          const email = session.metadata?.email || session.customer_email;
          const businessName = session.metadata?.business_name || '';
          const contactName = session.metadata?.contact_name || '';
          const phone = session.metadata?.phone || '';
          const restaurantId = session.metadata?.restaurant_id || '';
          const plan = session.metadata?.plan || '';

          console.log('Processing admin sale:', { email, businessName, restaurantId, plan });

          if (!email) {
            console.error('No email found for admin sale');
            break;
          }

          // Step 0: Fetch restaurant data FIRST (for branded email)
          let restaurantCoverImage: string | null = null;
          let restaurantDisplayName = businessName;

          if (restaurantId) {
            const { data: restaurantData } = await supabaseAdmin
              .from('restaurants')
              .select('name, cover_image_url')
              .eq('id', restaurantId)
              .single();

            if (restaurantData) {
              restaurantCoverImage = restaurantData.cover_image_url;
              restaurantDisplayName = restaurantData.name || businessName;
              console.log(`Fetched restaurant data: ${restaurantDisplayName}, cover: ${restaurantCoverImage ? 'yes' : 'no'}`);
            }
          }

          // Step 1: Find or create user account (does NOT send welcome email)
          let userId: string | null = null;
          let isNewSingleUser = false;

          // Check if user already exists by email
          const { data: existingUser } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (existingUser) {
            userId = existingUser.id;
            console.log(`Found existing user: ${userId}`);
          } else {
            // Create new user account via Supabase Auth
            const tempPassword = crypto.randomUUID().slice(0, 12);
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name: contactName || businessName,
                role: 'restaurant_owner',
              },
            });

            if (createError || !newUser.user) {
              console.error('Failed to create user:', createError);
              break;
            }

            userId = newUser.user.id;
            isNewSingleUser = true;
            console.log(`Created new user: ${userId}`);

            // Create profile for new user
            await supabaseAdmin.from('profiles').upsert({
              id: userId,
              email,
              full_name: contactName || businessName,
              role: 'restaurant_owner',
              stripe_customer_id: session.customer as string,
            }, {
              onConflict: 'id',
            });
          }

          // Step 2: Link or create restaurant FIRST (before sending welcome email)
          let linkedRestaurantId = restaurantId;
          let restaurantLinkSucceeded = false;

          if (restaurantId) {
            // Link existing restaurant to user
            const { error: linkError } = await supabaseAdmin
              .from('restaurants')
              .update({ owner_id: userId })
              .eq('id', restaurantId);

            if (linkError) {
              console.error(`Failed to link restaurant ${restaurantId}:`, linkError);
            } else {
              // Verify owner_id was actually set
              const { data: verifyData } = await supabaseAdmin
                .from('restaurants')
                .select('owner_id')
                .eq('id', restaurantId)
                .single();

              if (verifyData && verifyData.owner_id === userId) {
                restaurantLinkSucceeded = true;
                console.log(`Linked restaurant ${restaurantId} to user ${userId} (verified)`);
              } else {
                console.error(`owner_id verification failed for restaurant ${restaurantId}: expected ${userId}, got ${verifyData?.owner_id}`);
              }
            }
          } else if (businessName) {
            // Create new restaurant
            const slug = businessName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');

            const { data: newRestaurant, error: restaurantError } = await supabaseAdmin
              .from('restaurants')
              .insert({
                name: businessName,
                slug: `${slug}-${Date.now().toString(36)}`,
                owner_id: userId,
                phone,
                is_active: true,
                is_verified: false,
                city: 'Lancaster',
                state: 'PA',
              })
              .select('id')
              .single();

            if (newRestaurant) {
              linkedRestaurantId = newRestaurant.id;
              restaurantLinkSucceeded = true;
              console.log(`Created new restaurant: ${linkedRestaurantId}`);
            } else {
              console.error('Failed to create restaurant:', restaurantError);
            }
          }

          // Step 3: Update restaurant tier (subscription tracked via Stripe)
          const tier = getRestaurantTier(priceId);
          const { data: tierData } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', tier)
            .single();

          if (tierData && linkedRestaurantId) {
            // Update restaurant tier and store Stripe subscription ID
            await supabaseAdmin
              .from('restaurants')
              .update({
                tier_id: tierData.id,
                stripe_subscription_id: subscriptionId,
              })
              .eq('id', linkedRestaurantId);

            console.log(`Restaurant ${linkedRestaurantId} upgraded to ${tier} tier (subscription: ${subscriptionId})`);
          }

          // Step 3.5: Send welcome email AFTER restaurant is linked (only for new users)
          if (isNewSingleUser && restaurantLinkSucceeded) {
            try {
              await sendBrandedWelcomeEmailWithToken(
                supabaseAdmin, email, contactName, restaurantDisplayName,
                restaurantCoverImage || undefined, userId || undefined
              );
            } catch (emailError) {
              console.error('Failed to send welcome email (restaurant is linked, email failed):', emailError);
              // Don't fail the sale - restaurant is linked, email can be resent manually
            }
          } else if (isNewSingleUser && !restaurantLinkSucceeded) {
            console.error('CRITICAL: New user created but restaurant linking failed - welcome email NOT sent');
            console.error(`User ${userId} (${email}) needs manual intervention`);
          }

          // Step 4: Send admin notification
          const amountPaid = session.amount_total ? (session.amount_total / 100).toFixed(2) : 'N/A';
          try {
            await resend.emails.send({
              from: 'TasteLanc <hello@tastelanc.com>',
              to: 'admin@tastelanc.com',
              subject: `New Restaurant Payment: ${businessName} - $${amountPaid}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">New Restaurant Payment</h2>

                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; width: 140px;">Business Name:</td>
                      <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${businessName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Contact:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;">${contactName || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;"><a href="mailto:${email}" style="color: #3b82f6;">${email}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;">${phone || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Plan:</td>
                      <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${tier.charAt(0).toUpperCase() + tier.slice(1)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                      <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">$${amountPaid}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Stripe Customer:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;"><a href="https://dashboard.stripe.com/customers/${session.customer}" style="color: #3b82f6;">${session.customer}</a></td>
                    </tr>
                  </table>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                    Welcome email has been sent to the customer with account setup instructions.
                  </p>
                </div>
              `,
            });
            console.log('Admin notification sent');
          } catch (notifyError) {
            console.error('Failed to send admin notification:', notifyError);
          }

          console.log(`Admin sale completed: ${tier} subscription for ${email}`);
          break;
        }

        // Handle admin sale for self-promoter subscriptions
        if (isAdminSale && subscriptionType === 'self_promoter') {
          const email = session.metadata?.email || session.customer_email;
          const artistName = session.metadata?.artist_name || '';
          const contactName = session.metadata?.contact_name || '';
          const phone = session.metadata?.phone || '';
          const genre = session.metadata?.genre || '';

          console.log('Processing self-promoter admin sale:', { email, artistName });

          if (!email) {
            console.error('No email found for self-promoter admin sale');
            break;
          }

          // Step 1: Find or create user account
          let selfPromoterUserId: string | null = null;

          // Check if user already exists by email
          const { data: existingSelfPromoterUser } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (existingSelfPromoterUser) {
            selfPromoterUserId = existingSelfPromoterUser.id;
            console.log(`Found existing user for self-promoter: ${selfPromoterUserId}`);

            // Update user metadata to self_promoter role
            if (selfPromoterUserId) {
              await supabaseAdmin.auth.admin.updateUserById(selfPromoterUserId, {
                user_metadata: {
                  full_name: contactName || artistName,
                  role: 'self_promoter',
                },
              });
            }
          } else {
            // Create new user account via Supabase Auth
            const tempPassword = crypto.randomUUID().slice(0, 12);
            const { data: newSelfPromoterUser, error: createSelfPromoterError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name: contactName || artistName,
                role: 'self_promoter',
              },
            });

            if (createSelfPromoterError || !newSelfPromoterUser.user) {
              console.error('Failed to create self-promoter user:', createSelfPromoterError);
              break;
            }

            selfPromoterUserId = newSelfPromoterUser.user.id;
            console.log(`Created new self-promoter user: ${selfPromoterUserId}`);

            // Create profile for new user
            await supabaseAdmin.from('profiles').upsert({
              id: selfPromoterUserId,
              email,
              full_name: contactName || artistName,
              role: 'self_promoter',
              stripe_customer_id: session.customer as string,
            }, {
              onConflict: 'id',
            });

            // Generate password setup token and send welcome email
            const selfPromoterSetupToken = await generateSetupToken(supabaseAdmin, selfPromoterUserId, email);
            const setupLink = `https://tastelanc.com/setup-account?token=${selfPromoterSetupToken}`;

            await resend.emails.send({
              from: 'TasteLanc <hello@tastelanc.com>',
              to: email,
              subject: `Welcome to TasteLanc! Set Up Your ${artistName} Account`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">Welcome to TasteLanc!</h1>
                  </div>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi${contactName ? ` ${contactName.split(' ')[0]}` : ''},</p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Thank you for joining TasteLanc as a Self-Promoter! Your account for <strong>${artistName}</strong> is ready.
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    To get started, click the button below to set up your password and access your dashboard:
                  </p>

                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${setupLink}" style="background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                      Set Up Your Account
                    </a>
                  </div>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Once you're set up, you can create events, upload flyers, and promote your performances to Lancaster's local audience.
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    If you have any questions, just reply to this email - we're here to help!
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Cheers,<br/>
                    <strong>The TasteLanc Team</strong>
                  </p>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

                  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                    TasteLanc - Lancaster's Local Food Guide<br/>
                    <a href="https://tastelanc.com" style="color: #6b7280;">tastelanc.com</a>
                  </p>
                </div>
              `,
            });
            console.log(`Welcome email sent to self-promoter ${email}`);
          }

          // Step 2: Create self-promoter record
          const slug = artistName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          const { data: newSelfPromoter, error: selfPromoterError } = await supabaseAdmin
            .from('self_promoters')
            .insert({
              name: artistName,
              slug: `${slug}-${Date.now().toString(36)}`,
              owner_id: selfPromoterUserId,
              email,
              phone,
              genre,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer as string,
              is_active: true,
            })
            .select('id')
            .single();

          if (selfPromoterError) {
            console.error('Failed to create self-promoter record:', selfPromoterError);
          } else {
            console.log(`Created self-promoter: ${newSelfPromoter.id}`);
          }

          // Step 3: Send admin notification
          const amountPaid = session.amount_total ? (session.amount_total / 100).toFixed(2) : 'N/A';
          try {
            await resend.emails.send({
              from: 'TasteLanc <hello@tastelanc.com>',
              to: 'admin@tastelanc.com',
              subject: `New Self-Promoter: ${artistName} - $${amountPaid}/month`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1a1a1a; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">New Self-Promoter Signup</h2>

                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; width: 140px;">Artist Name:</td>
                      <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${artistName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Contact:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;">${contactName || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;"><a href="mailto:${email}" style="color: #3b82f6;">${email}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;">${phone || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Genre:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;">${genre || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Plan:</td>
                      <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">Self-Promoter ($50/month)</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                      <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">$${amountPaid}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Stripe Customer:</td>
                      <td style="padding: 8px 0; color: #1a1a1a;"><a href="https://dashboard.stripe.com/customers/${session.customer}" style="color: #3b82f6;">${session.customer}</a></td>
                    </tr>
                  </table>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                    Welcome email has been sent to the self-promoter with account setup instructions.
                  </p>
                </div>
              `,
            });
            console.log('Admin notification sent for self-promoter');
          } catch (notifyError) {
            console.error('Failed to send self-promoter admin notification:', notifyError);
          }

          console.log(`Self-promoter admin sale completed for ${email}`);
          break;
        }

        // Handle regular checkout (non-admin)
        const userId = session.metadata?.user_id;

        if (!userId) {
          console.error('Missing userId in checkout session');
          break;
        }

        // Check if this is a consumer subscription
        if (subscriptionType === 'consumer' || isConsumerSubscription(priceId)) {
          // Consumer TasteLanc+ subscription
          const billingPeriod = getConsumerBillingPeriod(priceId);
          const isFounder = isFounderSubscription(priceId) || session.metadata?.is_founder === 'true';

          const { error: upsertError } = await supabaseAdmin.from('consumer_subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            stripe_price_id: priceId,
            status: 'active',
            billing_period: billingPeriod,
            is_founder: isFounder,
            current_period_start: new Date(subscriptionItem.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscriptionItem.current_period_end * 1000).toISOString(),
          }, {
            onConflict: 'user_id',
          });

          if (upsertError) {
            console.error('Failed to upsert consumer subscription:', upsertError);
            throw upsertError;
          }

          // Mark early access signup as converted if applicable
          const userEmail = session.customer_email || session.customer_details?.email;
          const normalizedEmail = userEmail?.trim().toLowerCase();
          const customerId = session.customer as string | undefined;

          // Update conversion using normalized email and/or Stripe customer ID to avoid case/format mismatches
          if (normalizedEmail || customerId) {
            const updateQuery = supabaseAdmin
              .from('early_access_signups')
              .update({
                converted_at: new Date().toISOString(),
                stripe_customer_id: customerId || null,
              })
              .is('converted_at', null);

            if (normalizedEmail && customerId) {
              updateQuery.or(`email.eq.${normalizedEmail},stripe_customer_id.eq.${customerId}`);
            } else if (normalizedEmail) {
              updateQuery.eq('email', normalizedEmail);
            } else if (customerId) {
              updateQuery.eq('stripe_customer_id', customerId);
            }

            await updateQuery;
          }

          // Also update profile to mark as premium
          await supabaseAdmin
            .from('profiles')
            .update({
              is_premium: true,
              stripe_customer_id: session.customer as string,
            })
            .eq('id', userId);

          console.log(`Consumer subscription activated for user ${userId}`);
        } else {
          // Restaurant subscription - update tier directly on restaurant
          const tier = getRestaurantTier(priceId);
          const metadataRestaurantId = session.metadata?.restaurant_id;

          // Get tier ID from database
          const { data: tierData } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', tier)
            .single();

          if (tierData) {
            // Use restaurant_id from metadata if available, otherwise find by owner_id
            let restaurantId: string | null = null;

            if (metadataRestaurantId) {
              const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('id')
                .eq('id', metadataRestaurantId)
                .single();
              restaurantId = restaurant?.id || null;
            }

            if (!restaurantId) {
              const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('id')
                .eq('owner_id', userId)
                .limit(1)
                .single();
              restaurantId = restaurant?.id || null;
            }

            if (restaurantId) {
              await supabaseAdmin
                .from('restaurants')
                .update({
                  tier_id: tierData.id,
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: session.customer as string,
                })
                .eq('id', restaurantId);

              console.log(`Restaurant ${restaurantId} upgraded to ${tier} tier`);

              // If this was a plan upgrade, cancel the old subscription
              const oldSubscriptionId = session.metadata?.old_subscription_id;
              if (oldSubscriptionId && oldSubscriptionId !== subscriptionId) {
                try {
                  await getStripe().subscriptions.cancel(oldSubscriptionId, {
                    prorate: false, // We already handled proration via coupon
                  });
                  console.log(`Canceled old subscription ${oldSubscriptionId} after upgrade`);
                } catch (cancelErr) {
                  console.error(`Failed to cancel old subscription ${oldSubscriptionId}:`, cancelErr);
                }
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subItem = subscription.items.data[0];
        const priceId = subItem.price.id;

        console.log('Subscription event:', {
          type: event.type,
          customerId,
          priceId,
          status: subscription.status,
          subscriptionId: subscription.id,
        });

        // Fetch customer details from Stripe to get email and metadata
        const customer = await getStripe().customers.retrieve(customerId);
        const customerEmail = !('deleted' in customer) ? (customer.email ?? null) : null;
        const customerMetadata = !('deleted' in customer) ? customer.metadata : {};
        const customerName = !('deleted' in customer) ? (customer.name ?? null) : null;

        console.log('Customer details:', {
          email: customerEmail,
          name: customerName,
          metadata: customerMetadata,
        });

        if (isConsumerSubscription(priceId)) {
          // Consumer subscription update
          let consumerSub = await supabaseAdmin
            .from('consumer_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single()
            .then(r => r.data);

          // If not found by customer ID, try by user ID from metadata or email
          if (!consumerSub && customerMetadata?.supabase_user_id) {
            consumerSub = await supabaseAdmin
              .from('consumer_subscriptions')
              .select('user_id')
              .eq('user_id', customerMetadata.supabase_user_id)
              .single()
              .then(r => r.data);
          }

          // Try to find user by email if still not found
          if (!consumerSub && customerEmail) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('email', customerEmail.toLowerCase())
              .single();

            if (profile) {
              // Check if consumer_subscription exists for this user
              consumerSub = await supabaseAdmin
                .from('consumer_subscriptions')
                .select('user_id')
                .eq('user_id', profile.id)
                .single()
                .then(r => r.data);

              // If no subscription record, create one
              if (!consumerSub) {
                const billingPeriod = getConsumerBillingPeriod(priceId);
                const isFounder = isFounderSubscription(priceId);

                await supabaseAdmin.from('consumer_subscriptions').insert({
                  user_id: profile.id,
                  stripe_subscription_id: subscription.id,
                  stripe_customer_id: customerId,
                  stripe_price_id: priceId,
                  status: 'active',
                  billing_period: billingPeriod,
                  is_founder: isFounder,
                  current_period_start: new Date(subItem.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subItem.current_period_end * 1000).toISOString(),
                });

                await supabaseAdmin
                  .from('profiles')
                  .update({
                    is_premium: true,
                    stripe_customer_id: customerId,
                  })
                  .eq('id', profile.id);

                console.log(`Created consumer subscription for user ${profile.id} (from Stripe-created subscription)`);
                break;
              }
            }
          }

          if (consumerSub) {
            const billingPeriod = getConsumerBillingPeriod(priceId);

            await supabaseAdmin
              .from('consumer_subscriptions')
              .update({
                stripe_subscription_id: subscription.id,
                stripe_customer_id: customerId,
                stripe_price_id: priceId,
                status: (subscription.status === 'active' || subscription.status === 'trialing') ? 'active' : subscription.status,
                billing_period: billingPeriod,
                current_period_start: new Date(subItem.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subItem.current_period_end * 1000).toISOString(),
              })
              .eq('user_id', consumerSub.user_id);

            // Update premium status on profile
            await supabaseAdmin
              .from('profiles')
              .update({
                is_premium: subscription.status === 'active' || subscription.status === 'trialing',
                stripe_customer_id: customerId,
              })
              .eq('id', consumerSub.user_id);

            console.log(`Consumer subscription updated for user ${consumerSub.user_id}`);
          } else {
            console.log('No matching user found for consumer subscription - may need manual linking');
          }
        } else if (isSelfPromoterSubscription(priceId)) {
          // Self-promoter subscription - find by customer ID or email
          let selfPromoter = await supabaseAdmin
            .from('self_promoters')
            .select('id, name')
            .eq('stripe_customer_id', customerId)
            .single()
            .then(r => r.data);

          // Try by email if not found
          if (!selfPromoter && customerEmail) {
            selfPromoter = await supabaseAdmin
              .from('self_promoters')
              .select('id, name')
              .eq('email', customerEmail.toLowerCase())
              .single()
              .then(r => r.data);
          }

          if (selfPromoter) {
            await supabaseAdmin
              .from('self_promoters')
              .update({
                stripe_subscription_id: subscription.id,
                stripe_customer_id: customerId,
                is_active: subscription.status === 'active' || subscription.status === 'trialing',
              })
              .eq('id', selfPromoter.id);

            console.log(`Self-promoter ${selfPromoter.name} subscription updated`);
          } else {
            console.log('No matching self-promoter found - may need manual linking');
          }
        } else {
          // Restaurant subscription update - use multi-layer matching
          const subscriptionId = subscription.id;
          const tier = getRestaurantTier(priceId);
          const amountCents = subItem.price.unit_amount || 0;
          const billingInterval = subItem.price.recurring?.interval || 'month';

          const { data: tierData } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', tier)
            .single();

          if (tierData) {
            // Build customer info for matching
            const customerInfo: StripeCustomerInfo = {
              customerId,
              email: customerEmail,
              name: customerName,
              phone: !('deleted' in customer) ? (customer.phone ?? null) : null,
              metadata: customerMetadata,
            };

            // Use multi-layer matching system
            const matchResult = await findMatchingRestaurant(
              supabaseAdmin,
              customerInfo,
              subscriptionId
            );

            console.log('Match result:', {
              matched: matchResult.matched,
              method: matchResult.matchMethod,
              confidence: matchResult.confidence,
              restaurant: matchResult.restaurantName,
              attemptsCount: matchResult.attempts.length,
            });

            if (matchResult.matched && matchResult.restaurantId) {
              // Update the restaurant with subscription info
              await supabaseAdmin
                .from('restaurants')
                .update({
                  tier_id: tierData.id,
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: customerId,
                })
                .eq('id', matchResult.restaurantId);

              // Mark as matched if it was previously in unmatched queue
              await markSubscriptionMatched(supabaseAdmin, subscriptionId, matchResult.restaurantId, 'auto');

              console.log(`Restaurant ${matchResult.restaurantName} updated: tier=${tier}, subscription=${subscriptionId}, method=${matchResult.matchMethod}, confidence=${matchResult.confidence}%`);

              // Send admin notification for new subscriptions (but NOT for admin-created ones - they already notified)
              const isAdminCreated = subscription.metadata?.admin_sale === 'true';
              if (event.type === 'customer.subscription.created' && !isAdminCreated) {
                try {
                  await resend.emails.send({
                    from: 'TasteLanc <hello@tastelanc.com>',
                    to: 'admin@tastelanc.com',
                    subject: `✅ Subscription Synced: ${matchResult.restaurantName}`,
                    html: `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">Subscription Auto-Matched</h2>
                        <p><strong>${matchResult.restaurantName}</strong> has been upgraded to the <strong>${tier}</strong> tier.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Match Method:</td>
                            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${matchResult.matchMethod}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Confidence:</td>
                            <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">${matchResult.confidence}%</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
                            <td style="padding: 8px 0; color: #1a1a1a;">${customerEmail || customerName || customerId}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                            <td style="padding: 8px 0; color: #1a1a1a;">$${(amountCents / 100).toFixed(2)}/${billingInterval}</td>
                          </tr>
                        </table>
                        <p><a href="https://dashboard.stripe.com/subscriptions/${subscriptionId}" style="color: #3b82f6;">View in Stripe</a></p>
                      </div>
                    `,
                  });
                } catch (notifyError) {
                  console.error('Failed to send sync notification:', notifyError);
                }
              }
            } else {
              // NO MATCH FOUND - Log to unmatched queue and alert admin
              // Skip for admin-created subscriptions - they should always have restaurant_id in metadata
              const isAdminCreated = subscription.metadata?.admin_sale === 'true';
              if (isAdminCreated) {
                console.log('Admin-created subscription without restaurant_id in metadata - this should not happen');
                console.log('Subscription metadata:', subscription.metadata);
                break;
              }

              console.log('No matching restaurant found for subscription - logging for admin review');
              console.log('Customer info:', { email: customerEmail, name: customerName, phone: customerInfo.phone, id: customerId });
              console.log('Match attempts:', matchResult.attempts);

              // Log to unmatched_subscriptions table
              await logUnmatchedSubscription(
                supabaseAdmin,
                subscriptionId,
                customerInfo,
                amountCents,
                billingInterval,
                matchResult.attempts
              );

              // Send URGENT admin alert for unmatched subscription
              try {
                const attemptsHtml = matchResult.attempts.map(a =>
                  `<li style="margin: 5px 0; color: ${a.found ? '#22c55e' : '#dc2626'};">
                    <strong>${a.method}</strong>: searched "${a.searched || 'N/A'}" → ${a.found ? `FOUND ${a.restaurantName}` : 'not found'}
                  </li>`
                ).join('');

                await resend.emails.send({
                  from: 'TasteLanc <hello@tastelanc.com>',
                  to: 'admin@tastelanc.com',
                  subject: `🚨 UNMATCHED Subscription: $${(amountCents / 100).toFixed(2)}/${billingInterval} - Needs Manual Review`,
                  html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">⚠️ Unmatched Subscription</h2>
                      <p style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; color: #991b1b;">
                        A new subscription could not be automatically matched to any restaurant. Please review and manually link.
                      </p>

                      <h3 style="margin-top: 20px;">Customer Information</h3>
                      <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Email:</td>
                          <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${customerEmail || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Name:</td>
                          <td style="padding: 8px 0; color: #1a1a1a;">${customerName || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                          <td style="padding: 8px 0; color: #1a1a1a;">${customerInfo.phone || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Business Name:</td>
                          <td style="padding: 8px 0; color: #1a1a1a;">${customerMetadata?.business_name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                          <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">$${(amountCents / 100).toFixed(2)}/${billingInterval}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Tier:</td>
                          <td style="padding: 8px 0; color: #1a1a1a;">${tier}</td>
                        </tr>
                      </table>

                      <h3 style="margin-top: 20px;">Match Attempts (${matchResult.attempts.length} methods tried)</h3>
                      <ul style="background: #f9fafb; padding: 15px 15px 15px 35px; border-radius: 8px; margin: 10px 0;">
                        ${attemptsHtml}
                      </ul>

                      <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <a href="https://dashboard.stripe.com/customers/${customerId}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View Customer in Stripe</a>
                        <a href="https://tastelanc.com/admin/restaurants" style="background: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View Restaurants</a>
                      </div>

                      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                        Subscription ID: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${subscriptionId}</code>
                      </p>
                    </div>
                  `,
                });
                console.log('Unmatched subscription alert sent to admin');
              } catch (notifyError) {
                console.error('Failed to send unmatched subscription alert:', notifyError);
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0].price.id;

        console.log('Subscription deleted:', { customerId, priceId });

        if (isConsumerSubscription(priceId)) {
          // Consumer subscription canceled
          const { data: consumerSub } = await supabaseAdmin
            .from('consumer_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (consumerSub) {
            await supabaseAdmin
              .from('consumer_subscriptions')
              .update({
                status: 'canceled',
                stripe_subscription_id: null,
              })
              .eq('user_id', consumerSub.user_id);

            // Remove premium status
            await supabaseAdmin
              .from('profiles')
              .update({ is_premium: false })
              .eq('id', consumerSub.user_id);

            console.log(`Consumer subscription canceled for user ${consumerSub.user_id}`);
          }
        } else {
          // Restaurant subscription canceled - downgrade to basic tier
          const subscriptionId = subscription.id;

          // Get basic tier ID
          const { data: basicTier } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', 'basic')
            .single();

          if (basicTier) {
            // Find restaurant by stripe_subscription_id
            const { data: restaurant } = await supabaseAdmin
              .from('restaurants')
              .select('id, name')
              .eq('stripe_subscription_id', subscriptionId)
              .single();

            if (restaurant) {
              await supabaseAdmin
                .from('restaurants')
                .update({
                  tier_id: basicTier.id,
                  stripe_subscription_id: null,
                })
                .eq('id', restaurant.id);

              console.log(`Restaurant ${restaurant.name} downgraded to basic tier (subscription canceled)`);

              // Send admin notification about cancellation
              try {
                await resend.emails.send({
                  from: 'TasteLanc <hello@tastelanc.com>',
                  to: 'admin@tastelanc.com',
                  subject: `Subscription Canceled: ${restaurant.name}`,
                  html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Subscription Canceled</h2>
                      <p><strong>${restaurant.name}</strong> has been downgraded to the basic tier.</p>
                      <p>Stripe Customer: <a href="https://dashboard.stripe.com/customers/${customerId}">${customerId}</a></p>
                    </div>
                  `,
                });
              } catch (notifyError) {
                console.error('Failed to send cancellation notification:', notifyError);
              }
            }
          }

          // Track cancellation in sales order if this was a multi-restaurant order
          if (subscription.metadata?.multi_restaurant === 'true' && subscription.metadata?.sales_order_item_id) {
            await supabaseAdmin
              .from('sales_order_items')
              .update({ processing_status: 'canceled' })
              .eq('id', subscription.metadata.sales_order_item_id);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionData = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscriptionData === 'string'
          ? subscriptionData
          : subscriptionData?.id;

        if (subscriptionId) {
          // Update consumer subscription status to active
          await supabaseAdmin
            .from('consumer_subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subscriptionId);

          // Restaurant subscriptions: tier is updated via subscription.updated event
          // No separate status tracking needed

          console.log(`Payment succeeded for subscription ${subscriptionId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionData = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscriptionData === 'string'
          ? subscriptionData
          : subscriptionData?.id;

        if (subscriptionId) {
          // Mark consumer subscription as past due
          await supabaseAdmin
            .from('consumer_subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);

          // For restaurant subscriptions, send admin notification about failed payment
          const { data: restaurant } = await supabaseAdmin
            .from('restaurants')
            .select('id, name, owner_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (restaurant) {
            try {
              await resend.emails.send({
                from: 'TasteLanc <hello@tastelanc.com>',
                to: 'admin@tastelanc.com',
                subject: `Payment Failed: ${restaurant.name}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">Payment Failed</h2>
                    <p>A payment failed for <strong>${restaurant.name}</strong>.</p>
                    <p>The subscription is now past due. Stripe will retry the payment automatically.</p>
                    <p><a href="https://dashboard.stripe.com/subscriptions/${subscriptionId}">View in Stripe</a></p>
                  </div>
                `,
              });
            } catch (notifyError) {
              console.error('Failed to send payment failure notification:', notifyError);
            }
          }

          console.log(`Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
