import { NextResponse } from 'next/server';

/**
 * Android Digital Asset Links for App Links verification.
 * Served at: https://tastelanc.com/.well-known/assetlinks.json
 *
 * This tells Android that tastelanc.com/party should open in the TasteLanc app.
 * Package: com.tastelanc.app
 * SHA-256 from EAS-managed keystore.
 */
export async function GET() {
  const assetLinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.tastelanc.app',
        sha256_cert_fingerprints: [
          'BC:20:69:B0:E1:FA:71:E3:D2:AB:A6:61:33:50:AA:1A:2E:43:38:60:26:B9:66:40:C2:00:8D:B0:5A:68:B0:FC',
        ],
      },
    },
  ];

  return NextResponse.json(assetLinks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
