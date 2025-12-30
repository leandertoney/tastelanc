/**
 * Environment configuration for TasteLanc
 * Uses EXPO_PUBLIC_ENV from EAS build config to determine environment
 * Falls back to __DEV__ for local development with Expo Go
 */

// Get environment from EAS build config or fall back to __DEV__
const EXPO_ENV = process.env.EXPO_PUBLIC_ENV;
const IS_DEV_BUILD = EXPO_ENV === 'development' || (!EXPO_ENV && __DEV__);

const DEV_CONFIG = {
  SUPABASE_URL: 'https://kcoszrcubshtsezcktnn.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjb3N6cmN1YnNodHNlemNrdG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDUzNjYsImV4cCI6MjA3OTY4MTM2Nn0.gG67fXJrb2YW5X_trdMrXUYbs3YgkvIezGG-fyt-M7c',
  RADAR_PUBLISHABLE_KEY: 'prj_live_pk_b2193ad3ae39983e40540e7724f28e9539c82b1f',
  // RevenueCat Apple public API key
  REVENUECAT_API_KEY: 'appl_KMhUHfmxkYLnEBmMrxVxiYczSuN',
};

const PROD_CONFIG = {
  SUPABASE_URL: 'https://kufcxxynjvyharhtfptd.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ',
  RADAR_PUBLISHABLE_KEY: 'prj_live_pk_b2193ad3ae39983e40540e7724f28e9539c82b1f',
  // RevenueCat Apple public API key
  REVENUECAT_API_KEY: 'appl_KMhUHfmxkYLnEBmMrxVxiYczSuN',
};

// Select config based on environment
export const env = IS_DEV_BUILD ? DEV_CONFIG : PROD_CONFIG;

export const isDev = IS_DEV_BUILD;
export const isProd = !IS_DEV_BUILD;
