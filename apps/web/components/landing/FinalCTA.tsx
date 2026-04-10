import { BRAND } from '@/config/market';
import StoreBadges from './StoreBadges';

export default function FinalCTA() {
  return (
    <section
      className="py-20 px-4 sm:px-6 text-center text-white"
      style={{
        background: `linear-gradient(135deg, ${BRAND.colors.accent}, ${BRAND.colors.accentHover})`,
      }}
    >
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Download {BRAND.name} Free
        </h2>
        <p className="text-white/80 text-base mb-8">
          Available on iOS and Android. No account required to browse.
        </p>
        <StoreBadges size="lg" className="justify-center" />
      </div>
    </section>
  );
}
