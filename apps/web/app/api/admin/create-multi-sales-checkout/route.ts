import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  getStripe,
  RESTAURANT_PRICE_IDS,
  RESTAURANT_PRICES,
  DURATION_LABELS,
  getDiscountPercent,
} from '@/lib/stripe';
import { Resend } from 'resend';
import crypto from 'crypto';

interface CheckoutItem {
  restaurantId: string | null;
  restaurantName: string;
  isNewRestaurant: boolean;
  plan: 'premium' | 'elite';
  duration: '3mo' | '6mo' | 'yearly';
}

interface CreatedSubscription {
  restaurantName: string;
  subscriptionId: string;
  priceId: string;
  amount: number;
  discountedAmount: number;
}

const resend = new Resend(process.env.RESEND_API_KEY);

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPriceId(plan: string, duration: string): string | null {
  const key = `${plan}_${duration}` as keyof typeof RESTAURANT_PRICE_IDS;
  return RESTAURANT_PRICE_IDS[key] || null;
}

/**
 * Generate a secure setup token for password setup
 */
async function generateSetupToken(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  email: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabaseAdmin.from('password_setup_tokens').insert({
    user_id: userId,
    email,
    token,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

/**
 * Find or create a user account for the restaurant owner
 */
async function findOrCreateUser(
  email: string,
  contactName: string,
  businessNames: string[],
  phone: string,
  stripeCustomerId: string,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
): Promise<string | null> {
  // Check if user already exists by email in profiles table
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    console.log(`Found existing user in profiles: ${existingUser.id}`);
    return existingUser.id;
  }

  const displayName = contactName || businessNames[0] || 'Restaurant Owner';

  // Try to create new user account via Supabase Auth
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

  let userId: string | null = null;

  if (createError) {
    // Check if user already exists in Auth
    if (createError.message?.includes('already been registered') ||
        createError.message?.includes('already exists') ||
        createError.message?.includes('duplicate key')) {
      // User exists in Auth - query auth.users table directly
      const { data: existingAuthUser } = await supabaseAdmin
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(`Found existing user in Auth: ${userId}`);
      } else {
        // Fallback: try paginated listUsers as last resort
        for (let page = 1; page <= 10; page++) {
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 1000,
          });
          const user = authUsers?.users?.find(u => u.email === email);
          if (user) {
            userId = user.id;
            console.log(`Found existing user in Auth (page ${page}): ${userId}`);
            break;
          }
          if (!authUsers?.users?.length || authUsers.users.length < 1000) {
            break;
          }
        }
      }

      if (!userId) {
        console.error('User exists but could not be found:', email);
        return null;
      }
    } else {
      console.error('Failed to create user:', createError);
      return null;
    }
  } else if (newUser?.user) {
    userId = newUser.user.id;
    console.log(`Created new user: ${userId}`);
  } else {
    console.error('Failed to create user: no user returned');
    return null;
  }

  // Safety check - should never happen due to returns above
  if (!userId) {
    console.error('Failed to create user: userId not set');
    return null;
  }

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

  // Generate password setup token and send welcome email
  const setupToken = await generateSetupToken(supabaseAdmin, userId, email);
  const setupLink = `https://tastelanc.com/setup-account?token=${setupToken}`;
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

  return userId;
}

/**
 * Creates or retrieves a Stripe coupon for bulk discounts.
 * Coupons are reusable and named by percentage.
 */
