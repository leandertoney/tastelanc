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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/party/active')
      .then(r => r.json())
      .then(data => setEvent(data.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRSVP(response: 'yes' | 'no') {
    if (response === 'yes') {
      if (!name.trim() || name.trim().length < 2) return;
      if (!email.trim() || !email.includes('@')) return;
    } else {
      if (!name.trim() || name.trim().length < 2) return;
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
          restaurant_id: ref || undefined,
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
        <div style={styles.divider} />
        <h1 style={styles.eventName}>{event.name}</h1>
        <div style={styles.detailRow}>
          <span style={styles.detailIcon}>&#128197;</span>
          <span style={styles.detailText}>{eventDate}</span>
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

        {/* FORM */}
        {stage === 'form' && (
          <>
            <p style={styles.inviteText}>
              You&apos;ve been invited to an industry-only event. RSVP below to
              secure your spot.
            </p>

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
                opacity: name.trim().length >= 2 && email.includes('@') ? 1 : 0.45,
              }}
              disabled={name.trim().length < 2 || !email.includes('@')}
              onClick={() => handleRSVP('yes')}
            >
              I&apos;ll Be There
            </button>

            <button
              style={styles.btnSecondary}
              disabled={name.trim().length < 2}
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
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
    border: '1px solid rgba(255,255,255,0.1)',
  },
  brand: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 4,
    textAlign: 'center',
    color: '#e8a838',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '16px 0',
  },
  eventName: {
    fontSize: 26,
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 16px',
    lineHeight: 1.15,
    textAlign: 'center',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
  },
  inviteText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.55,
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  },
  fieldHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 6,
    lineHeight: 1.4,
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '15px 24px',
    borderRadius: 14,
    border: 'none',
    background: '#e8a838',
    color: '#1a1a2e',
    fontWeight: 700,
    fontSize: 16,
    textAlign: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
    marginBottom: 10,
  },
  btnSecondary: {
    display: 'block',
    width: '100%',
    padding: '13px 24px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600,
    fontSize: 15,
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
    border: '3px solid rgba(255,255,255,0.15)',
    borderTopColor: '#e8a838',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  submittingText: {
    color: 'rgba(255,255,255,0.5)',
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
    color: '#fff',
    margin: '0 0 4px',
  },
  confirmSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
  },
  ticketBox: {
    background: 'rgba(232,168,56,0.1)',
    border: '1px solid rgba(232,168,56,0.25)',
    borderRadius: 14,
    padding: '16px 18px',
    marginBottom: 20,
  },
  ticketText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.5,
    margin: 0,
  },
  downloadSection: {
    marginTop: 16,
  },
  downloadLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
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
    background: 'rgba(255,255,255,0.08)',
    color: '#e8a838',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    border: '1px solid rgba(232,168,56,0.2)',
  },
  downloadHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 1.5,
  },
  // Declined
  declinedText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
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
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 24,
  },
};
