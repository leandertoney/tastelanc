import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getOfferings, getSubscriptionPackages, checkPremiumStatus, isRevenueCatSDKAvailable, getProductIds } from '../lib/revenuecat';
import { getColors } from '../config/theme';

/**
 * Debug screen to test RevenueCat configuration
 * Add this to your navigator temporarily to test offerings
 */
export default function TestRevenueCatScreen() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('');
  const [offerings, setOfferings] = useState<any>(null);
  const [packages, setPackages] = useState<any>(null);
  const [premium, setPremium] = useState<any>(null);
  const colors = getColors();

  const runTest = async () => {
    setLoading(true);
    setStatus('Testing RevenueCat configuration...\n\n');

    const results: string[] = [];

    // Check SDK availability
    const sdkAvailable = isRevenueCatSDKAvailable();
    results.push(`✅ SDK Available: ${sdkAvailable}`);

    if (!sdkAvailable) {
      results.push('\n❌ RevenueCat SDK not available (running in Expo Go?)');
      setStatus(results.join('\n'));
      setLoading(false);
      return;
    }

    // Check configured product IDs
    const productIds = getProductIds();
    results.push(`\n📦 Configured Product IDs:`);
    results.push(`  Monthly: ${productIds.MONTHLY}`);
    results.push(`  Annual: ${productIds.ANNUAL}`);
    results.push(`  Lifetime: ${productIds.LIFETIME}`);

    // Check current offering
    results.push(`\n🎁 Fetching offerings...`);
    const offering = await getOfferings();
    setOfferings(offering);

    if (!offering) {
      results.push('❌ No current offering found');
    } else {
      results.push(`✅ Found offering: ${offering.identifier}`);
      results.push(`  Available packages: ${offering.availablePackages?.length || 0}`);
    }

    // Check subscription packages
    results.push(`\n📋 Fetching subscription packages...`);
    const pkgs = await getSubscriptionPackages();
    setPackages(pkgs);

    results.push(`  Monthly: ${pkgs.monthly ? '✅ ' + pkgs.monthly.product.identifier : '❌ Not found'}`);
    if (pkgs.monthly) {
      results.push(`    Price: ${pkgs.monthly.product.priceString}`);
    }

    results.push(`  Annual: ${pkgs.annual ? '✅ ' + pkgs.annual.product.identifier : '❌ Not found'}`);
    if (pkgs.annual) {
      results.push(`    Price: ${pkgs.annual.product.priceString}`);
    }

    results.push(`  Lifetime: ${pkgs.lifetime ? '✅ ' + pkgs.lifetime.product.identifier : '❌ Not found'}`);
    if (pkgs.lifetime) {
      results.push(`    Price: ${pkgs.lifetime.product.priceString}`);
    }

    // Check premium status
    results.push(`\n👑 Checking premium status...`);
    const premiumStatus = await checkPremiumStatus();
    setPremium(premiumStatus);
    results.push(`  Is Premium: ${premiumStatus.isPremium ? '✅ Yes' : '❌ No'}`);
    results.push(`  Will Renew: ${premiumStatus.willRenew}`);

    // Final verdict
    results.push(`\n${'='.repeat(40)}`);
    const hasAllPackages = pkgs.monthly && pkgs.annual && pkgs.lifetime;
    if (hasAllPackages) {
      results.push('✅ RevenueCat is configured correctly!');
      results.push('\nAll subscription packages are available.');
    } else {
      results.push('⚠️ Configuration incomplete');
      results.push('\nSome packages are missing. Check:');
      results.push('1. RevenueCat Dashboard → Offerings');
      results.push('2. Ensure products are attached to packages');
      results.push('3. Products match Apple App Store Connect');
    }

    setStatus(results.join('\n'));
    setLoading(false);
  };

  useEffect(() => {
    runTest();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>RevenueCat Test</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={runTest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Rerun Test</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.results, { color: colors.text, fontFamily: 'monospace' }]}>
          {status}
        </Text>

        {offerings && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Raw Offering Data:</Text>
            <Text style={[styles.json, { color: colors.text }]}>
              {JSON.stringify(offerings, null, 2)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  results: {
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  json: {
    fontSize: 11,
    lineHeight: 16,
  },
});
