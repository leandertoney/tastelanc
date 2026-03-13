import { BRAND } from '@/config/market';

/**
 * Inline CTA for blog posts that encourages app download.
 * Drop this between paragraphs in blog post content.
 */
export function BlogAppCTA() {
  const hasApp = !!(BRAND.appStoreUrls.ios || BRAND.appStoreUrls.android);
  if (!hasApp) return null;

  return (
    <div className="my-8 bg-gradient-to-r from-tastelanc-surface to-tastelanc-card rounded-xl p-6 border border-tastelanc-surface-light">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="text-white font-semibold text-lg">
            This list updates in real-time in the {BRAND.name} app
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Get personalized recommendations from {BRAND.aiName}, your AI dining guide. Free on iOS & Android.
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {BRAND.appStoreUrls.ios && (
            <a
              href={BRAND.appStoreUrls.ios}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm text-center"
            >
              Download for iOS
            </a>
          )}
          {BRAND.appStoreUrls.android && (
            <a
              href={BRAND.appStoreUrls.android}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm text-center"
            >
              Download for Android
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
