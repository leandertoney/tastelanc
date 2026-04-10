#!/usr/bin/env node
/**
 * App Store Connect — Create subscription products and lifetime IAP
 * for all 3 TasteLanc apps via the ASC REST API.
 *
 * Usage: node scripts/setup-asc-products.mjs
 *
 * Prerequisites:
 *   - ASC API key file at ~/Downloads/AuthKey_KNJL5W6X3H.p8
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { homedir } from 'os';

// ─── Config ──────────────────────────────────────────────────────────
const KEY_ID = 'KNJL5W6X3H';
const ISSUER_ID = '84a11314-5e2f-4713-b454-1f9eeaf1458c';
const KEY_PATH = `${homedir()}/Downloads/AuthKey_KNJL5W6X3H.p8`;
const BASE_URL = 'https://api.appstoreconnect.apple.com';

// App Store Connect App IDs
const APPS = [
  { name: 'TasteLanc',         ascAppId: '6755852717', prefix: 'tastelanc' },
  { name: 'TasteCumberland',   ascAppId: '6759233248', prefix: 'tastecumberland' },
  { name: 'TasteFayetteville', ascAppId: '6760276128', prefix: 'tastefayetteville' },
];

// Products to create per app
const PRODUCTS = [
  { suffix: 'monthly',  type: 'AUTO_RENEWABLE', displayName: 'Monthly Premium',  duration: 'ONE_MONTH' },
  { suffix: 'annual',   type: 'AUTO_RENEWABLE', displayName: 'Annual Premium',   duration: 'ONE_YEAR' },
  { suffix: 'lifetime', type: 'NON_CONSUMABLE', displayName: 'Lifetime Premium', duration: null },
];

// ─── JWT Generation (ES256) ──────────────────────────────────────────
function generateJWT() {
  const privateKey = readFileSync(KEY_PATH, 'utf8');
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT',
  };

  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: 'appstoreconnect-v1',
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = createSign('SHA256');
  sign.update(signingInput);
  const derSig = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  const sigB64 = Buffer.from(derSig).toString('base64url');

  return `${signingInput}.${sigB64}`;
}

// ─── API Helpers ─────────────────────────────────────────────────────
let token = generateJWT();

async function ascFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Token might have expired — regenerate
    token = generateJWT();
    const retry = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return retry;
  }

  return res;
}

async function ascPost(path, body) {
  const res = await ascFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    // Check if it's a "already exists" error (409 Conflict)
    if (res.status === 409) {
      return { alreadyExists: true, status: res.status, data };
    }
    return { error: true, status: res.status, data };
  }

  return { success: true, status: res.status, data };
}

async function ascGet(path) {
  const res = await ascFetch(path);
  const data = await res.json();
  return data;
}

// ─── Step 1: Create Subscription Groups ──────────────────────────────
async function createSubscriptionGroup(appId, groupName) {
  console.log(`  Creating subscription group "${groupName}"...`);

  const result = await ascPost('/v1/subscriptionGroups', {
    data: {
      type: 'subscriptionGroups',
      attributes: {
        referenceName: groupName,
      },
      relationships: {
        app: {
          data: { type: 'apps', id: appId },
        },
      },
    },
  });

  if (result.alreadyExists) {
    console.log(`    -> Group already exists, finding it...`);
    // List existing groups to find the ID
    const groups = await ascGet(`/v1/apps/${appId}/subscriptionGroups`);
    const existing = groups.data?.find(g => g.attributes?.referenceName === groupName);
    if (existing) {
      console.log(`    -> Found existing group: ${existing.id}`);
      return existing.id;
    }
    console.log(`    -> Could not find existing group, listing all:`);
    console.log(`    -> ${JSON.stringify(groups.data?.map(g => ({ id: g.id, name: g.attributes?.referenceName })))}`);
    return null;
  }

  if (result.error) {
    console.log(`    -> ERROR ${result.status}: ${JSON.stringify(result.data)}`);
    return null;
  }

  const groupId = result.data.data.id;
  console.log(`    -> Created: ${groupId}`);
  return groupId;
}

// ─── Step 2: Create Auto-Renewable Subscriptions ─────────────────────
async function createSubscription(groupId, productId, displayName, duration) {
  console.log(`  Creating subscription "${productId}" (${duration})...`);

  const result = await ascPost('/v1/subscriptions', {
    data: {
      type: 'subscriptions',
      attributes: {
        name: displayName,
        productId: productId,
        subscriptionPeriod: duration,
        reviewNote: `${displayName} subscription for restaurant discovery app`,
        familySharable: false,
      },
      relationships: {
        group: {
          data: { type: 'subscriptionGroups', id: groupId },
        },
      },
    },
  });

  if (result.alreadyExists) {
    console.log(`    -> Already exists (409)`);
    return 'existing';
  }

  if (result.error) {
    console.log(`    -> ERROR ${result.status}: ${JSON.stringify(result.data)}`);
    return null;
  }

  const subId = result.data.data.id;
  console.log(`    -> Created: ${subId}`);
  return subId;
}

// ─── Step 3: Create Non-Consumable IAP (Lifetime) ────────────────────
async function createNonConsumableIAP(appId, productId, displayName) {
  console.log(`  Creating non-consumable IAP "${productId}"...`);

  const result = await ascPost('/v2/inAppPurchases', {
    data: {
      type: 'inAppPurchases',
      attributes: {
        name: displayName,
        productId: productId,
        inAppPurchaseType: 'NON_CONSUMABLE',
        reviewNote: 'Lifetime premium access to all features',
        familySharable: false,
      },
      relationships: {
        app: {
          data: { type: 'apps', id: appId },
        },
      },
    },
  });

  if (result.alreadyExists) {
    console.log(`    -> Already exists (409)`);
    return 'existing';
  }

  if (result.error) {
    console.log(`    -> ERROR ${result.status}: ${JSON.stringify(result.data)}`);
    return null;
  }

  const iapId = result.data.data.id;
  console.log(`    -> Created: ${iapId}`);
  return iapId;
}

// ─── Step 4: Set Subscription Pricing ────────────────────────────────
async function setSubscriptionPrice(subscriptionId, pricePointId) {
  console.log(`    Setting price...`);

  const result = await ascPost('/v1/subscriptionPrices', {
    data: {
      type: 'subscriptionPrices',
      attributes: {
        startDate: null, // Immediate
        preserveCurrentPrice: false,
      },
      relationships: {
        subscription: {
          data: { type: 'subscriptions', id: subscriptionId },
        },
        subscriptionPricePoint: {
          data: { type: 'subscriptionPricePoints', id: pricePointId },
        },
      },
    },
  });

  if (result.error) {
    console.log(`    -> Price ERROR ${result.status}: ${JSON.stringify(result.data)}`);
    return false;
  }

  console.log(`    -> Price set successfully`);
  return true;
}

// ─── Step 5: Find price point for USD amount ─────────────────────────
async function findUSDPricePoint(subscriptionId, targetPriceCents) {
  // Get price points for US territory
  const url = `/v1/subscriptions/${subscriptionId}/pricePoints?filter[territory]=USA&include=territory`;
  const result = await ascGet(url);

  if (!result.data || result.data.length === 0) {
    console.log(`    -> No price points found`);
    return null;
  }

  // Find the price point matching our target price
  const targetStr = (targetPriceCents / 100).toFixed(2);
  const match = result.data.find(pp => pp.attributes?.customerPrice === targetStr);

  if (match) {
    console.log(`    -> Found price point ${match.id} for $${targetStr}`);
    return match.id;
  }

  // Log available prices for debugging
  const available = result.data.slice(0, 10).map(pp => `$${pp.attributes?.customerPrice}`);
  console.log(`    -> No exact match for $${targetStr}. Available: ${available.join(', ')}...`);
  return null;
}

// ─── Step 6: Set Introductory Offer (3-day free trial for annual) ────
async function setIntroductoryOffer(subscriptionId) {
  console.log(`    Setting 3-day free trial...`);

  const result = await ascPost('/v1/subscriptionIntroductoryOffers', {
    data: {
      type: 'subscriptionIntroductoryOffers',
      attributes: {
        duration: 'THREE_DAYS',
        offerMode: 'FREE_TRIAL',
        numberOfPeriods: 1,
        startDate: null,
        endDate: null,
      },
      relationships: {
        subscription: {
          data: { type: 'subscriptions', id: subscriptionId },
        },
      },
    },
  });

  if (result.alreadyExists) {
    console.log(`    -> Trial already exists`);
    return true;
  }

  if (result.error) {
    console.log(`    -> Trial ERROR ${result.status}: ${JSON.stringify(result.data)}`);
    return false;
  }

  console.log(`    -> Free trial set successfully`);
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('=== App Store Connect Product Setup ===\n');

  // Verify API access first
  console.log('Verifying API access...');
  try {
    const meRes = await ascFetch('/v1/apps?limit=1');
    if (!meRes.ok) {
      const errText = await meRes.text();
      console.error(`API access failed (${meRes.status}): ${errText}`);
      process.exit(1);
    }
    console.log('API access verified.\n');
  } catch (e) {
    console.error('Failed to connect to ASC API:', e.message);
    process.exit(1);
  }

  for (const app of APPS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`App: ${app.name} (ID: ${app.ascAppId})`);
    console.log(`${'='.repeat(50)}`);

    // 1. Create subscription group
    const groupName = `${app.name} Premium`;
    const groupId = await createSubscriptionGroup(app.ascAppId, groupName);

    if (!groupId) {
      console.log(`  Skipping subscriptions — no group ID`);
      continue;
    }

    // 2. Create subscriptions
    for (const product of PRODUCTS) {
      const productId = `${app.prefix}_${product.suffix}`;

      if (product.type === 'AUTO_RENEWABLE') {
        const subId = await createSubscription(groupId, productId, product.displayName, product.duration);

        if (subId && subId !== 'existing') {
          // Set pricing
          const priceCents = product.suffix === 'monthly' ? 499 : 2499;
          const pricePointId = await findUSDPricePoint(subId, priceCents);
          if (pricePointId) {
            await setSubscriptionPrice(subId, pricePointId);
          }

          // Set 3-day free trial for annual only
          if (product.suffix === 'annual') {
            await setIntroductoryOffer(subId);
          }
        }
      } else if (product.type === 'NON_CONSUMABLE') {
        await createNonConsumableIAP(app.ascAppId, productId, product.displayName);
        // Note: Non-consumable pricing must be set in ASC web UI or via
        // inAppPurchasePriceSchedules endpoint (more complex)
      }
    }
  }

  console.log('\n=== Setup Complete ===');
  console.log('\nManual steps remaining:');
  console.log('  1. Set lifetime IAP pricing ($14.99) in App Store Connect web UI');
  console.log('     (or extend this script with inAppPurchasePriceSchedules endpoint)');
  console.log('  2. Add localized descriptions for each product in ASC');
  console.log('  3. Submit products for review alongside your next app update');
  console.log('  4. Set up RevenueCat dashboard (products, entitlements, offerings)');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
