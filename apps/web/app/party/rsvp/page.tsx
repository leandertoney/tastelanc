'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const APP_STORE_URL = 'https://apps.apple.com/app/tastelanc/id6755852717';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tastelanc.app';

interface PartyEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  address: string;
  spots_remaining: number | null;
}

interface Restaurant {
  id: string;
  name: string;
}

type Stage = 'form' | 'submitting' | 'confirmed' | 'declined' | 'error';

export default function RSVPPage() {
  return (
    <Suspense fallback={
      <div style={styles.page}>
        <div style={styles.spinner} />
      </div>
    }>
      <RSVPContent />
    </Suspense>
  );
}

function RSVPContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref'); // restaurant_id for source tracking

  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Fetch active event
    fetch('/api/party/active')
      .then(r => r.json())
      .then(data => setEvent(data.event))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch Restaurant Week restaurants
    fetch('/api/restaurants/restaurant-week')
      .then(r => r.json())
      .then(data => {
        const rwRestaurants = data.restaurants || [];
        setRestaurants(rwRestaurants);

        // Pre-select restaurant if ref parameter exists
        if (ref && rwRestaurants.some((r: Restaurant) => r.id === ref)) {
          setRestaurantId(ref);
        }
      })
      .catch(() => {});
  }, [ref]);

  async function handleRSVP(response: 'yes' | 'no') {
    if (response === 'yes') {
      if (!name.trim() || name.trim().length < 2) return;
      if (!email.trim() || !email.includes('@')) return;
      if (!restaurantId) return; // Restaurant is required
    } else {
      if (!name.trim() || name.trim().length < 2) return;
      if (!restaurantId) return; // Restaurant is required for all responses
    }

    setStage('submitting');
    try {
      const res = await fetch('/api/party/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: response === 'yes' ? email.trim() : email.trim() || undefined,
          response,
          restaurant_id: restaurantId,
          source: 'link',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong');
        setStage('error');
        return;
      }
      if (response === 'yes') {
        setQrToken(data.qr_token);
        setStage('confirmed');
      } else {
        setStage('declined');
      }
    } catch {
      setErrorMsg('Could not connect. Please try again.');
      setStage('error');
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!event) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.noEvent}>No active event at this time.</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const deepLink = qrToken ? `tastelanc://party-ticket/${qrToken}` : 'tastelanc://party';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brand}>TASTELANC</div>

        {/* Event info — always visible */}
        <div style={styles.eyebrow}>POST-RESTAURANT WEEK</div>
        <div style={styles.divider} />
        <h1 style={styles.eventName}>Industry Social</h1>
        <div style={styles.detailRow}>
          <span style={styles.detailIcon}>&#128197;</span>
          <span style={styles.detailText}>{eventDate}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailIcon}>&#128336;</span>
          <span style={styles.detailText}>6:00 – 9:30 PM</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailIcon}>&#128205;</span>
          <span style={styles.detailText}>{event.venue}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailIcon}>&#128506;</span>
          <span style={styles.detailText}>{event.address}</span>
        </div>
        <div style={styles.divider} />

        {/* Event perks */}
        <div style={styles.perksSection}>
          <div style={styles.perkRow}>
            <span style={styles.perkIcon}>🎫</span>
            <span style={styles.perkText}>Complimentary drink tickets included</span>
          </div>
          <div style={styles.perkRow}>
            <span style={styles.perkIcon}>🎵</span>
            <span style={styles.perkText}>Music by DJ Eddy Mena</span>
          </div>
        </div>
        <div style={styles.divider} />

        {/* FORM */}
        {stage === 'form' && (
          <>
            <p style={styles.inviteText}>
              You&apos;ve been invited to an industry-only event. RSVP below to
              secure your spot.
            </p>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Restaurant</label>
              <select
                style={styles.select}
                value={restaurantId}
                onChange={e => setRestaurantId(e.target.value)}
              >
                <option value="">Select your restaurant...</option>
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                <option value="other">Other / Not Listed</option>
              </select>
              <p style={styles.fieldHint}>
                Which Restaurant Week restaurant are you with?
              </p>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Your Name</label>
              <input
                style={styles.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="First and last name"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <p style={styles.fieldHint}>
                Your ticket will be linked to this email in the app.
              </p>
            </div>

            <button
              style={{
                ...styles.btnPrimary,
                opacity: name.trim().length >= 2 && email.includes('@') && restaurantId ? 1 : 0.45,
              }}
              disabled={name.trim().length < 2 || !email.includes('@') || !restaurantId}
              onClick={() => handleRSVP('yes')}
            >
              I&apos;ll Be There
            </button>

            <button
              style={styles.btnSecondary}
              disabled={name.trim().length < 2 || !restaurantId}
              onClick={() => handleRSVP('no')}
            >
              Can&apos;t Make It
            </button>
          </>
        )}

        {/* SUBMITTING */}
        {stage === 'submitting' && (
          <div style={styles.centered}>
            <div style={styles.spinner} />
            <p style={styles.submittingText}>Submitting your RSVP...</p>
          </div>
        )}

        {/* CONFIRMED (YES) */}
        {stage === 'confirmed' && (
          <div style={styles.confirmSection}>
            <div style={styles.checkCircle}>&#10003;</div>
            <h2 style={styles.confirmTitle}>You&apos;re on the list</h2>
            <p style={styles.confirmSubtitle}>{name.trim()}</p>

            <div style={styles.ticketBox}>
              <p style={styles.ticketText}>
                Your digital ticket &mdash; including your personal QR code for
                entry &mdash; is waiting for you in{' '}
                <strong>TasteLanc</strong>.
              </p>
            </div>

            <a href={deepLink} style={styles.btnPrimary}>
              Open in TasteLanc
            </a>

            <div style={styles.downloadSection}>
              <p style={styles.downloadLabel}>Don&apos;t have the app yet?</p>
              <div style={styles.downloadButtons}>
                <a href={APP_STORE_URL} style={styles.downloadBtn}>
                  iPhone
                </a>
                <a href={PLAY_STORE_URL} style={styles.downloadBtn}>
                  Android
                </a>
              </div>
              <p style={styles.downloadHint}>
                Sign up with <strong>{email.trim()}</strong> and your ticket
                will appear automatically.
              </p>
            </div>
          </div>
        )}

        {/* DECLINED (NO) */}
        {stage === 'declined' && (
          <div style={styles.centered}>
            <p style={styles.declinedText}>
              Thanks for letting us know, {name.trim().split(' ')[0]}. We&apos;ll
              miss you!
            </p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={styles.centered}>
            <p style={styles.errorText}>{errorMsg}</p>
            <button style={styles.btnSecondary} onClick={() => setStage('form')}>
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p style={styles.footer}>TasteLanc &middot; Lancaster, PA</p>
    </div>
  );
}

// Theme colors matching the mobile app's Restaurant Week terracotta/gold palette
const TERRACOTTA = '#C84B31';
const TERRACOTTA_DARK = '#8B2F1A';
const GOLD = '#F0D060';
const GOLD_DIM = 'rgba(240,208,96,0.65)';
const BG_DARK = '#1C0800';
const CARD_BG = 'rgba(255,255,255,0.06)';

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
    background: CARD_BG,
    backdropFilter: 'blur(24px)',
    borderRadius: 28,
    padding: '28px 24px',
    maxWidth: 440,
    width: '100%',
    border: `1px solid rgba(240,208,96,0.15)`,
  },
  brand: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 3,
    textAlign: 'center',
    color: GOLD,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: GOLD_DIM,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    background: 'rgba(240,208,96,0.12)',
    margin: '10px 0',
  },
  eventName: {
    fontSize: 24,
    fontWeight: 900,
    color: GOLD,
    margin: '0 0 10px',
    lineHeight: 1.15,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 15,
    color: GOLD_DIM,
  },
  perksSection: {
    marginBottom: 0,
  },
  perkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  perkIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  perkText: {
    fontSize: 13,
    color: GOLD,
    fontWeight: 600,
  },
  inviteText: {
    fontSize: 13,
    color: GOLD_DIM,
    lineHeight: 1.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: GOLD_DIM,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid rgba(240,208,96,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: GOLD,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid rgba(240,208,96,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: GOLD,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  fieldHint: {
    fontSize: 10,
    color: 'rgba(240,208,96,0.35)',
    marginTop: 4,
    lineHeight: 1.3,
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '13px 20px',
    borderRadius: 12,
    border: 'none',
    background: TERRACOTTA,
    color: GOLD,
    fontWeight: 800,
    fontSize: 15,
    textAlign: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  btnSecondary: {
    display: 'block',
    width: '100%',
    padding: '11px 20px',
    borderRadius: 12,
    border: '1px solid rgba(240,208,96,0.2)',
    background: 'transparent',
    color: GOLD_DIM,
    fontWeight: 600,
    fontSize: 14,
    textAlign: 'center',
    cursor: 'pointer',
  },
  centered: {
    textAlign: 'center',
    paddingTop: 8,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid rgba(240,208,96,0.15)',
    borderTopColor: TERRACOTTA,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  submittingText: {
    color: GOLD_DIM,
    fontSize: 14,
    marginTop: 12,
  },
  // Confirmed
  confirmSection: {
    textAlign: 'center',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    background: 'rgba(74,222,128,0.15)',
    color: '#4ade80',
    fontSize: 28,
    lineHeight: '56px',
    textAlign: 'center',
    margin: '0 auto 16px',
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: GOLD,
    margin: '0 0 4px',
  },
  confirmSubtitle: {
    fontSize: 15,
    color: GOLD_DIM,
    marginBottom: 20,
  },
  ticketBox: {
    background: `rgba(200,75,49,0.15)`,
    border: `1px solid rgba(200,75,49,0.3)`,
    borderRadius: 14,
    padding: '16px 18px',
    marginBottom: 20,
  },
  ticketText: {
    fontSize: 14,
    color: GOLD_DIM,
    lineHeight: 1.5,
    margin: 0,
  },
  downloadSection: {
    marginTop: 16,
  },
  downloadLabel: {
    fontSize: 13,
    color: GOLD_DIM,
    marginBottom: 10,
  },
  downloadButtons: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 12,
  },
  downloadBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    background: 'rgba(200,75,49,0.2)',
    color: GOLD,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    border: `1px solid rgba(200,75,49,0.35)`,
  },
  downloadHint: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.35)',
    lineHeight: 1.5,
  },
  // Declined
  declinedText: {
    fontSize: 16,
    color: GOLD_DIM,
    lineHeight: 1.5,
  },
  // Error
  errorText: {
    fontSize: 15,
    color: '#f87171',
    marginBottom: 16,
  },
  // No event
  noEvent: {
    fontSize: 15,
    color: GOLD_DIM,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: 'rgba(240,208,96,0.2)',
    marginTop: 24,
  },
};
