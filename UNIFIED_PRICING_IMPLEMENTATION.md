# Unified Pricing Implementation - Complete Guide

**Date:** 2026-05-22
**Status:** ✅ CODE COMPLETE - Ready for Stripe Setup & Testing

---

## 🎯 Overview

Successfully merged all restaurant subscription tiers (Premium, Elite, Coffee Shop) into **one unified pricing plan**:

- **Monthly:** $99/month
- **Annual:** $899/year (saves $289 vs monthly)

All subscribers get complete Elite-level features. No tiers, no limitations.

---

## ✅ Changes Completed

### 1. Backend - Pricing Constants (`apps/web/lib/stripe.ts`)
- ✅ Added `UNIFIED_PRICE_IDS` for new $99/$899 pricing
- ✅ Added `UNIFIED_RESTAURANT_PRICE_IDS` array
- ✅ Added `ELITE_LEVEL_PRICE_IDS` (combines unified + legacy elite)
- ✅ Kept legacy price IDs for backward compatibility
- ✅ Deprecated `getDiscountPercent()` - now returns 0 (no multi-restaurant discounts)

### 2. Frontend - Subscription Page (`apps/web/app/(dashboard)/dashboard/subscription/page.tsx`)
- ✅ Simplified to show ONE unified tier only
- ✅ Removed 3-month and 6-month billing options
- ✅ Only shows Monthly ($99) and Annual ($899) options
- ✅ Updated feature list to show all Elite features
- ✅ Maps legacy tier names (premium/elite/coffee_shop) to unified tier in UI
- ✅ Basic (free) tier hidden but exists for admin assignment

### 3. API - Checkout Session (`apps/web/app/api/stripe/create-checkout-session/route.ts`)
- ✅ **CRITICAL:** Confirmed `mode: 'subscription'` creates recurring subscriptions
- ✅ Payment methods automatically saved for renewals
- ✅ Supports both unified and legacy price IDs
- ✅ Logs which pricing structure is being used (UNIFIED vs LEGACY)
- ✅ Tracks pricing structure in subscription metadata

### 4. API - Webhook Handler (`apps/web/app/api/stripe/webhook/route.ts`)
- ✅ Updated `getRestaurantTier()` function:
  - Unified price IDs → `'elite'` tier
  - Legacy Elite price IDs → `'elite'` tier (grandfathered)
  - Legacy Premium price IDs → `'premium'` tier (grandfathered)
  - Legacy Coffee Shop price IDs → `'coffee_shop'` tier (grandfathered)
- ✅ Logs pricing structure for debugging

### 5. Discount Removal
- ✅ `getDiscountPercent()` in `lib/stripe.ts` → returns 0
- ✅ `getDiscountPercent()` in `app/(sales)/sales/checkout/page.tsx` → returns 0
- ✅ `getDiscountPercent()` in `app/(admin)/admin/sales/page.tsx` → returns 0
- ✅ UI automatically hides discount sections when discount is 0

---

## 🔧 Required Stripe Setup

### Step 1: Create Unified Pricing Products in Stripe Dashboard

**You MUST create these prices in your Stripe account(s):**

#### For Lancaster, PA (Primary Market)
1. Go to: https://dashboard.stripe.com/products
2. Click **"+ Add product"**
3. Create product:
   - **Name:** TasteLanc Premium - Unified
   - **Description:** Complete platform access with all Elite features
   - **Pricing:** Recurring
   - **Billing period:** Monthly
   - **Price:** $99.00 USD
   - Click **Save product**
   - Copy the **Price ID** (starts with `price_...`)
   - Add to `.env.local`: `STRIPE_PRICE_UNIFIED_MONTHLY=price_...`

4. Add second price to same product:
   - Click **"Add another price"**
   - **Billing period:** Yearly
   - **Price:** $899.00 USD
   - Click **Save**
   - Copy the **Price ID**
   - Add to `.env.local`: `STRIPE_PRICE_UNIFIED_YEARLY=price_...`

#### For Cumberland County, PA (if applicable)
- Repeat the above steps in the Cumberland Stripe account
- Add to `.env.local`: `STRIPE_PRICE_UNIFIED_MONTHLY_CUMBERLAND=price_...`
- Add to `.env.local`: `STRIPE_PRICE_UNIFIED_YEARLY_CUMBERLAND=price_...`

#### For Fayetteville, NC (if applicable)
- Repeat the above steps in the Fayetteville Stripe account
- Add to `.env.local`: `STRIPE_PRICE_UNIFIED_MONTHLY_FAYETTEVILLE=price_...`
- Add to `.env.local`: `STRIPE_PRICE_UNIFIED_YEARLY_FAYETTEVILLE=price_...`

---

## 📝 Environment Variables

### Required: Add to `apps/web/.env.local`

