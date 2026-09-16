import { getPortalLockState, PORTAL_LOCK_MESSAGE } from '@/lib/portal-lock';

export const dynamic = 'force-dynamic';

export default async function PortalLockedPage() {
  const { message } = await getPortalLockState();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f8f7f5',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        role="alert"
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e5e2dd',
          borderTop: '4px solid #b42318',
          borderRadius: '10px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.08)',
        }}
      >
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: '19px',
            lineHeight: 1.35,
            fontWeight: 600,
            color: '#b42318',
          }}
        >
          Account access suspended
        </h1>
        <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#344054' }}>
          {message || PORTAL_LOCK_MESSAGE}
        </p>
      </div>
    </main>
  );
}
