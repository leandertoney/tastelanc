import type { Metadata } from 'next';
import { BRAND } from '@/config/market';

export const metadata: Metadata = {
  title: `Terms of Service | ${BRAND.name}`,
  description: `${BRAND.name} Terms of Service - Read our terms and conditions for using the service.`,
  alternates: {
    canonical: `https://${BRAND.domain}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: November 28, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using {BRAND.name}&apos;s mobile application and website (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you do not have permission to access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-300 leading-relaxed">
              {BRAND.name} is a local dining and nightlife discovery platform for {BRAND.countyShort}, {BRAND.state}. Our Service provides information about restaurants, bars, happy hours, events, and entertainment venues in the {BRAND.countyShort} area. We aggregate publicly available information and user-contributed content to help you discover local dining and nightlife options.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              When you create an account with us, you must provide accurate, complete, and current information. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We reserve the right to terminate accounts that violate these Terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Acceptable Use</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Upload malicious code or interfere with the Service&apos;s operation</li>
              <li>Scrape, harvest, or collect user data without permission</li>
              <li>Impersonate any person or entity</li>
              <li>Engage in any conduct that restricts or inhibits others&apos; use of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Content and Information</h2>

            <h3 className="text-xl font-semibold text-white mb-3">5.1 Our Content</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are owned by {BRAND.name} and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
            </p>

            <h3 className="text-xl font-semibold text-white mb-3">5.2 Third-Party Content</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Service may display information about restaurants and venues that is provided by third parties or aggregated from public sources. We do not guarantee the accuracy, completeness, or reliability of this information. Venue details, hours, menus, and prices are subject to change without notice.
            </p>

            <h3 className="text-xl font-semibold text-white mb-3">5.3 User Content</h3>
            <p className="text-gray-300 leading-relaxed">
              By submitting content (reviews, photos, etc.) to the Service, you grant us a non-exclusive, royalty-free, worldwide license to use, display, and distribute your content in connection with the Service. You represent that you have the right to submit such content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Disclaimer of Warranties</h2>
            <p className="text-gray-300 leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DO NOT ENDORSE OR GUARANTEE ANY RESTAURANTS, VENUES, OR BUSINESSES LISTED ON THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND.name.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST TWELVE MONTHS, IF ANY.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Indemnification</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to indemnify and hold harmless {BRAND.name} and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney fees) arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Links</h2>
            <p className="text-gray-300 leading-relaxed">
              The Service may contain links to third-party websites or services that are not owned or controlled by {BRAND.name}. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Modifications to Service</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We may revise these Terms at any time by updating this page. By continuing to use the Service after changes become effective, you agree to be bound by the revised Terms. If you do not agree to the new Terms, please stop using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Pennsylvania, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved in the courts located in {BRAND.county}, Pennsylvania.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Severability</h2>
            <p className="text-gray-300 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
              <li>Email: <a href={`mailto:info@${BRAND.domain}`} className="text-tastelanc-accent hover:underline">{`info@${BRAND.domain}`}</a></li>
              <li>Website: <a href={`https://${BRAND.domain}`} className="text-tastelanc-accent hover:underline">{`https://${BRAND.domain}`}</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
