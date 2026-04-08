'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /party — Universal link landing page for party invites.
 *
 * - If TasteLanc app is installed: iOS/Android intercept this URL via universal
 *   links / app links and open the app directly. This page never renders.
 * - If app is NOT installed: Redirects to /party/rsvp (the web RSVP page).
 * - Belt-and-suspenders: tries custom scheme deep link first in case app is installed
 *   but universal links aren't intercepting.
 */

const DEEP_LINK = 'tastelanc://party';

export default function PartyPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Try custom scheme as fallback for app users
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = DEEP_LINK;
    document.body.appendChild(iframe);
    setTimeout(() => document.body.removeChild(iframe), 500);

    // After a short delay, redirect to the web RSVP page
    const timer = setTimeout(() => {
      setReady(true);
      router.replace('/party/rsvp');
    }, 1200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.brand}>TASTELANC</div>
        <p style={styles.text}>
          {ready ? 'Redirecting to RSVP...' : 'Opening TasteLanc...'}
        </p>
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
    background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    padding: '48px 32px',
    maxWidth: 400,
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  brand: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 4,
    color: '#e8a838',
    marginBottom: 16,
  },
  text: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
};
