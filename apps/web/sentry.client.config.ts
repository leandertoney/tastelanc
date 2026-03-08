import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://d11037cc73ccb10091dfd781c939ba08@o4511007217549312.ingest.us.sentry.io/4511007217745920',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring — sample 10% of transactions to keep costs low
  tracesSampleRate: 0.1,

  // Replay configuration — capture 1% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Filter out noisy browser errors
  ignoreErrors: [
    'ResizeObserver loop',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error exception captured',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'AbortError',
  ],
});
