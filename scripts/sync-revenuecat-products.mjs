#!/usr/bin/env node
/**
 * Sync RevenueCat Products
 *
 * Creates new product IDs in RevenueCat and attaches them to the premium entitlement.
 * This ensures RevenueCat product catalog matches Apple App Store Connect.
 *
 * Usage:
 *   API_KEY=sk_xxx node scripts/sync-revenuecat-products.mjs
 */

const API_KEY = process.env.API_KEY || process.env.REVENUECAT_SECRET_KEY;
const PROJECT_ID = 'c6b1572a';
const ENTITLEMENT_ID = 'entl3f44949c47';

if (!API_KEY) {
  console.error('❌ Missing API_KEY environment variable');
  console.error('Usage: API_KEY=sk_xxx node scripts/sync-revenuecat-products.mjs');
  process.exit(1);
}

const BASE_URL = 'https://api.revenuecat.com/v2';

// RevenueCat app IDs
const APP_IDS = {
  TASTELANC: 'app5ce39ae029',       // com.tastelanc.app
  TASTECUMBERLAND: 'appcb988eaf68', // com.tastelanc.cumberland
  TASTEFAYETTEVILLE: 'app541f0d82db', // com.tastelanc.fayetteville
};

// Product IDs to create - must match Apple App Store Connect
const PRODUCTS = [
  // TasteLanc
  { id: 'tastelanc_monthly_v2', app_id: APP_IDS.TASTELANC, type: 'subscription', store: 'app_store' },
  { id: 'tastelanc_annual_v2', app_id: APP_IDS.TASTELANC, type: 'subscription', store: 'app_store' },
  { id: 'tastelanc_annual_discount', app_id: APP_IDS.TASTELANC, type: 'subscription', store: 'app_store' },

  // TasteCumberland
  { id: 'tastecumberland_monthly_v2', app_id: APP_IDS.TASTECUMBERLAND, type: 'subscription', store: 'app_store' },
  { id: 'tastecumberland_annual_v2', app_id: APP_IDS.TASTECUMBERLAND, type: 'subscription', store: 'app_store' },
  { id: 'tastecumberland_annual_discount', app_id: APP_IDS.TASTECUMBERLAND, type: 'subscription', store: 'app_store' },

  // TasteFayetteville
  { id: 'tastefayetteville_monthly_v2', app_id: APP_IDS.TASTEFAYETTEVILLE, type: 'subscription', store: 'app_store' },
  { id: 'tastefayetteville_annual_v2', app_id: APP_IDS.TASTEFAYETTEVILLE, type: 'subscription', store: 'app_store' },
  { id: 'tastefayetteville_annual_discount', app_id: APP_IDS.TASTEFAYETTEVILLE, type: 'subscription', store: 'app_store' },
];

async function apiRequest(method, path, body = null) {
  const url = `${BASE_URL}${path}`;

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

async function getProductByStoreIdentifier(storeIdentifier, appId) {
  try {
    // List all products for the project
    const data = await apiRequest('GET', `/projects/${PROJECT_ID}/products`);

    // Find product matching store_identifier and app_id
    const product = data.items?.find(
      p => p.store_identifier === storeIdentifier && p.app_id === appId
    );

    return product || null;
  } catch (error) {
    console.error(`Failed to fetch products:`, error.message);
    return null;
  }
}

async function createProduct(productId, appId, type, store) {
  try {
    console.log(`Creating product: ${productId}...`);

    // Try with only the minimal required fields
    const data = await apiRequest('POST', `/projects/${PROJECT_ID}/products`, {
      app_id: appId,
      store_identifier: productId,
      type: type,
    });

    console.log(`  ✅ Created product: ${productId}`);
    return data;
  } catch (error) {
    // If product already exists, fetch it
    if (error.message.includes('409') || error.message.includes('already exists')) {
      console.log(`  ℹ️  Product already exists: ${productId}`);
      const existing = await getProductByStoreIdentifier(productId, appId);
      return existing;
    }

    console.error(`  ❌ Failed to create product ${productId}:`, error.message);
    throw error;
  }
}

async function attachProductToEntitlement(revenuecatProductId, storeProductId) {
  try {
    console.log(`Attaching ${storeProductId} to entitlement...`);

    const data = await apiRequest(
      'POST',
      `/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_ID}/actions/attach_product`,
      { product_id: revenuecatProductId } // Use RevenueCat's internal product ID
    );

    console.log(`  ✅ Attached ${storeProductId} to premium entitlement`);
    return data;
  } catch (error) {
    // If already attached, that's okay
    if (error.message.includes('409') || error.message.includes('already attached')) {
      console.log(`  ℹ️  Product already attached: ${storeProductId}`);
      return null;
    }

    console.error(`  ❌ Failed to attach product ${storeProductId}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Syncing RevenueCat products...\n');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Entitlement ID: ${ENTITLEMENT_ID}`);
  console.log(`Products to sync: ${PRODUCTS.length}\n`);

  let created = 0;
  let attached = 0;
  let errors = 0;

  for (const product of PRODUCTS) {
    try {
      // Create product
      const createResult = await createProduct(product.id, product.app_id, product.type, product.store);
      if (createResult) created++;

      // Get the RevenueCat product ID from the response (or use store identifier as fallback)
      const rcProductId = createResult?.id || product.id;

      // Attach to entitlement
      const attachResult = await attachProductToEntitlement(rcProductId, product.id);
      if (attachResult) attached++;

      console.log(''); // Blank line between products
    } catch (error) {
      errors++;
      console.error(`Failed to process ${product.id}:`, error.message);
      console.log(''); // Blank line
    }
  }

  console.log('\n✅ Sync complete!');
  console.log(`  Products created: ${created}`);
  console.log(`  Products attached: ${attached}`);
  console.log(`  Errors: ${errors}`);

  if (errors > 0) {
    console.error('\n⚠️  Some products failed to sync. Check the logs above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
