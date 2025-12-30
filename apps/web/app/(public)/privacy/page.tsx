import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | TasteLanc',
  description: 'TasteLanc Privacy Policy - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: November 28, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              TasteLanc (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the &quot;Service&quot;).
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Please read this Privacy Policy carefully. By using the Service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-white mb-3">2.1 Personal Information</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may collect personally identifiable information that you voluntarily provide when using our Service, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Email address (when joining our waitlist or creating an account)</li>
              <li>Name (optional, for personalization)</li>
              <li>Location data (with your consent, to show nearby restaurants)</li>
              <li>Preferences and favorites you save within the app</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.2 Usage Data</h3>
            <p className="text-gray-300 leading-relaxed">
              We automatically collect certain information when you use the Service, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
              <li>Device information (type, operating system, unique device identifiers)</li>
              <li>Log data (access times, pages viewed, app crashes)</li>
              <li>Analytics data about how you interact with the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use the collected information for various purposes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information to improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent, and address technical issues</li>
              <li>To send you updates about the app launch (if you joined our waitlist)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information only in the following situations:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong className="text-white">Service Providers:</strong> With third-party vendors who assist in operating our Service</li>
              <li><strong className="text-white">Legal Requirements:</strong> If required by law or in response to valid legal requests</li>
              <li><strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong className="text-white">With Your Consent:</strong> For any other purpose with your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
            <p className="text-gray-300 leading-relaxed">
              The security of your data is important to us. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify any inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Children&apos;s Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our Service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that we have collected personal information from a child under 13, we will take steps to delete that information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
              <li>Email: <a href="mailto:info@tastelanc.com" className="text-tastelanc-accent hover:underline">info@tastelanc.com</a></li>
              <li>Website: <a href="https://tastelanc.com" className="text-tastelanc-accent hover:underline">https://tastelanc.com</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