async function getOrCreateBulkCoupon(discountPercent: number): Promise<string | null> {
  if (discountPercent <= 0) return null;

  const stripe = getStripe();
  const couponId = `BULK_${discountPercent}PCT`;

  try {
    // Try to retrieve existing coupon
    const existingCoupon = await stripe.coupons.retrieve(couponId);
    return existingCoupon.id;
  } catch {
    // Coupon doesn't exist, create it
    const coupon = await stripe.coupons.create({
      id: couponId,
      percent_off: discountPercent,
      duration: 'forever', // Applies to all billing cycles
      name: `${discountPercent}% Multi-Location Discount`,
    });
    return coupon.id;
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin is making this request
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, contactName, phone, items } = body as {
      email: string;
      contactName?: string;
      phone?: string;
      items: CheckoutItem[];
    };

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one restaurant is required' }, { status: 400 });
    }

    if (items.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 restaurants per order' }, { status: 400 });
    }

    // Validate each item and get price details
    const itemsWithPrices = items.map((item, index) => {
      if (!item.restaurantName) {
        throw new Error(`Item ${index + 1}: Restaurant name is required`);
      }
      if (!['premium', 'elite'].includes(item.plan)) {
        throw new Error(`Item ${index + 1}: Invalid plan "${item.plan}"`);
      }
      if (!['3mo', '6mo', 'yearly'].includes(item.duration)) {
        throw new Error(`Item ${index + 1}: Invalid duration "${item.duration}"`);
      }

      const priceId = getPriceId(item.plan, item.duration);
      if (!priceId) {
        throw new Error(`Item ${index + 1}: Invalid plan/duration combination`);
      }

      const prices = RESTAURANT_PRICES[item.plan as keyof typeof RESTAURANT_PRICES];
      const priceDollars = prices[item.duration as keyof typeof prices];
      const priceCents = priceDollars * 100;

      return { ...item, priceCents, priceId, priceDollars };
    });

    // Calculate totals
    const subtotalCents = itemsWithPrices.reduce((sum, item) => sum + item.priceCents, 0);
    const discountPercent = getDiscountPercent(items.length);
    const discountAmountCents = Math.round(subtotalCents * discountPercent / 100);
    const totalCents = subtotalCents - discountAmountCents;

    const stripe = getStripe();

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      // Update customer info if needed
      await stripe.customers.update(customerId, {
        name: contactName || existingCustomers.data[0].name || items[0].restaurantName,
        phone: phone || existingCustomers.data[0].phone || undefined,
        metadata: {
          ...existingCustomers.data[0].metadata,
          contact_name: contactName || existingCustomers.data[0].metadata?.contact_name || '',
          updated_by_admin: user.id,
        },
      });
    } else {
      const customer = await stripe.customers.create({
        email,
        name: contactName || items[0].restaurantName,
        phone: phone || undefined,
        metadata: {
          contact_name: contactName || '',
          created_by_admin: user.id,
        },
      });
      customerId = customer.id;
    }

    // Get or create bulk discount coupon
    const couponId = await getOrCreateBulkCoupon(discountPercent);

    const supabaseAdmin = getSupabaseAdmin();

    // Find or create user account
    const businessNames = itemsWithPrices.map(item => item.restaurantName);
    // Try to find or create user account (non-blocking - sale proceeds even if this fails)
    let userId: string | null = null;
    try {
      userId = await findOrCreateUser(
        email,
        contactName || '',
        businessNames,
        phone || '',
        customerId,
        supabaseAdmin
      );
      if (!userId) {
        console.warn('Could not create user account, proceeding with sale anyway');
      }
    } catch (userError) {
      console.error('Error creating user account:', userError);
      // Continue with the sale - user account can be created later
    }

    // Check if customer has a payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      // No payment method - return error with instructions
      return NextResponse.json({
        error: 'Customer has no payment method on file',
        details: 'Please add a payment method in Stripe Dashboard before creating subscriptions, or use the checkout flow for new customers.',
        customerId,
        stripeLink: `https://dashboard.stripe.com/customers/${customerId}`,
      }, { status: 400 });
    }

    // Insert sales order into database

    const { data: salesOrder, error: orderError } = await supabaseAdmin
      .from('sales_orders')
      .insert({
        customer_email: email,
        customer_name: contactName || null,
        customer_phone: phone || null,
        stripe_customer_id: customerId,
        restaurant_count: items.length,
        discount_percent: discountPercent,
        subtotal_cents: subtotalCents,
        discount_amount_cents: discountAmountCents,
        total_cents: totalCents,
        created_by_admin: user.id,
        status: 'processing', // Will be updated to 'completed' after subscriptions created
      })
      .select('id')
      .single();

    if (orderError || !salesOrder) {
      console.error('Failed to create sales order:', orderError);
      return NextResponse.json({ error: 'Failed to create sales order' }, { status: 500 });
    }

    // Get tier IDs
    const { data: tiers } = await supabaseAdmin
      .from('tiers')
      .select('id, name');

    const tierMap = new Map(tiers?.map(t => [t.name, t.id]) || []);

    // Create subscriptions for each restaurant
    const createdSubscriptions: CreatedSubscription[] = [];
    const errors: string[] = [];

    for (const item of itemsWithPrices) {
      try {
        // Determine the restaurant ID - create new restaurant if needed
        let linkedRestaurantId = item.restaurantId;

        if (item.isNewRestaurant || !item.restaurantId) {
          // Create new restaurant
          const slug = item.restaurantName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          const { data: newRestaurant, error: restaurantError } = await supabaseAdmin
            .from('restaurants')
            .insert({
              name: item.restaurantName,
              slug: `${slug}-${Date.now().toString(36)}`,
              owner_id: userId,
              phone: phone || null,
              email,
              is_active: true,
              is_verified: false,
              city: 'Lancaster',
              state: 'PA',
            })
            .select('id')
            .single();

          if (restaurantError || !newRestaurant) {
            throw new Error(`Failed to create restaurant: ${restaurantError?.message || 'Unknown error'}`);
          }

          linkedRestaurantId = newRestaurant.id;
          console.log(`Created new restaurant: ${linkedRestaurantId} (${item.restaurantName})`);
        } else if (userId) {
          // Link existing restaurant to user if not already owned
          await supabaseAdmin
            .from('restaurants')
            .update({ owner_id: userId })
            .eq('id', item.restaurantId)
            .is('owner_id', null); // Only update if not already owned
        }

        // Create subscription with immediate billing (no trial)
        const subscriptionParams: Stripe.SubscriptionCreateParams = {
          customer: customerId,
          items: [{ price: item.priceId }],
          metadata: {
            subscription_type: 'restaurant',
            admin_sale: 'true',
            sales_order_id: salesOrder.id,
            restaurant_name: item.restaurantName,
            restaurant_id: linkedRestaurantId || '',
            is_new_restaurant: String(item.isNewRestaurant),
            plan: item.plan,
            duration: item.duration,
            created_by_admin: user.id,
          },
          // Bill immediately - no trial period
          collection_method: 'charge_automatically',
          payment_behavior: 'error_if_incomplete',
          // Apply discount coupon if multi-restaurant
          discounts: couponId ? [{ coupon: couponId }] : undefined,
        };

        const subscription = await stripe.subscriptions.create(subscriptionParams);

        // Calculate discounted amount
        const discountedCents = item.priceCents - Math.round(item.priceCents * discountPercent / 100);

        createdSubscriptions.push({
          restaurantName: item.restaurantName,
          subscriptionId: subscription.id,
          priceId: item.priceId,
          amount: item.priceDollars,
          discountedAmount: discountedCents / 100,
        });

        // Update restaurant with tier and subscription
        if (linkedRestaurantId) {
          const tierId = tierMap.get(item.plan);
          if (tierId) {
            await supabaseAdmin
              .from('restaurants')
              .update({
                tier_id: tierId,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: customerId,
              })
              .eq('id', linkedRestaurantId);
          }
        }

        // Insert sales order item with subscription ID
        await supabaseAdmin
          .from('sales_order_items')
          .insert({
            sales_order_id: salesOrder.id,
            restaurant_id: linkedRestaurantId || null,
            restaurant_name: item.restaurantName,
            is_new_restaurant: item.isNewRestaurant,
            plan: item.plan,
            duration: item.duration,
            price_cents: item.priceCents,
            discounted_price_cents: discountedCents,
            stripe_subscription_id: subscription.id,
            linked_restaurant_id: linkedRestaurantId || null,
            processing_status: 'subscription_created',
          });

      } catch (subError) {
        const message = subError instanceof Error ? subError.message : 'Unknown error';
        errors.push(`${item.restaurantName}: ${message}`);
        console.error(`Failed to create subscription for ${item.restaurantName}:`, subError);
      }
    }

    // Update sales order status
    if (createdSubscriptions.length === items.length) {
      await supabaseAdmin
        .from('sales_orders')
        .update({ status: 'completed' })
        .eq('id', salesOrder.id);
    } else if (createdSubscriptions.length > 0) {
      await supabaseAdmin
        .from('sales_orders')
        .update({ status: 'partial', notes: errors.join('; ') })
        .eq('id', salesOrder.id);
    } else {
      await supabaseAdmin
        .from('sales_orders')
        .update({ status: 'failed', notes: errors.join('; ') })
        .eq('id', salesOrder.id);
    }

    // Return result
    if (errors.length > 0 && createdSubscriptions.length === 0) {
      return NextResponse.json({
        error: 'Failed to create any subscriptions',
        details: errors,
      }, { status: 500 });
    }

    // Send admin notification email
    if (createdSubscriptions.length > 0) {
      try {
        const restaurantList = createdSubscriptions.map(s => {
          const item = itemsWithPrices.find(i => i.restaurantName === s.restaurantName);
          const plan = item?.plan || 'premium';
          const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
          const durationLabel = DURATION_LABELS[item?.duration || 'yearly'];
          return `${s.restaurantName} (${planName} - ${durationLabel}) - $${s.discountedAmount.toFixed(2)}`;
        }).join('<br/>');

        await resend.emails.send({
          from: 'TasteLanc <hello@tastelanc.com>',
          to: 'admin@tastelanc.com',
          subject: `Multi-Restaurant Sale: ${createdSubscriptions.length} subscriptions - $${(totalCents / 100).toFixed(2)}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">Multi-Restaurant Sale Complete</h2>

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
                  <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${discountPercent}% off${couponId ? ` (Coupon: ${couponId})` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Subtotal:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;">$${(subtotalCents / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Total Charged:</td>
                  <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">$${(totalCents / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                  <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">✅ Active subscriptions created - immediate billing</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Stripe Customer:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;"><a href="https://dashboard.stripe.com/customers/${customerId}" style="color: #3b82f6;">${customerId}</a></td>
                </tr>
              </table>

              ${errors.length > 0 ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; margin-top: 15px;">
                  <strong style="color: #dc2626;">Some items failed:</strong>
                  <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    ${errors.map(e => `<li style="color: #991b1b;">${e}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Welcome email has been sent to the customer with account setup instructions.
              </p>
            </div>
          `,
        });
        console.log('Admin notification sent for multi-restaurant sale');
      } catch (notifyError) {
        console.error('Failed to send admin notification:', notifyError);
      }
    }

    return NextResponse.json({
      success: true,
      salesOrderId: salesOrder.id,
      subscriptions: createdSubscriptions,
      subtotal: subtotalCents / 100,
      discountPercent,
      discountAmount: discountAmountCents / 100,
      total: totalCents / 100,
      couponApplied: couponId || null,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `Created ${createdSubscriptions.length}/${items.length} subscriptions. Some failed.`
        : `Successfully created ${createdSubscriptions.length} subscription(s) with immediate billing.`,
    });
  } catch (error) {
    console.error('Error creating multi-restaurant subscriptions:', error);
    const message = error instanceof Error ? error.message : 'Failed to create subscriptions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
