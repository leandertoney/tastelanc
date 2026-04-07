import { NextResponse } from 'next/server';

/**
 * Apple App Site Association file for iOS Universal Links.
 * Served at: https://tastelanc.com/.well-known/apple-app-site-association
 *
 * This tells iOS that tastelanc.com/party should open in the TasteLanc app.
 * Team ID: SH7HKLXWMW, Bundle ID: com.tastelanc.app
 */
export async function GET() {
  const association = {
    applinks: {
      apps: [],
      details: [
        {
          appID: 'SH7HKLXWMW.com.tastelanc.app',
          paths: ['/party', '/party/*'],
        },
      ],
    },
  };

  return NextResponse.json(association, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
