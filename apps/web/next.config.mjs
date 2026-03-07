/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;
