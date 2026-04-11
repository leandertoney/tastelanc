/**
 * Interstitial Ad Manager
 *
 * Shows Google AdMob interstitial ads at natural breakpoints.
 * Premium users never see ads. Uses guarded require() for Expo Go safety.
 *
 * Breakpoints:
 * - After checking in at a restaurant
 * - After viewing several restaurant details in a session
 * - On 3rd+ app open per day
 */

// Test ad unit ID — Google provides this for development
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

let MobileAds: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;
let isAdMobAvailable = false;

try {
  const gma = require('react-native-google-mobile-ads');
  MobileAds = gma.default;
  InterstitialAd = gma.InterstitialAd;
  AdEventType = gma.AdEventType;
  TestIds = gma.TestIds;
  isAdMobAvailable = true;
} catch {
  console.log('[AdMob] Native module not available (running in Expo Go?)');
}

let _adUnitId: string = TEST_INTERSTITIAL_ID;
let _isInitialized = false;
let _interstitial: any = null;
let _isAdLoaded = false;
let _isAdShowing = false;

// Frequency controls
let _sessionDetailViews = 0;
let _lastAdShownAt = 0;
const MIN_AD_INTERVAL_MS = 3 * 60 * 1000; // Minimum 3 minutes between ads
const DETAIL_VIEWS_BEFORE_AD = 5; // Show ad after every N restaurant detail views

/**
 * Initialize the ad manager. Call once at app startup.
 * @param adUnitId - Production ad unit ID from AdMob dashboard
 */
export async function initInterstitialAds(adUnitId: string): Promise<void> {
  if (_isInitialized || !isAdMobAvailable) return;

  // Use test ads in development, real ads in production
  _adUnitId = __DEV__ ? TEST_INTERSTITIAL_ID : adUnitId;

  try {
    await MobileAds().initialize();
    _isInitialized = true;
    console.log('[AdMob] Initialized successfully');
    loadAd();
  } catch (error) {
    console.error('[AdMob] Failed to initialize:', error);
  }
}

/**
 * Pre-load an interstitial ad so it's ready to show instantly.
 */
function loadAd(): void {
  if (!isAdMobAvailable || !_isInitialized || _isAdLoaded) return;

  try {
    _interstitial = InterstitialAd.createForAdRequest(_adUnitId);

    _interstitial.addAdEventListener(AdEventType.LOADED, () => {
      _isAdLoaded = true;
      console.log('[AdMob] Interstitial loaded and ready');
    });

    _interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('[AdMob] Failed to load interstitial:', error?.message);
      _isAdLoaded = false;
      // Retry after 30 seconds
      setTimeout(loadAd, 30_000);
    });

    _interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      _isAdLoaded = false;
      _isAdShowing = false;
      _lastAdShownAt = Date.now();
      // Pre-load the next ad
      loadAd();
    });

    _interstitial.load();
  } catch (error) {
    console.error('[AdMob] Error creating interstitial:', error);
  }
}

/**
 * Check if enough time has passed since the last ad.
 */
function canShowAd(): boolean {
  if (!isAdMobAvailable || !_isInitialized || !_isAdLoaded || _isAdShowing) return false;
  const elapsed = Date.now() - _lastAdShownAt;
  return elapsed >= MIN_AD_INTERVAL_MS;
}

/**
 * Show an interstitial ad if one is loaded and conditions are met.
 * Returns true if an ad was shown.
 */
export function showInterstitialAd(): boolean {
  if (!canShowAd()) return false;

  try {
    _isAdShowing = true;
    _interstitial.show();
    return true;
  } catch (error) {
    console.error('[AdMob] Failed to show interstitial:', error);
    _isAdShowing = false;
    return false;
  }
}

/**
 * Call after a user views a restaurant detail screen.
 * Shows an ad after every DETAIL_VIEWS_BEFORE_AD views.
 * @param isPremium - If true, never shows an ad
 * @returns true if an ad was shown
 */
export function onRestaurantDetailView(isPremium: boolean): boolean {
  if (isPremium) return false;

  _sessionDetailViews++;
  if (_sessionDetailViews >= DETAIL_VIEWS_BEFORE_AD) {
    _sessionDetailViews = 0;
    return showInterstitialAd();
  }
  return false;
}

/**
 * Call after a user completes a check-in.
 * Natural pause point — good time for an ad.
 * @param isPremium - If true, never shows an ad
 * @returns true if an ad was shown
 */
export function onCheckInComplete(isPremium: boolean): boolean {
  if (isPremium) return false;
  return showInterstitialAd();
}

/**
 * Reset session counters (call when app comes to foreground).
 */
export function resetSessionCounters(): void {
  _sessionDetailViews = 0;
}

/**
 * Check if AdMob SDK is available (false in Expo Go).
 */
export function isAdMobSDKAvailable(): boolean {
  return isAdMobAvailable;
}
