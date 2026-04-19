// Interstitial ads are disabled. The previous implementation required
// react-native-google-mobile-ads, which was removed in ca1f8f0 after it
// crashed on launch. A top-level require() of that module here bricked
// every OTA published afterward — module-level code runs at import time,
// so the app crashed before React could render and expo-updates rolled
// back. These no-op stubs preserve the public API so call sites compile.

export async function initInterstitialAds(_adUnitId: string): Promise<void> {}

export function showInterstitialAd(): boolean {
  return false;
}

export function onRestaurantDetailView(_isPremium: boolean): boolean {
  return false;
}

export function onCheckInComplete(_isPremium: boolean): boolean {
  return false;
}

export function resetSessionCounters(): void {}

export function isAdMobSDKAvailable(): boolean {
  return false;
}