```bash
# NEW UNIFIED PRICING - REQUIRED
STRIPE_PRICE_UNIFIED_MONTHLY=price_XXXXXXXXXXXXXXXXXX  # $99/month
STRIPE_PRICE_UNIFIED_YEARLY=price_XXXXXXXXXXXXXXXXXX   # $899/year

# LEGACY PRICING - Keep for existing subscriptions (do not remove)
STRIPE_PRICE_PREMIUM_MONTHLY=price_existing_value
STRIPE_PRICE_PREMIUM_3MO=price_existing_value
STRIPE_PRICE_PREMIUM_6MO=price_existing_value
STRIPE_PRICE_PREMIUM_YEARLY=price_existing_value
STRIPE_PRICE_ELITE_MONTHLY=price_existing_value
STRIPE_PRICE_ELITE_3MO=price_existing_value
STRIPE_PRICE_ELITE_6MO=price_existing_value
STRIPE_PRICE_ELITE_YEARLY=price_existing_value
STRIPE_PRICE_COFFEE_SHOP_MONTHLY=price_existing_value
```

---

## 🧪 Testing Checklist

### CRITICAL: Test Recurring Subscriptions

**⚠️ You previously had issues with non-recurring subscriptions causing churn. Verify this is working correctly.**

#### Test 1: New Subscription Signup
1. Log into a restaurant dashboard (or create a test restaurant)
2. Go to **Dashboard → Subscription**
3. Verify:
   - ✅ Only ONE tier is visible: "TasteLanc Premium"
   - ✅ Only TWO billing options: "Pay Monthly" and "Pay Yearly"
   - ✅ Prices show: $99/month or $899/year
   - ✅ Feature list shows all Elite features
4. Click **"Get Started"** or **"Upgrade to TasteLanc Premium"**
5. Complete Stripe Checkout with test card: `4242 4242 4242 4242`
6. After checkout success, verify in **Stripe Dashboard**:
   - ✅ Subscription is **active**
   - ✅ Subscription is set to **auto-renew** (not manual)
   - ✅ Payment method is **saved** on the customer
   - ✅ Next billing date is shown
7. In TasteLanc dashboard, verify:
   - ✅ Restaurant tier changed to `elite` in database
   - ✅ Subscription page shows "Current Plan" badge
   - ✅ "Manage Billing" button appears

#### Test 2: Verify in Stripe Dashboard
1. Go to: https://dashboard.stripe.com/subscriptions
2. Find the test subscription
3. Verify:
   - ✅ **Status:** Active
   - ✅ **Schedule:** Shows next billing date
   - ✅ **Payment method:** Card ending in 4242 is saved
   - ✅ **Metadata:** Contains `pricing_structure: unified`
   - ✅ **Metadata:** Contains correct `restaurant_id` and `user_id`

#### Test 3: Test Annual Subscription
1. Repeat Test 1 but select **"Pay Yearly"** option
2. Verify price is $899
3. Verify "Save $289" badge appears
4. Complete checkout
5. Verify in Stripe Dashboard:
   - ✅ Billing period is **yearly**
   - ✅ Next billing date is 1 year from now

#### Test 4: Existing Customer (Grandfathering)
1. Find a restaurant with existing Premium/Elite/Coffee Shop subscription
2. Go to their subscription page
3. Verify:
   - ✅ They still see their current tier in "Current Plan" banner
   - ✅ When they view pricing, it maps to "unified" tier
   - ✅ Their subscription continues uninterrupted
4. Check Stripe Dashboard:
   - ✅ Their old subscription is still active
   - ✅ Still on old price (e.g., $149/month for Elite)
   - ✅ Will continue until they manually change or it renews

#### Test 5: Manual Billing Management
1. From subscription page, click **"Manage Billing"**
2. Verify Stripe Customer Portal opens
3. Verify customer can:
   - ✅ Update payment method
   - ✅ View invoices
   - ✅ Cancel subscription
   - ✅ Change billing details

---

## 📊 Database Tier Mapping

After unified pricing rollout:

| Old Tier | Old Price | New Tier | New Price | Status |
|----------|-----------|----------|-----------|--------|
| Basic | Free | `basic` | Free | Hidden from UI, admin-assigned only |
| Premium | $99-$800 | `elite` (via unified) | $99/month or $899/year | New subscriptions only |
| Elite | $149-$1,100 | `elite` (via unified) | $99/month or $899/year | New subscriptions only |
| Coffee Shop | $49/month | `elite` (via unified) | $99/month or $899/year | New subscriptions only |

### Grandfathered Subscriptions

Existing subscriptions stay on their current tier until:
1. They manually upgrade/change plans
2. Their subscription naturally renews (handled by webhook)

The webhook will:
- ✅ Keep existing customers on current tier
- ✅ Auto-assign new subscriptions to `elite` tier
- ✅ Log which pricing structure is being used

---

## 🎬 Go-Live Steps

