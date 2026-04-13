#!/usr/bin/env node
/**
 * Create $14.99/year discounted annual subscription products
 * for the "40% off" offer screen
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { homedir } from 'os';

const KEY_ID = 'KNJL5W6X3H';
const ISSUER_ID = '84a11314-5e2f-4713-b454-1f9eeaf1458c';
const KEY_PATH = `${homedir()}/Downloads/AuthKey_KNJL5W6X3H.p8`;
const BASE_URL = 'https://api.appstoreconnect.apple.com';

const APPS = [
  { name: 'TasteLanc', ascAppId: '6755852717', prefix: 'tastelanc', groupId: '22024866' },
  { name: 'TasteCumberland', ascAppId: '6759233248', prefix: 'tastecumberland', groupId: '22024832' },
  { name: 'TasteFayetteville', ascAppId: '6760276128', prefix: 'tastefayetteville', groupId: '22024716' },
];

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

async function createDiscountedAnnual(groupId, productId, appName) {
  console.log(`Creating ${productId} ($14.99/year)...`);

  const result = await ascPost('/v1/subscriptions', {
    data: {
      type: 'subscriptions',
      attributes: {
        name: `${appName} Annual (Discount)`,
        productId: productId,
        subscriptionPeriod: 'ONE_YEAR',
        reviewNote: 'Discounted annual subscription - 40% off first year offer',
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
    console.log(`  ✓ Already exists`);
    return 'existing';
  }

  if (result.error) {
    console.log(`  ✗ ERROR ${result.status}: ${JSON.stringify(result.data)}`);
    return null;
  }

  const subId = result.data.data.id;
  console.log(`  ✓ Created: ${subId}`);
  return subId;
}

async function main() {
  console.log('=== Creating $14.99/year Discounted Annual Subscriptions ===\n');

  for (const app of APPS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${app.name}`);
    console.log(`${'='.repeat(50)}`);

    const productId = `${app.prefix}_annual_discount`;
    await createDiscountedAnnual(app.groupId, productId, app.name);
  }

  console.log('\n\n=== Next Steps ===');
  console.log('1. In App Store Connect, configure each product:');
  console.log('   - Display Name: "Annual Premium (Special Offer)"');
  console.log('   - Description: "Premium annual subscription at 40% off - limited time offer"');
  console.log('   - Price: $14.99/year');
  console.log('   - Upload paywall screenshot');
  console.log('   - Save');
  console.log('\n2. Products will be:');
  console.log('   - tastelanc_annual_discount');
  console.log('   - tastecumberland_annual_discount');
  console.log('   - tastefayetteville_annual_discount');
  console.log('\n3. I will update the app code to use these products in the "lifetime offer" screen');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
