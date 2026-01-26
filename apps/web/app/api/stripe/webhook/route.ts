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
  DURATION_TO_INTERVAL,
} from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type Stripe from 'stripe';

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
async function findOrCreateUser(
  email: string,
  contactName: string,
  businessNames: string[],
  phone: string,
  stripeCustomerId: string,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
): Promise<string | null> {
  // Check if user already exists by email
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    console.log(`Found existing user: ${existingUser.id}`);
    return existingUser.id;
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
    return null;
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

  // Generate password setup link and send welcome email via Resend
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: 'https://tastelanc.com/owner/dashboard',
    },
  });

  if (linkData?.properties?.action_link) {
    const setupLink = linkData.properties.action_link;
    const businessNamesList = businessNames.length > 1
      ? businessNames.slice(0, -1).join(', ') + ' and ' + businessNames[businessNames.length - 1]
      : businessNames[0];

    await resend.emails.send({
      from: 'TasteLanc <hello@tastelanc.com>',
      to: email,
      subject: `Welcome to TasteLanc! Set Up Your Account`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">Welcome to TasteLanc!</h1>
          </div>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi${contactName ? ` ${contactName.split(' ')[0]}` : ''},</p>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Thank you for joining TasteLanc! Your account for <strong>${businessNamesList}</strong> is ready.
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
            Once you're set up, you can manage your restaurant profiles, update hours, add specials, and more.
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
    console.log(`Welcome email sent to ${email}`);
  } else {
    console.error('Failed to generate setup link:', linkError);
  }

  return userId;
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

  // Find or create user account
  const businessNames = orderItems.map((item: { restaurant_name: string }) => item.restaurant_name);
  const userId = await findOrCreateUser(email, contactName, businessNames, phone, customerId, supabaseAdmin);

  if (!userId) {
    await supabaseAdmin
      .from('sales_orders')
      .update({ status: 'failed' })
      .eq('id', salesOrderId);
    console.error('Failed to find or create user for multi-restaurant checkout');
    return;
  }

  // Process each order item
  let allSucceeded = true;
  for (const item of orderItems) {
    try {
      // Link or create restaurant
      let linkedRestaurantId: string;

      if (item.restaurant_id && !item.is_new_restaurant) {
        // Link existing restaurant to user
        await supabaseAdmin
          .from('restaurants')
          .update({ owner_id: userId })
          .eq('id', item.restaurant_id);
        linkedRestaurantId = item.restaurant_id;
        console.log(`Linked restaurant ${item.restaurant_id} to user ${userId}`);
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
            email,
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

      // Create individual Stripe subscription with trial_end
      const priceId = getPriceId(item.plan, item.duration);
      if (!priceId) {
        throw new Error(`Invalid plan/duration: ${item.plan}/${item.duration}`);
      }

      const intervalInfo = DURATION_TO_INTERVAL[item.duration];

      // Calculate trial_end to skip the first billing period (already paid)
      const now = new Date();
      let trialEnd: Date;
      if (intervalInfo.interval === 'year') {
        trialEnd = new Date(now.getFullYear() + intervalInfo.interval_count, now.getMonth(), now.getDate());
      } else {
        trialEnd = new Date(now.getFullYear(), now.getMonth() + intervalInfo.interval_count, now.getDate());
      }

      const subParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        trial_end: Math.floor(trialEnd.getTime() / 1000),
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

          // Step 1: Find or create user account
          let userId: string | null = null;

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

            // Generate password setup link and send welcome email via Resend
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email,
              options: {
                redirectTo: 'https://tastelanc.com/owner/dashboard',
              },
            });

            if (linkData?.properties?.action_link) {
              const setupLink = linkData.properties.action_link;

              // Send welcome email with setup link via Resend
              await resend.emails.send({
                from: 'TasteLanc <hello@tastelanc.com>',
                to: email,
                subject: `Welcome to TasteLanc! Set Up Your ${businessName} Account`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">Welcome to TasteLanc!</h1>
                    </div>

                    <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi${contactName ? ` ${contactName.split(' ')[0]}` : ''},</p>

                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                      Thank you for joining TasteLanc! Your account for <strong>${businessName}</strong> is ready.
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
                      Once you're set up, you can manage your restaurant's profile, update your hours, add specials, and more.
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
              console.log(`Welcome email sent to ${email}`);
            } else {
              console.error('Failed to generate setup link:', linkError);
            }
          }

          // Step 2: Link or create restaurant
          let linkedRestaurantId = restaurantId;

          if (restaurantId) {
            // Link existing restaurant to user
            await supabaseAdmin
              .from('restaurants')
              .update({ owner_id: userId })
              .eq('id', restaurantId);
            console.log(`Linked restaurant ${restaurantId} to user ${userId}`);
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
                email,
                is_active: true,
                is_verified: false,
                city: 'Lancaster',
                state: 'PA',
              })
              .select('id')
              .single();

            if (newRestaurant) {
              linkedRestaurantId = newRestaurant.id;
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

          // Get tier ID from database
          const { data: tierData } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', tier)
            .single();

          if (tierData) {
            // Find restaurant owned by this user and update its tier
            const { data: restaurant } = await supabaseAdmin
              .from('restaurants')
              .select('id')
              .eq('owner_id', userId)
              .single();

            if (restaurant) {
              await supabaseAdmin
                .from('restaurants')
                .update({
                  tier_id: tierData.id,
                  stripe_subscription_id: subscriptionId,
                })
                .eq('id', restaurant.id);

              console.log(`Restaurant ${restaurant.id} upgraded to ${tier} tier`);
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

        console.log('Subscription updated:', { customerId, priceId, status: subscription.status });

        if (isConsumerSubscription(priceId)) {
          // Consumer subscription update
          const { data: consumerSub } = await supabaseAdmin
            .from('consumer_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (consumerSub) {
            const billingPeriod = getConsumerBillingPeriod(priceId);

            await supabaseAdmin
              .from('consumer_subscriptions')
              .update({
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
              .update({ is_premium: subscription.status === 'active' || subscription.status === 'trialing' })
              .eq('id', consumerSub.user_id);
          }
        } else {
          // Restaurant subscription update - find restaurant by subscription ID
          const subscriptionId = subscription.id;
          const tier = getRestaurantTier(priceId);

          const { data: tierData } = await supabaseAdmin
            .from('tiers')
            .select('id')
            .eq('name', tier)
            .single();

          if (tierData) {
            // Find restaurant by stripe_subscription_id and update tier
            const { data: restaurant, error: findError } = await supabaseAdmin
              .from('restaurants')
              .select('id')
              .eq('stripe_subscription_id', subscriptionId)
              .single();

            if (restaurant) {
              await supabaseAdmin
                .from('restaurants')
                .update({ tier_id: tierData.id })
                .eq('id', restaurant.id);

              console.log(`Restaurant ${restaurant.id} tier updated to ${tier}`);
            } else {
              // Fallback: try to find by customer ID through profile
              const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('stripe_customer_id', customerId)
                .single();

              if (profile) {
                const { data: ownerRestaurant } = await supabaseAdmin
                  .from('restaurants')
                  .select('id')
                  .eq('owner_id', profile.id)
                  .single();

                if (ownerRestaurant) {
                  await supabaseAdmin
                    .from('restaurants')
                    .update({
                      tier_id: tierData.id,
                      stripe_subscription_id: subscriptionId,
                    })
                    .eq('id', ownerRestaurant.id);

                  console.log(`Restaurant ${ownerRestaurant.id} tier updated to ${tier} (linked subscription)`);
                }
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