### 1. Deploy Code Changes
```bash
cd /Users/leandertoney/tastelanc
git add -A
git commit -m "Implement unified $99/$899 pricing - single tier with all Elite features

- Add UNIFIED_PRICE_IDS for new pricing structure
- Update subscription page to show single unified tier
- Update checkout session API to support unified pricing
- Update webhook to assign elite tier for unified subscriptions
- Remove multi-restaurant discount logic (now returns 0)
- Grandfather existing subscriptions on legacy pricing
- Ensure recurring subscriptions with saved payment methods"

# DO NOT PUSH YET - wait for Stripe setup
```

### 2. Set Up Stripe Products
- Follow "Required Stripe Setup" section above
- Create products in all market Stripe accounts
- Copy price IDs to `.env.local`
- Restart Next.js dev server to load new env vars

### 3. Test Thoroughly
- Complete all tests in "Testing Checklist" above
- Test in all markets (Lancaster, Cumberland, Fayetteville)
- **CRITICAL:** Verify subscriptions are recurring in Stripe Dashboard

### 4. Deploy to Production
```bash
# Add environment variables to Netlify
# Go to: Netlify Dashboard → Site settings → Environment variables
# Add: STRIPE_PRICE_UNIFIED_MONTHLY and STRIPE_PRICE_UNIFIED_YEARLY

# Push to production
git push origin main

# Monitor Netlify deploy logs
```

### 5. Monitor Post-Launch
- Check webhook logs for any errors
- Verify new signups are assigned `elite` tier
- Confirm subscriptions are recurring properly
- Monitor admin email alerts for unmatched subscriptions

---

## 🚨 Troubleshooting

### Issue: "Invalid price selection" error
**Cause:** Environment variables not set or Stripe price IDs incorrect
**Fix:**
1. Verify price IDs in `.env.local` match Stripe Dashboard
2. Restart Next.js server: `npm run dev`
3. Check server logs for errors

### Issue: Subscription not recurring
**Cause:** Checkout session mode is not `'subscription'`
**Fix:** This should NOT happen with current code. Check:
1. Verify `apps/web/app/api/stripe/create-checkout-session/route.ts` line 162: `mode: 'subscription'`
2. Check Stripe Dashboard → Subscription → verify "Status: Active" and next billing date shown

### Issue: Customer still sees old tiers
**Cause:** Frontend not mapping legacy tier to unified
**Fix:** Check `mapLegacyTier()` function in subscription page - should map premium/elite/coffee_shop → unified

### Issue: Webhook assigns wrong tier
**Cause:** Price ID not recognized
**Fix:**
1. Check webhook logs: `npx netlify functions:log webhook`
2. Verify price ID is in `UNIFIED_RESTAURANT_PRICE_IDS` constant
3. Check `getRestaurantTier()` function logic

---

## 📧 Customer Communication

### For Existing Customers

**Elite customers (price DECREASE):**
> "Great news! We've simplified our pricing. When your subscription renews, you'll automatically move to our new unified plan at $99/month (previously $149) or $899/year (previously $1,100). All your Elite features remain the same."

**Coffee Shop customers (price INCREASE):**
> "We're updating our pricing to provide you with even more features. Starting with your next renewal, our unified plan will be $99/month (previously $49) and will include all Premium and Elite features: advanced analytics, social media content, event spotlights, and more."

**Premium customers (no change):**
> "We've simplified our pricing! Our new unified plan is $99/month or $899/year and includes all the Elite features you've been asking for. Your price stays the same, but you get even more value."

---

## 🎉 Summary

### What Changed
- ✅ Single unified tier: $99/month or $899/year
- ✅ All subscribers get Elite-level features
- ✅ No multi-restaurant discounts
- ✅ Recurring subscriptions with auto-renewal
- ✅ Payment methods automatically saved
- ✅ Existing customers grandfathered until renewal
- ✅ Free Basic tier hidden but exists for admin assignment

### What Stayed the Same
- ✅ Stripe integration
- ✅ Webhook handling
- ✅ Customer portal for billing management
- ✅ Admin sales tools
- ✅ Multi-market support
- ✅ Consumer subscriptions (mobile app) unchanged
- ✅ Self-promoter subscriptions unchanged

### Key Files Modified
1. `apps/web/lib/stripe.ts` - Pricing constants
2. `apps/web/app/(dashboard)/dashboard/subscription/page.tsx` - UI
3. `apps/web/app/api/stripe/create-checkout-session/route.ts` - Checkout
4. `apps/web/app/api/stripe/webhook/route.ts` - Webhook tier assignment
5. `apps/web/app/(sales)/sales/checkout/page.tsx` - Sales discount
6. `apps/web/app/(admin)/admin/sales/page.tsx` - Admin sales discount

---

## 🆘 Support

If you encounter issues:
1. Check Netlify function logs: `npx netlify functions:log`
2. Check Stripe Dashboard webhook logs: https://dashboard.stripe.com/webhooks
3. Check server console logs during checkout
4. Review this document's troubleshooting section

**Questions?** Review the implementation or contact the development team.

---

**✅ Implementation Status: COMPLETE - Ready for Testing**
