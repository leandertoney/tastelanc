import { BRAND } from '@/config/market';

interface AppGateCTAProps {
  /** Total count of remaining items hidden behind the gate */
  hiddenCount: number;
  /** Type of content being gated (e.g., "happy hours", "events", "specials") */
  contentType: string;
  /** Optional children to render as blurred preview items */
  children?: React.ReactNode;
}

/**
 * Content gate CTA that shows a blurred preview + app download prompt.
 * Used on browse pages to show 6 items, then gate the rest.
 */
export function AppGateCTA({ hiddenCount, contentType, children }: AppGateCTAProps) {
  const hasApp = !!(BRAND.appStoreUrls.ios || BRAND.appStoreUrls.android);
  if (!hasApp || hiddenCount <= 0) return null;

  return (
    <div className="relative mt-8">
      {/* Blurred preview of next items */}
      {children && (
        <div className="relative overflow-hidden max-h-48">
          <div className="blur-sm opacity-40 pointer-events-none select-none">
            {children}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-tastelanc-bg" />
        </div>
      )}

      {/* Gate CTA */}
      <div className="relative bg-gradient-to-br from-tastelanc-surface to-tastelanc-card rounded-2xl p-8 text-center border border-tastelanc-surface-light">
        <p className="text-2xl font-bold text-tastelanc-text-primary mb-2">
          {hiddenCount}+ more {contentType}
        </p>
        <p className="text-tastelanc-text-muted mb-1">
          See all {contentType} in the {BRAND.name} app
        </p>
        <p className="text-tastelanc-text-faint text-sm mb-6">
          Get personalized recommendations from {BRAND.aiName}, your AI dining guide
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {BRAND.appStoreUrls.ios && (
            <a
              href={BRAND.appStoreUrls.ios}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              Download for iOS
            </a>
          )}
          {BRAND.appStoreUrls.android && (
            <a
              href={BRAND.appStoreUrls.android}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              Download for Android
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
