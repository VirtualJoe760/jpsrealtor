'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

export default function TextOptInPage() {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsAgreed, setSmsAgreed] = useState(false);
  const [newsletterAgreed, setNewsletterAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email) {
      setError('Email is required');
      return;
    }

    if (smsAgreed && !phoneNumber) {
      setError('Phone number is required for SMS consent');
      return;
    }

    if (!smsAgreed && !newsletterAgreed) {
      setError('Please agree to at least one form of communication');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phoneNumber: smsAgreed ? phoneNumber : undefined,
          smsConsent: smsAgreed,
          newsletterConsent: newsletterAgreed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save consent');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Thank You!
            </h1>
            <div className="text-gray-600 dark:text-gray-300 text-lg space-y-2">
              <p>Your consent preferences have been recorded:</p>
              <ul className="list-none space-y-2 mt-4">
                {smsAgreed && (
                  <li className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span>SMS Text Messages</span>
                  </li>
                )}
                {newsletterAgreed && (
                  <li className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span>Email Newsletter (via SendFox)</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="mt-6 text-gray-500 dark:text-gray-400 text-sm space-y-1">
              {smsAgreed && <p>You can opt out of SMS messages at any time by replying STOP.</p>}
              {newsletterAgreed && <p>You can unsubscribe from the newsletter at any time using the link in our emails.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Communication Consent
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Joseph Sardella Real Estate - eXp Realty
          </p>
        </div>

        {/* Agreement Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none mb-8 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Terms and Conditions
            </h2>

            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                By providing your contact information and agreeing to these terms, you consent to receive communications
                from Joseph Sardella Real Estate, operating through eXp Realty.
              </p>

              {/* SMS Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📱 SMS Text Messaging</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Message Frequency:</strong> Varies. You may receive messages about property listings, market updates, appointment reminders, and general real estate information.</p>
                  <p><strong>Message and Data Rates:</strong> Standard text messaging rates from your wireless carrier may apply.</p>
                  <p><strong>Opt-Out:</strong> Reply <strong>STOP</strong> to any message to opt out. Reply <strong>HELP</strong> for assistance.</p>
                  <p><strong>Carrier Limitations:</strong> Available on all major U.S. carriers. Carriers are not liable for delayed or undelivered messages.</p>
                </div>
              </div>

              {/* Newsletter Section */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-2">📧 Email Newsletter (SendFox)</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Newsletter Frequency:</strong> Weekly to monthly. Receive market insights, new listings, real estate tips, and exclusive content.</p>
                  <p><strong>Email Provider:</strong> Newsletters are sent via SendFox, a trusted email marketing platform.</p>
                  <p><strong>Unsubscribe:</strong> Click the unsubscribe link at the bottom of any newsletter email.</p>
                  <p><strong>No Spam:</strong> We will never sell or share your email address with third parties.</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Contact Information</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Phone: <a href="tel:+17603332674" className="text-blue-600 dark:text-blue-400 hover:underline">(760) 333-2674</a></li>
                  <li>Email: <a href="mailto:josephsardella@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">josephsardella@gmail.com</a></li>
                  <li>Website: <a href="https://www.jpsrealtor.com" className="text-blue-600 dark:text-blue-400 hover:underline">www.jpsrealtor.com</a></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Privacy Policy</h3>
                <p>
                  Your privacy is important to us. We will not share your contact information with third parties for marketing
                  purposes. Your information will be used solely for communication related to real estate services.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Consent Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field (Required) */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Phone Field (Conditional) */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Phone Number {smsAgreed && '*'}
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(123) 456-7890"
              required={smsAgreed}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Required only if you agree to SMS text messaging
            </p>
          </div>

          {/* SMS Consent Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <input
              id="smsAgree"
              type="checkbox"
              checked={smsAgreed}
              onChange={(e) => setSmsAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="smsAgree" className="text-sm text-gray-700 dark:text-gray-300">
              <strong>SMS Text Messaging:</strong> I agree to receive text messages from Joseph Sardella Real Estate. I understand that I can opt out at any
              time by replying STOP. I acknowledge that message and data rates may apply.
            </label>
          </div>

          {/* Newsletter Consent Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
            <input
              id="newsletterAgree"
              type="checkbox"
              checked={newsletterAgreed}
              onChange={(e) => setNewsletterAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="newsletterAgree" className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Email Newsletter (SendFox):</strong> I agree to receive email newsletters from Joseph Sardella Real Estate via SendFox. I understand that I can
              unsubscribe at any time using the link in the emails.
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (!smsAgreed && !newsletterAgreed)}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Submit Consent'
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You must agree to at least one form of communication to continue
          </p>
        </form>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Joseph Sardella, DRE# 02105816<br />
            eXp Realty - Obsidian Group<br />
            Palm Desert, CA
          </p>
        </div>
      </div>
    </div>
  );
}
