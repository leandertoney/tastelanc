import type { Metadata } from 'next';
import { BRAND } from '@/config/market';

export const metadata: Metadata = {
  title: `Support | ${BRAND.name}`,
  description: `Get help and support for ${BRAND.name} - Contact us, FAQs, and troubleshooting.`,
  alternates: {
    canonical: `https://${BRAND.domain}/support`,
  },
};

export default function SupportPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Support</h1>
        <p className="text-gray-400 mb-8">We&apos;re here to help you get the most out of {BRAND.name}.</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              Have a question, feedback, or need assistance? We&apos;d love to hear from you.
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
              <li>Email: <a href={`mailto:info@${BRAND.domain}`} className="text-tastelanc-accent hover:underline">{`info@${BRAND.domain}`}</a></li>
              <li>Website: <a href={`https://${BRAND.domain}`} className="text-tastelanc-accent hover:underline">{`https://${BRAND.domain}`}</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">What is {BRAND.name}?</h3>
                <p className="text-gray-300 leading-relaxed">
                  {BRAND.name} is your guide to discovering the best restaurants, happy hours, events, and specials in {BRAND.countyShort}, {BRAND.state}. We help you find great dining experiences and stay updated on local food scene happenings.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">How do I create an account?</h3>
                <p className="text-gray-300 leading-relaxed">
                  You can create an account by downloading our app from the App Store or Google Play and signing up with your email address. Account creation is free and gives you access to personalized recommendations and saved favorites.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">How do I delete my account?</h3>
                <p className="text-gray-300 leading-relaxed">
                  You can delete your account by visiting our <a href="/delete-account" className="text-tastelanc-accent hover:underline">account deletion page</a>. This will permanently remove your account and all associated data from our systems.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Is {BRAND.name} free to use?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Yes, {BRAND.name} is free to download and use. We offer a premium subscription with additional features for users who want an enhanced experience.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">How can I report incorrect information?</h3>
                <p className="text-gray-300 leading-relaxed">
                  If you notice any incorrect information about a restaurant, event, or special, please email us at <a href={`mailto:info@${BRAND.domain}`} className="text-tastelanc-accent hover:underline">{`info@${BRAND.domain}`}</a> with the details, and we&apos;ll review and update the information promptly.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Troubleshooting</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">App not loading properly?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Try closing the app completely and reopening it. If the issue persists, check your internet connection or try reinstalling the app. Make sure you have the latest version installed.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Location services not working?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Ensure location permissions are enabled for {BRAND.name} in your device settings. On iOS, go to Settings &gt; Privacy &gt; Location Services &gt; {BRAND.name}. On Android, go to Settings &gt; Apps &gt; {BRAND.name} &gt; Permissions &gt; Location.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Not receiving notifications?</h3>
                <p className="text-gray-300 leading-relaxed">
                  Check that notifications are enabled for {BRAND.name} in your device settings. Also verify that you have notifications enabled within the app settings.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">For Restaurant Owners</h2>
            <p className="text-gray-300 leading-relaxed">
              Want to list your restaurant on {BRAND.name} or update your business information? Contact us at <a href={`mailto:info@${BRAND.domain}`} className="text-tastelanc-accent hover:underline">{`info@${BRAND.domain}`}</a> and we&apos;ll help you get set up.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Response Time</h2>
            <p className="text-gray-300 leading-relaxed">
              We aim to respond to all support inquiries within 24-48 hours. For urgent matters, please include &quot;URGENT&quot; in your email subject line.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
