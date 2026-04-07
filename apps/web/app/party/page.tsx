'use client';

import { useEffect, useState } from 'react';

/**
 * /party — Universal link landing page for Restaurant Week party QR codes.
 *
 * How it works:
 * - If TasteLanc app is installed: iOS/Android intercept this URL via universal
 *   links / app links and open the app directly. This page never renders.
 * - If app is NOT installed: This page renders as a fallback with download links.
 * - As a belt-and-suspenders fallback, we also try the custom scheme deep link
 *   in case universal links aren't configured yet (pre-native-build).
 */

const APP_STORE_URL = 'https://apps.apple.com/app/tastelanc/id6755852717';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tastelanc.app';
const DEEP_LINK = 'tastelanc://party-rsvp';

export default function PartyPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Try custom scheme as fallback (for users on older builds without universal links)
    // On iOS this silently fails if app isn't installed; on Android it may show a chooser
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = DEEP_LINK;
    document.body.appendChild(iframe);
    setTimeout(() => document.body.removeChild(iframe), 500);

    // Show the download page after a short delay
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>TasteLanc</div>
        <h1 style={styles.title}>Restaurant Week After Party</h1>
        <p style={styles.subtitle}>
          April 20, 2026 &bull; Hempfield Apothetique
        </p>

        {!ready ? (
          <p style={styles.loading}>Opening TasteLanc app...</p>
        ) : (
          <>
            <p style={styles.description}>
              Download the TasteLanc app and use your invite code to RSVP.
            </p>
            <div style={styles.buttons}>
              <a href={APP_STORE_URL} style={styles.button}>
                Download for iPhone
              </a>
              <a href={PLAY_STORE_URL} style={styles.button}>
                Download for Android
              </a>
            </div>
            <a href={DEEP_LINK} style={styles.retryLink}>
              Already have the app? Tap here to open it
            </a>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    padding: '48px 32px',
    maxWidth: 420,
    width: '100%',
    textAlign: 'center' as const,
    border: '1px solid rgba(255,255,255,0.12)',
  },
  logo: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
    color: '#e8a838',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 8px 0',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 32px 0',
  },
  loading: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  description: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 1.5,
    marginBottom: 24,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    marginBottom: 24,
  },
  button: {
    display: 'block',
    padding: '14px 24px',
    borderRadius: 12,
    background: '#e8a838',
    color: '#1a1a2e',
    fontWeight: 600,
    fontSize: 16,
    textDecoration: 'none',
  },
  retryLink: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textDecoration: 'underline',
  },
};
