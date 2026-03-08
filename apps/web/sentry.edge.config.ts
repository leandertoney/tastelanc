import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://d11037cc73ccb10091dfd781c939ba08@o4511007217549312.ingest.us.sentry.io/4511007217745920',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring
  tracesSampleRate: 0.1,
});
