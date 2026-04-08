'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * /party — Smart routing page for party invites.
 *
 * Since universal links require a native build we don't have yet,
 * this page gives the user a visible button to open the app via
 * custom scheme (tastelanc://party). Custom schemes only work
 * from a real user tap — hidden iframes and auto-redirects are
 * blocked by modern browsers.
 *
 * If they don't have the app, they tap "RSVP on Web" instead.
 */

const DEEP_LINK = 'tastelanc://party';

const TERRACOTTA = '#C84B31';
const GOLD = '#F0D060';
const GOLD_DIM = 'rgba(240,208,96,0.65)';
const BG_DARK = '#1C0800';
const TERRACOTTA_DARK = '#8B2F1A';

export default function PartyPage() {
  const [tappedOpen, setTappedOpen] = useState(false);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>TASTELANC</div>
        <div style={styles.eyebrow}>POST-RESTAURANT WEEK</div>
        <h1 style={styles.title}>Industry Party</h1>
        <p style={styles.subtitle}>
          April 20, 2026 · 6:00 – 9:30 PM
        </p>

        {/* Primary: open in app */}
        <a
          href={DEEP_LINK}
          onClick={() => {
            setTappedOpen(true);
            // If the app doesn't open, the user stays on this page
            // and sees the fallback after a moment
          }}
          style={styles.btnPrimary}
        >
          Open in TasteLanc App
        </a>

        {/* Show fallback after they try the app link */}
        {tappedOpen && (
          <p style={styles.hint}>
            App didn&apos;t open? You may not have it installed yet.
          </p>
        )}

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        {/* Secondary: RSVP on web */}
        <Link href="/party/rsvp" style={styles.btnSecondary}>
          RSVP on Web
        </Link>

        <p style={styles.footerHint}>
          RSVP on web if you don&apos;t have the app. Your ticket will
          be linked automatically when you sign up with the same email.
        </p>
      </div>

      <p style={styles.footer}>TasteLanc · Lancaster, PA</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(160deg, ${TERRACOTTA_DARK} 0%, ${BG_DARK} 35%, ${BG_DARK} 100%)`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    borderRadius: 28,
    padding: '44px 28px',
    maxWidth: 440,
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(240,208,96,0.15)',
  },
  brand: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 4,
    color: GOLD,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: GOLD_DIM,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    color: GOLD,
    margin: '0 0 8px',
    lineHeight: 1.15,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: GOLD_DIM,
    margin: '0 0 28px',
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '15px 24px',
    borderRadius: 14,
    border: 'none',
    background: TERRACOTTA,
    color: GOLD,
    fontWeight: 800,
    fontSize: 16,
    textAlign: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
    letterSpacing: 0.3,
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.4)',
    marginTop: 10,
    marginBottom: 0,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerText: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.3)',
    flex: 1,
    textAlign: 'center',
  },
  btnSecondary: {
    display: 'block',
    width: '100%',
    padding: '13px 24px',
    borderRadius: 14,
    border: '1px solid rgba(240,208,96,0.2)',
    background: 'transparent',
    color: GOLD_DIM,
    fontWeight: 600,
    fontSize: 15,
    textAlign: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  footerHint: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.25)',
    marginTop: 14,
    lineHeight: 1.5,
  },
  footer: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.2)',
    marginTop: 24,
  },
};
