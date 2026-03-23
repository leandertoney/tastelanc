import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', '@napi-rs/canvas', 'pdfjs-dist', 'pdf-parse'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kufcxxynjvyharhtfptd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Ensure font files are included in serverless function bundles
  outputFileTracingIncludes: {
    '/api/instagram/cron': ['./lib/instagram/fonts/**/*'],
    '/api/instagram/publish-approved': ['./lib/instagram/fonts/**/*'],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI logs during build
  silent: true,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hide source maps from users
  hideSourceMaps: true,

  // Skip source map upload if no auth token (e.g., local dev)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: 'universole-app-studios',
  project: 'javascript-nextjs',
});
