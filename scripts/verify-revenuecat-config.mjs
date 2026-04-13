#!/usr/bin/env node
/**
 * Verify RevenueCat Configuration
 *
 * Checks if RevenueCat offerings match the product IDs defined in code.
 * Helps identify configuration mismatches before testing in-app purchases.
 *
 * Usage:
 *   API_KEY=sk_xxx node scripts/verify-revenuecat-config.mjs
 */

const API_KEY = process.env.API_KEY || process.env.REVENUECAT_SECRET_KEY;
const PROJECT_ID = 'c6b1572a';

if (!API_KEY) {
  console.error('❌ Missing API_KEY environment variable');
  console.error('Usage: API_KEY=sk_xxx node scripts/verify-revenuecat-config.mjs');
  process.exit(1);
}

// Expected product IDs from code (packages/mobile-shared/src/lib/revenuecat.ts)
const EXPECTED_PRODUCTS = {
  'lancaster-pa': {
    MONTHLY: 'tastelanc_monthly_v2',
    ANNUAL: 'tastelanc_annual_v2',
    LIFETIME: 'tastelanc_annual_discount',
  },
  'cumberland-pa': {
    MONTHLY: 'tastecumberland_monthly',
    ANNUAL: 'tastecumberland_annual',
    LIFETIME: 'tastecumberland_annual_discount',
  },
  'fayetteville-nc': {
    MONTHLY: 'tastefayetteville_monthly',
    ANNUAL: 'tastefayetteville_annual',
    LIFETIME: 'tastefayetteville_annual_discount',
  },
};

// RevenueCat app IDs
const APP_IDS = {
  TASTELANC: 'app5ce39ae029',
  TASTECUMBERLAND: 'appcb988eaf68',
  TASTEFAYETTEVILLE: 'app541f0d82db',
};

async function apiRequest(method, path) {
  const url = `https://api.revenuecat.com/v2${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

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

async function main() {
  console.log('🔍 Verifying RevenueCat configuration...\n');

  try {
    // Fetch all offerings
    const offeringsData = await apiRequest('GET', `/projects/${PROJECT_ID}/offerings`);

    if (!offeringsData.items || offeringsData.items.length === 0) {
      console.error('❌ No offerings found in RevenueCat');
      return;
    }

    // Find the default offering
    const defaultOffering = offeringsData.items.find(o => o.lookup_key === 'default' || o.is_current);

    if (!defaultOffering) {
      console.error('❌ No default offering found');
      console.log('Available offerings:', offeringsData.items.map(o => o.lookup_key));
      return;
    }

    console.log(`📦 Checking offering: "${defaultOffering.lookup_key || defaultOffering.identifier}"\n`);

    // Fetch all products to get their store identifiers
    const productsData = await apiRequest('GET', `/projects/${PROJECT_ID}/products`);
    const productMap = new Map();

    for (const product of productsData.items || []) {
      productMap.set(product.id, {
        store_identifier: product.store_identifier,
        app_id: product.app_id,
      });
    }

    // Check each package in the offering
    const packages = defaultOffering.packages || [];

    let errors = 0;
    let warnings = 0;

    for (const pkg of packages) {
      const packageName = pkg.lookup_key || pkg.identifier;
      console.log(`\n📋 Package: ${packageName}`);
      console.log('─'.repeat(60));

      // Each package can have multiple products (one per app)
      const productIds = pkg.product_ids || [];

      if (productIds.length === 0) {
        console.log('⚠️  No products attached to this package');
        warnings++;
        continue;
      }

      for (const productId of productIds) {
        const productInfo = productMap.get(productId);

        if (!productInfo) {
          console.log(`❌ Product ${productId} not found in products list`);
          errors++;
          continue;
        }

        const { store_identifier, app_id } = productInfo;

        // Determine which market this product belongs to
        let market = null;
        let expectedKey = null;

        if (app_id === APP_IDS.TASTELANC) {
          market = 'TasteLanc';
          if (packageName.toLowerCase().includes('monthly')) expectedKey = EXPECTED_PRODUCTS['lancaster-pa'].MONTHLY;
          else if (packageName.toLowerCase().includes('annual')) expectedKey = EXPECTED_PRODUCTS['lancaster-pa'].ANNUAL;
          else if (packageName.toLowerCase().includes('lifetime')) expectedKey = EXPECTED_PRODUCTS['lancaster-pa'].LIFETIME;
        } else if (app_id === APP_IDS.TASTECUMBERLAND) {
          market = 'TasteCumberland';
          if (packageName.toLowerCase().includes('monthly')) expectedKey = EXPECTED_PRODUCTS['cumberland-pa'].MONTHLY;
          else if (packageName.toLowerCase().includes('annual')) expectedKey = EXPECTED_PRODUCTS['cumberland-pa'].ANNUAL;
          else if (packageName.toLowerCase().includes('lifetime')) expectedKey = EXPECTED_PRODUCTS['cumberland-pa'].LIFETIME;
        } else if (app_id === APP_IDS.TASTEFAYETTEVILLE) {
          market = 'TasteFayetteville';
          if (packageName.toLowerCase().includes('monthly')) expectedKey = EXPECTED_PRODUCTS['fayetteville-nc'].MONTHLY;
          else if (packageName.toLowerCase().includes('annual')) expectedKey = EXPECTED_PRODUCTS['fayetteville-nc'].ANNUAL;
          else if (packageName.toLowerCase().includes('lifetime')) expectedKey = EXPECTED_PRODUCTS['fayetteville-nc'].LIFETIME;
        }

        const matches = store_identifier === expectedKey;
        const icon = matches ? '✅' : '❌';

        console.log(`${icon} ${market}: ${store_identifier}`);

        if (!matches && expectedKey) {
          console.log(`   Expected: ${expectedKey}`);
          errors++;
        }
      }
    }

    console.log('\n' + '═'.repeat(60));
    if (errors === 0 && warnings === 0) {
      console.log('✅ Configuration is correct! All products match the code.');
    } else {
      console.log(`\n📊 Summary:`);
      if (errors > 0) {
        console.log(`   ❌ Errors: ${errors} product mismatches found`);
        console.log(`\n💡 Action Required:`);
        console.log(`   1. Go to RevenueCat Dashboard → Offerings`);
        console.log(`   2. Edit the "default" offering`);
        console.log(`   3. Update product selections to match expected values above`);
      }
      if (warnings > 0) {
        console.log(`   ⚠️  Warnings: ${warnings}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Failed to verify configuration:', error.message);
    process.exit(1);
  }
}

main();
