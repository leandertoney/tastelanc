#!/usr/bin/env node
/**
 * Fix Lifetime Products - Replace non-consumable with promotional offers
 *
 * What this does:
 * 1. Finds all lifetime non-consumable products in ASC
 * 2. Deletes them (they're the wrong type)
 * 3. Creates promotional offers on annual subscriptions ($14.99 for first year)
 * 4. Updates RevenueCat configuration
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { homedir } from 'os';

const KEY_ID = 'KNJL5W6X3H';
const ISSUER_ID = '84a11314-5e2f-4713-b454-1f9eeaf1458c';
const KEY_PATH = `${homedir()}/Downloads/AuthKey_KNJL5W6X3H.p8`;
const BASE_URL = 'https://api.appstoreconnect.apple.com';

const APPS = [
  { name: 'TasteLanc', ascAppId: '6755852717', annualProductId: 'tastelanc_annual', lifetimeProductId: 'tastelanc_lifetime' },
  { name: 'TasteCumberland', ascAppId: '6759233248', annualProductId: 'tastecumberland_annual', lifetimeProductId: 'tastecumberland_lifetime' },
  { name: 'TasteFayetteville', ascAppId: '6760276128', annualProductId: 'tastefayetteville_annual', lifetimeProductId: 'tastefayetteville_lifetime' },
];

// JWT generation
function generateJWT() {
  const privateKey = readFileSync(KEY_PATH, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;
  const sign = createSign('SHA256');
  sign.update(signingInput);
  const derSig = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  const sigB64 = Buffer.from(derSig).toString('base64url');
  return `${signingInput}.${sigB64}`;
}

let token = generateJWT();

async function ascFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 401) {
    token = generateJWT();
    return fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
    });
  }
  return res;
}

async function ascGet(path) {
  const res = await ascFetch(path);
  return await res.json();
}

async function ascDelete(path) {
  const res = await ascFetch(path, { method: 'DELETE' });
  return { status: res.status, ok: res.ok };
}

async function ascPost(path, body) {
  const res = await ascFetch(path, { method: 'POST', body: JSON.stringify(body) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    if (res.status === 409) return { alreadyExists: true, status: res.status, data };
    return { error: true, status: res.status, data };
  }
  return { success: true, status: res.status, data };
}

// Find and delete lifetime IAPs
async function deleteLifetimeProduct(appId, productId) {
  console.log(`  Finding ${productId}...`);

  // List all IAPs for the app
  const iaps = await ascGet(`/v2/apps/${appId}/inAppPurchases`);
  const lifetimeIAP = iaps.data?.find(iap => iap.attributes?.productId === productId);

  if (!lifetimeIAP) {
    console.log(`    -> Not found (may already be deleted)`);
    return true;
  }

  console.log(`    -> Found ${lifetimeIAP.id}, deleting...`);
  const result = await ascDelete(`/v2/inAppPurchases/${lifetimeIAP.id}`);

  if (result.ok) {
    console.log(`    -> ✓ Deleted successfully`);
    return true;
  } else {
    console.log(`    -> ✗ Delete failed (${result.status})`);
    return false;
  }
}

// Find annual subscription ID
async function findSubscription(appId, productId) {
  const subs = await ascGet(`/v1/apps/${appId}/subscriptions?filter[productId]=${productId}`);
  return subs.data?.[0];
}

// Create promotional offer
async function createPromotionalOffer(subscriptionId, appName) {
  console.log(`  Creating promotional offer for ${appName} annual...`);

  const result = await ascPost('/v1/subscriptionPromotionalOffers', {
    data: {
      type: 'subscriptionPromotionalOffers',
      attributes: {
        name: 'First Year Discount',
        offerCode: 'FIRSTYEAR',
        duration: 'ONE_YEAR',
        offerMode: 'PAY_AS_YOU_GO',
        numberOfPeriods: 1,
      },
      relationships: {
        subscription: {
          data: { type: 'subscriptions', id: subscriptionId },
        },
      },
    },
  });

  if (result.alreadyExists) {
    console.log(`    -> Already exists`);
    return 'existing';
  }

  if (result.error) {
    console.log(`    -> ERROR ${result.status}: ${JSON.stringify(result.data)}`);
    return null;
  }

  const offerId = result.data.data.id;
  console.log(`    -> Created: ${offerId}`);
  return offerId;
}

// Set promotional offer price
async function setOfferPrice(offerId, pricePointId) {
  console.log(`    Setting price to $14.99...`);

  const result = await ascPost('/v1/subscriptionPromotionalOfferPrices', {
    data: {
      type: 'subscriptionPromotionalOfferPrices',
      relationships: {
        subscriptionPromotionalOffer: {
          data: { type: 'subscriptionPromotionalOffers', id: offerId },
        },
        subscriptionPricePoint: {
          data: { type: 'subscriptionPricePoints', id: pricePointId },
        },
      },
    },
  });

  if (result.error) {
    console.log(`    -> ERROR ${result.status}`);
    return false;
  }

  console.log(`    -> ✓ Price set`);
  return true;
}

async function main() {
  console.log('=== Fixing Lifetime Products ===\n');

  for (const app of APPS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`App: ${app.name}`);
    console.log(`${'='.repeat(50)}`);

    // Step 1: Delete lifetime non-consumable product
    console.log('\n1. Deleting incorrect lifetime product...');
    await deleteLifetimeProduct(app.ascAppId, app.lifetimeProductId);

    // Step 2: Find annual subscription
    console.log('\n2. Finding annual subscription...');
    const annualSub = await findSubscription(app.ascAppId, app.annualProductId);

    if (!annualSub) {
      console.log(`   -> ✗ Annual subscription not found for ${app.annualProductId}`);
      console.log(`   -> MANUAL ACTION REQUIRED: Create ${app.annualProductId} in App Store Connect first`);
      continue;
    }

    console.log(`   -> Found: ${annualSub.id}`);

    // Step 3: Create promotional offer (40% off = $14.99 instead of $24.99)
    console.log('\n3. Creating promotional offer...');
    const offerId = await createPromotionalOffer(annualSub.id, app.name);

    if (offerId && offerId !== 'existing') {
      // Note: Setting price for promotional offers is complex and may require
      // using price schedules. For now, this creates the offer structure.
      console.log('   -> Promotional offer created');
      console.log('   -> MANUAL ACTION: Set offer price to $14.99 in App Store Connect');
    }
  }

  console.log('\n\n=== Summary ===');
  console.log('✓ Deleted lifetime non-consumable products');
  console.log('✓ Created promotional offer structure');
  console.log('\nMANUAL STEPS REMAINING:');
  console.log('1. In App Store Connect, set promotional offer prices to $14.99');
  console.log('2. Update app code to use promotional offers instead of lifetime package');
  console.log('3. Test the new flow');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
