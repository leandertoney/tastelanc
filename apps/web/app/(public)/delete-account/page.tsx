import type { Metadata } from 'next';
import { Trash2, Mail, Clock, AlertCircle } from 'lucide-react';
import { BRAND } from '@/config/market';

export const metadata: Metadata = {
  title: `Delete Your Account | ${BRAND.name}`,
  description: `Request deletion of your ${BRAND.name} account and all associated data.`,
  alternates: {
    canonical: `https://${BRAND.domain}/delete-account`,
  },
};

export default function DeleteAccountPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-tastelanc-accent/20 rounded-xl flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-tastelanc-accent" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Delete Your {BRAND.name} Account</h1>
        </div>

        <p className="text-gray-400 text-lg mb-8">
          To delete your {BRAND.name} account and all associated data, please follow the steps below.
        </p>

        <div className="bg-tastelanc-surface rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">How to Request Account Deletion</h2>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-tastelanc-accent rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
              <div>
                <p className="text-white font-medium">Email us at info@{BRAND.domain}</p>
                <p className="text-gray-400 text-sm">Use the subject line: &quot;Delete My Account&quot;</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-tastelanc-accent rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
              <div>
                <p className="text-white font-medium">Include your account email</p>
                <p className="text-gray-400 text-sm">Provide the email address associated with your {BRAND.name} account</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-tastelanc-accent rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
              <div>
                <p className="text-white font-medium">Wait for confirmation</p>
                <p className="text-gray-400 text-sm">We will process your request within 7 business days</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-tastelanc-surface rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">What Gets Deleted</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-tastelanc-accent">&#10003;</span>
              Your account and login credentials
            </li>
            <li className="flex items-center gap-2">
              <span className="text-tastelanc-accent">&#10003;</span>
              Profile information
            </li>
            <li className="flex items-center gap-2">
              <span className="text-tastelanc-accent">&#10003;</span>
              Favorites and check-in history
            </li>
            <li className="flex items-center gap-2">
              <span className="text-tastelanc-accent">&#10003;</span>
              Voting history
            </li>
            <li className="flex items-center gap-2">
              <span className="text-tastelanc-accent">&#10003;</span>
              Any premium subscription will be cancelled
            </li>
          </ul>
        </div>

        <div className="bg-tastelanc-accent/10 border border-tastelanc-accent/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-tastelanc-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">This action is permanent</p>
              <p className="text-gray-400 text-sm mt-1">
                Once your account is deleted, this cannot be undone. You will need to create a new account if you wish to use {BRAND.name} again.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-400 mb-4">Questions? Contact us at</p>
          <a
            href={`mailto:info@${BRAND.domain}`}
            className="inline-flex items-center gap-2 text-tastelanc-accent hover:underline text-lg"
          >
            <Mail className="w-5 h-5" />
            {`info@${BRAND.domain}`}
          </a>
        </div>
      </div>
    </div>
  );
}
