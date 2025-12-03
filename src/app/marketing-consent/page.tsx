'use client';

import { useState } from 'react';
import { Check, Loader2, FileText, X } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { STATES } from '@/app/constants/states';
import CenterHero from '@/components/CenterHero';
import SpaticalBackground from '@/app/components/backgrounds/SpaticalBackground';

export default function MarketingConsentPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('California');
  const [zipCode, setZipCode] = useState('');
  const [ownsRealEstate, setOwnsRealEstate] = useState<'yes' | 'no' | ''>('');
  const [timeframe, setTimeframe] = useState('');
  const [realEstateGoals, setRealEstateGoals] = useState('');

  // Consent checkboxes
  const [smsConsent, setSmsConsent] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);

  // UI state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeframeOptions = [
    { value: 'asap', label: 'ASAP' },
    { value: '0-3', label: '0-3 months' },
    { value: '3-6', label: '3-6 months' },
    { value: '6-12', label: '6 months - 1 year' },
    { value: '1+', label: '+1 Year' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      setError('Please fill in all required fields');
      return;
    }

    if (!smsConsent && !newsletterConsent) {
      setError('Please agree to at least one form of communication');
      return;
    }

    setLoading(true);

    try {
      const fullAddress = `${address}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${zipCode ? ' ' + zipCode : ''}`;

      // Save consent to database
      const consentResponse = await fetch('/api/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phoneNumber: phone,
          smsConsent,
          newsletterConsent,
        }),
      });

      if (!consentResponse.ok) {
        const consentData = await consentResponse.json();
        throw new Error(consentData.error || 'Failed to save consent');
      }

      // Subscribe to SendFox if newsletter consent is given
      if (newsletterConsent) {
        const sendfoxResponse = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            address: fullAddress,
            message: `Marketing Consent Form Submission\n\nOwns Real Estate: ${ownsRealEstate}\nTimeframe: ${timeframe || 'Not specified'}\nReal Estate Goals: ${realEstateGoals || 'Not specified'}\n\nSMS Consent: ${smsConsent ? 'Yes' : 'No'}\nNewsletter Consent: ${newsletterConsent ? 'Yes' : 'No'}`,
            optIn: true,
          }),
        });

        if (!sendfoxResponse.ok) {
          console.error('Newsletter subscription failed, but continuing...');
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Privacy Modal Component
  const PrivacyModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${
        isLight ? 'bg-white/95 backdrop-blur-sm border-gray-200' : 'bg-gray-800/95 backdrop-blur-sm border-gray-700'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight ? 'border-gray-200' : 'border-gray-700'
        }`}>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Privacy Policy & Terms of Service
          </h2>
          <button
            onClick={() => setShowPrivacyModal(false)}
            className={`p-2 rounded-lg transition-colors ${
              isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-700 text-gray-400'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className={`overflow-y-auto p-6 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          <div className="space-y-6">
            {/* Business Information */}
            <section>
              <h3 className={`text-xl font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Business Information
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Legal Entity:</strong> JPS & Company LLC</p>
                <p><strong>DBA:</strong> Joseph Sardella</p>
                <p><strong>Real Estate License:</strong> DRE# 02106916</p>
                <p><strong>Broker:</strong> eXp Realty of Southern California</p>
                <p><strong>Contact:</strong> (760) 333-2674 | josephsardella@gmail.com</p>
                <p><strong>Website:</strong> www.jpsrealtor.com</p>
              </div>
            </section>

            {/* SMS Text Messaging */}
            <section>
              <h3 className={`text-xl font-semibold mb-3 ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>
                📱 SMS Text Messaging Consent
              </h3>
              <div className="space-y-3 text-sm">
                <p>
                  By agreeing to receive SMS text messages, you consent to receive both automated and person-to-person
                  text messages from Joseph Sardella / JPS & Company LLC at the phone number you provided.
                </p>
                <div>
                  <p className="font-semibold mb-1">Message Types:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Automated messages (property alerts, market updates, reminders)</li>
                    <li>Person-to-person messages (direct communication with Joseph Sardella)</li>
                    <li>Property listings and open house notifications</li>
                    <li>Market updates and real estate news</li>
                  </ul>
                </div>
                <p><strong>Message Frequency:</strong> Varies based on market activity and your preferences. May range from occasional to several times per week.</p>
                <p><strong>Message and Data Rates:</strong> Standard text messaging rates from your wireless carrier will apply. Check with your carrier for details.</p>
                <p><strong>Opt-Out Instructions:</strong> Reply <strong>STOP</strong> to any message to opt out. You will receive one final confirmation message. You may also contact us directly at (760) 333-2674 or josephsardella@gmail.com to opt out.</p>
                <p><strong>Help:</strong> Reply <strong>HELP</strong> for assistance or contact us at (760) 333-2674.</p>
                <p><strong>Carriers:</strong> Available on all major U.S. carriers. Carriers are not liable for delayed or undelivered messages.</p>
              </div>
            </section>

            {/* Email Newsletter */}
            <section>
              <h3 className={`text-xl font-semibold mb-3 ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                📧 Email Newsletter Consent
              </h3>
              <div className="space-y-3 text-sm">
                <p>
                  By agreeing to receive email newsletters, you consent to receive marketing emails from Joseph Sardella / JPS & Company LLC
                  via SendFox, our trusted email marketing platform partner.
                </p>
                <div>
                  <p className="font-semibold mb-1">Email Content:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Market insights and real estate trends</li>
                    <li>New property listings</li>
                    <li>Real estate tips and advice</li>
                    <li>Local Coachella Valley news and events</li>
                    <li>Exclusive content and offers</li>
                  </ul>
                </div>
                <p><strong>Email Frequency:</strong> Weekly to monthly, depending on market activity and content availability.</p>
                <p><strong>Unsubscribe:</strong> Click the unsubscribe link at the bottom of any email to opt out immediately.</p>
                <p><strong>Email Provider:</strong> Newsletters are sent via SendFox. Your email address will be securely stored and managed through their platform.</p>
              </div>
            </section>

            {/* Privacy Policy */}
            <section>
              <h3 className={`text-xl font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Privacy Policy
              </h3>
              <div className="space-y-3 text-sm">
                <p>
                  Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information.
                </p>
                <div>
                  <p className="font-semibold mb-1">Information We Collect:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Contact information (name, email, phone, address)</li>
                    <li>Real estate preferences and goals</li>
                    <li>Communication preferences (SMS, email)</li>
                    <li>IP address and consent timestamps (for compliance)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-1">How We Use Your Information:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>To provide real estate services and communications</li>
                    <li>To send marketing messages (only with your consent)</li>
                    <li>To understand your real estate needs and preferences</li>
                    <li>To comply with legal and regulatory requirements</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-1">Information Sharing:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>We will <strong>never</strong> sell your personal information to third parties</li>
                    <li>Your information may be shared with our broker (eXp Realty) as required for real estate transactions</li>
                    <li>We use trusted service providers (SendFox for email, Twilio for SMS) who are contractually obligated to protect your data</li>
                    <li>We may disclose information if required by law or to protect our rights</li>
                  </ul>
                </div>
                <p><strong>Data Security:</strong> We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.</p>
                <p><strong>Your Rights:</strong> You have the right to access, correct, or delete your personal information. Contact us at josephsardella@gmail.com to exercise these rights.</p>
              </div>
            </section>

            {/* Terms and Conditions */}
            <section>
              <h3 className={`text-xl font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Terms and Conditions
              </h3>
              <div className="space-y-3 text-sm">
                <p>
                  By submitting this form, you agree to the following terms and conditions:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You provide your express written consent to receive communications as indicated by your selections</li>
                  <li>You confirm that the information provided is accurate and complete</li>
                  <li>You understand that consent is not a condition of purchase or sale of any property or service</li>
                  <li>You acknowledge that you can withdraw consent at any time using the opt-out methods provided</li>
                  <li>You agree that we may record consent details including date, time, and IP address for compliance purposes</li>
                </ul>
              </div>
            </section>

            {/* TCPA Compliance */}
            <section>
              <h3 className={`text-xl font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                TCPA Compliance Statement
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  This consent form complies with the Telephone Consumer Protection Act (TCPA). Your express written consent
                  is required and obtained before we send any marketing text messages to your mobile phone.
                </p>
                <p>
                  <strong>Important:</strong> Consent is not a condition of purchase. You may still work with Joseph Sardella
                  for real estate services even if you choose not to receive marketing communications.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className={`text-xl font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Questions or Concerns?
              </h3>
              <div className="space-y-2 text-sm">
                <p>If you have any questions about this privacy policy or our data practices, please contact us:</p>
                <ul className="list-none space-y-1">
                  <li><strong>Phone:</strong> (760) 333-2674</li>
                  <li><strong>Email:</strong> josephsardella@gmail.com</li>
                  <li><strong>Website:</strong> www.jpsrealtor.com</li>
                  <li><strong>Address:</strong> eXp Realty of Southern California, Palm Desert, CA</li>
                </ul>
              </div>
            </section>

            <div className={`border-t pt-4 mt-6 text-xs ${isLight ? 'border-gray-300 text-gray-600' : 'border-gray-700 text-gray-400'}`}>
              <p>Last Updated: December 2025</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <button
            onClick={() => setShowPrivacyModal(false)}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
              isLight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (submitted) {
    return (
      <SpaticalBackground showGradient={true}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className={`max-w-2xl w-full rounded-2xl shadow-2xl p-8 md:p-12 ${
            isLight ? 'bg-white/95 backdrop-blur-sm border-gray-200' : 'bg-gray-800/95 backdrop-blur-sm border-gray-700'
          }`}>
            <div className="text-left">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
                isLight ? 'bg-green-100' : 'bg-green-900/30'
              }`}>
                <Check className={`w-8 h-8 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
              </div>
              <h1 className={`text-3xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Thank You, {firstName}!
              </h1>
              <div className={`text-lg space-y-2 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                <p>Your marketing preferences have been saved:</p>
                <ul className="list-none space-y-2 mt-4">
                  {smsConsent && (
                    <li className="flex items-center justify-center gap-2">
                      <Check className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                      <span>SMS Text Messages (Automated & Person-to-Person)</span>
                    </li>
                  )}
                  {newsletterConsent && (
                    <li className="flex items-center justify-center gap-2">
                      <Check className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                      <span>Email Newsletter (via SendFox)</span>
                    </li>
                  )}
                </ul>
              </div>
              <div className={`mt-6 text-sm space-y-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {smsConsent && <p>Reply STOP to opt out of text messages anytime.</p>}
                {newsletterConsent && <p>Click unsubscribe in any email to opt out of the newsletter.</p>}
              </div>
            </div>
          </div>
        </div>
      </SpaticalBackground>
    );
  }

  return (
    <SpaticalBackground showGradient={true}>
      {showPrivacyModal && <PrivacyModal />}

      <div className="min-h-screen flex flex-col py-8">
        {/* Hero Section */}
        <CenterHero
          backgroundImage="/joey/about.png"
          maxWidth="max-w-4xl"
          showBusinessCard={true}
        />

        {/* Content Section - No top padding, form butts up against hero */}
        <div className="flex flex-col items-center justify-center flex-grow px-6 pb-12 mt-8">
          <div className={`max-w-4xl w-full shadow-2xl p-8 md:p-12 rounded-2xl border ${
            isLight ? 'bg-white/95 backdrop-blur-sm border-gray-200' : 'bg-gray-800/95 backdrop-blur-sm border-gray-700'
          }`}>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className={`text-4xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Stay Connected with Joseph Sardella
              </h1>
              <p className={`text-lg ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                Get the latest real estate insights, market updates, and property listings delivered to you
              </p>
              <p className={`text-sm mt-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                DRE# 02106916 | eXp Realty of Southern California
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(123) 456-7890"
                    required
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isLight
                      ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  >
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Real Estate Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Do you currently own real estate?
                  </label>
                  <select
                    value={ownsRealEstate}
                    onChange={(e) => setOwnsRealEstate(e.target.value as 'yes' | 'no')}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    When do you plan to buy/sell?
                  </label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isLight
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  >
                    <option value="">Select timeframe...</option>
                    {timeframeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real Estate Goals */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  What are your real estate goals?
                </label>
                <textarea
                  value={realEstateGoals}
                  onChange={(e) => setRealEstateGoals(e.target.value)}
                  rows={4}
                  placeholder="Tell us about your real estate goals, preferences, or any specific needs..."
                  className={`w-full px-4 py-3 rounded-lg border transition-all resize-none ${
                    isLight
                      ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400'
                      : 'border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-500'
                  }`}
                />
                <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Optional: Share details about properties you're interested in, neighborhoods, price range, or timeline.
                </p>
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-4">
                {/* SMS Consent */}
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isLight
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-blue-900/20 border-blue-700'
                }`}>
                  <input
                    id="smsConsent"
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="smsConsent" className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-200'} space-y-3`}>
                    <div>
                      <strong className={isLight ? 'text-blue-900' : 'text-blue-300'}>
                        SMS Text Messaging:
                      </strong>
                    </div>
                    <p>
                      I agree to receive non-marketing SMS messages regarding customer care, service updates, reminders, notifications, scheduling links, booking confirmations, and follow-ups. Message frequency may vary. Reply 'HELP' for assistance or 'STOP' to unsubscribe. Standard message and data rates may apply. My information will be handled in accordance with the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>Privacy Policy</a>.
                    </p>
                    <p>
                      I also agree to receive marketing SMS messages regarding promotional offers. Message frequency may vary. Reply 'HELP' for assistance or 'STOP' to unsubscribe. Standard message and data rates may apply. My information will be handled in accordance with the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>Privacy Policy</a>.
                    </p>
                  </label>

                </div>
                {/* Newsletter Consent */}
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-emerald-900/20 border-emerald-700'
                }`}>
                  <input
                    id="newsletterConsent"
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="newsletterConsent" className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    <strong className={isLight ? 'text-emerald-900' : 'text-emerald-300'}>
                      Email Newsletter (SendFox):
                    </strong> I agree to receive email newsletters from Joseph Sardella / JPS & Company LLC via SendFox.
                    I can unsubscribe at any time using the link in the emails.
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className={`p-4 rounded-lg border text-sm ${
                  isLight
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-red-900/20 border-red-800 text-red-300'
                }`}>
                  {error}
                </div>
              )}

              {/* Privacy Policy Link */}
              <div className="text-left">
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm underline flex-start ${
                    isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  View Privacy Policy
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (!smsConsent && !newsletterConsent)}
                className={`w-full py-4 px-6 rounded-lg font-semibold shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Marketing Consent'
                )}
              </button>

              <p className={`text-xs text-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                You must agree to at least one form of communication. Consent is not required to purchase or sell real estate.
              </p>
            </form>

            {/* Footer */}
            <div className={`mt-8 pt-6 border-t text-center text-sm ${
              isLight ? 'border-gray-200 text-gray-500' : 'border-gray-700 text-gray-400'
            }`}>
              <p>
                Joseph Sardella | DRE# 02106916<br />
                JPS & Company LLC | eXp Realty of Southern California<br />
                Palm Desert, CA
              </p>
            </div>
          </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}
