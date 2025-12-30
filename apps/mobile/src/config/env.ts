/**
 * Environment Configuration
 *
 * This file manages environment-specific settings.
 * For production, values should come from EAS secrets or .env files.
 */

type Environment = 'development' | 'staging' | 'production';

interface Config {
  environment: Environment;
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiTimeout: number;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Detect environment based on Expo constants
const getEnvironment = (): Environment => {
  // In production builds, this would be set via EAS environment variables
  if (__DEV__) {
    return 'development';
  }

  // You can set this via EAS secrets: EXPO_PUBLIC_ENV
  const envVar = process.env.EXPO_PUBLIC_ENV;
  if (envVar === 'staging') return 'staging';
  if (envVar === 'production') return 'production';

  return 'production';
};

const environment = getEnvironment();

// Base configuration shared across environments
const baseConfig = {
  apiTimeout: 30000,
};

// Environment-specific configurations
const configs: Record<Environment, Config> = {
  development: {
    ...baseConfig,
    environment: 'development',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-dev-project.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-dev-anon-key',
    enableAnalytics: false,
    enableCrashReporting: false,
    logLevel: 'debug',
  },
  staging: {
    ...baseConfig,
    environment: 'staging',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-staging-project.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-staging-anon-key',
    enableAnalytics: true,
    enableCrashReporting: true,
    logLevel: 'info',
  },
  production: {
    ...baseConfig,
    environment: 'production',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-prod-project.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-prod-anon-key',
    enableAnalytics: true,
    enableCrashReporting: true,
    logLevel: 'error',
  },
};

export const config = configs[environment];

// Type-safe environment check utilities
export const isDev = () => config.environment === 'development';
export const isStaging = () => config.environment === 'staging';
export const isProd = () => config.environment === 'production';

// Logger that respects log level
type LogFn = (...args: unknown[]) => void;

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: keyof typeof logLevels): boolean => {
  return logLevels[level] >= logLevels[config.logLevel];
};

export const logger = {
  debug: ((...args) => {
    if (shouldLog('debug')) console.log('[DEBUG]', ...args);
  }) as LogFn,
  info: ((...args) => {
    if (shouldLog('info')) console.info('[INFO]', ...args);
  }) as LogFn,
  warn: ((...args) => {
    if (shouldLog('warn')) console.warn('[WARN]', ...args);
  }) as LogFn,
  error: ((...args) => {
    if (shouldLog('error')) console.error('[ERROR]', ...args);
  }) as LogFn,
};

export default config;
