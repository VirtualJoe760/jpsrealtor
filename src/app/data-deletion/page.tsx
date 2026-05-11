'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import SpaticalBackground from '@/app/components/backgrounds/SpaticalBackground';
import CenterHero from '@/components/CenterHero';

export default function DataDeletionPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const h2 = `text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`;
  const link = `underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`;
  const text = 'leading-relaxed';
  const code = `px-1.5 py-0.5 rounded text-sm font-mono ${isLight ? 'bg-gray-100 text-gray-800' : 'bg-gray-700 text-gray-200'}`;

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen flex flex-col py-8">
        <CenterHero
          backgroundImage="https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about.png"
          maxWidth="max-w-5xl"
          showBusinessCard={true}
        />

        <div className="flex flex-col items-center justify-center flex-grow px-6 pb-12 mt-8">
          <div className={`max-w-5xl w-full shadow-2xl p-8 md:p-12 rounded-2xl border ${
            isLight ? 'bg-white/95 backdrop-blur-sm border-gray-200' : 'bg-gray-800/95 backdrop-blur-sm border-gray-700'
          }`}>
            <div className="mb-8">
              <h1 className={`text-4xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Data Deletion Instructions
              </h1>
              <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Last Updated: May 11, 2026
              </p>
            </div>

            <div className={`space-y-8 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>

              <section>
                <h2 className={h2}>How to Delete Your Data</h2>
                <p className={text}>
                  You have the right to request deletion of any personal data we hold about you, including
                  information collected through Facebook Login, Meta Business integration, or any other use
                  of the chatRealty platform (operated by Joseph Sardella, DRE# 02106916, through eXp
                  Realty of Southern California).
                </p>
                <p className={`${text} mt-3`}>
                  To request deletion, please follow one of the two methods below.
                </p>
              </section>

              <section>
                <h2 className={h2}>Option 1: Delete From Your Account</h2>
                <p className={text}>
                  If you have an active chatRealty account, the fastest way to remove your data is to
                  delete your account directly:
                </p>
                <ol className={`${text} mt-3 list-decimal pl-6 space-y-2`}>
                  <li>
                    Sign in at{' '}
                    <a href="https://chatrealty.io/auth/signin" className={link}>chatrealty.io/auth/signin</a>
                  </li>
                  <li>Open your account settings</li>
                  <li>Click <span className={code}>Delete Account</span> and confirm</li>
                </ol>
                <p className={`${text} mt-3`}>
                  Deleting your account immediately removes your profile, contacts, campaigns, connected
                  ad-account credentials (Meta access tokens, Facebook Page references, Google Ads
                  credentials), and all associated data from our active systems.
                </p>
              </section>

              <section>
                <h2 className={h2}>Option 2: Email a Deletion Request</h2>
                <p className={text}>
                  If you no longer have access to your account, or if you used Facebook Login and want
                  the data associated with your Facebook identity removed, send us a request:
                </p>
                <div className={`mt-3 p-4 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-700/50'}`}>
                  <p className={text}>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:privacy@chatrealty.io?subject=Data%20Deletion%20Request"
                       className={link}>privacy@chatrealty.io</a>
                  </p>
                  <p className={`${text} mt-2`}>
                    <strong>Subject line:</strong> <span className={code}>Data Deletion Request</span>
                  </p>
                  <p className={`${text} mt-2`}>
                    <strong>Please include:</strong>
                  </p>
                  <ul className={`${text} mt-1 list-disc pl-6 space-y-1`}>
                    <li>The email address associated with your chatRealty account, if any</li>
                    <li>Your Facebook user ID or the name on your Facebook profile, if you used Facebook Login</li>
                    <li>A brief confirmation that you are the account owner</li>
                  </ul>
                </div>
                <p className={`${text} mt-3`}>
                  We will verify your identity, remove your personal data from our systems, and confirm
                  completion by email within <strong>30 days</strong> of receiving your request.
                </p>
              </section>

              <section>
                <h2 className={h2}>What Gets Deleted</h2>
                <p className={text}>When you request deletion, we remove:</p>
                <ul className={`${text} mt-2 list-disc pl-6 space-y-1`}>
                  <li>Your profile information (name, email, phone, photo)</li>
                  <li>Authentication credentials and any stored OAuth tokens (Meta access tokens, Facebook Page tokens, Google Ads refresh tokens, Google Calendar tokens)</li>
                  <li>Contacts, saved searches, and favorites</li>
                  <li>Campaigns, ad creatives, and message history you created on the Platform</li>
                  <li>Cached references to your Meta Business assets (Ad Accounts, Pages, Custom Audiences)</li>
                  <li>Activity logs, chat history, and analytics data tied to your account</li>
                </ul>
                <p className={`${text} mt-3`}>
                  <strong>Note:</strong> Deletion of your account on chatRealty does NOT automatically
                  delete ad campaigns or other assets created on your Meta Ad Account or Google Ads
                  account. Those live on the respective platforms and must be deleted directly through
                  Meta Ads Manager or Google Ads. If you authorized chatRealty to manage your Meta
                  Business assets, simply revoking access in your{' '}
                  <a href="https://www.facebook.com/settings?tab=business_tools"
                     className={link} target="_blank" rel="noopener noreferrer">
                    Facebook Business Integrations
                  </a>{' '}
                  panel also instructs us to discard your stored credentials on our next check.
                </p>
              </section>

              <section>
                <h2 className={h2}>Records We May Retain</h2>
                <p className={text}>
                  Certain records may be retained as required by law or for legitimate business reasons,
                  including transaction records (for tax and accounting), records related to legally
                  mandated real estate disclosures, and anonymized aggregate analytics that cannot be
                  used to re-identify you. Retention periods and our overall data practices are
                  described in detail in our{' '}
                  <a href="https://chatrealty.io/privacy-policy" className={link}>Privacy Policy</a>.
                </p>
              </section>

              <section>
                <h2 className={h2}>Questions</h2>
                <p className={text}>
                  If you have questions about this process or about how we handle your data, contact us
                  at{' '}
                  <a href="mailto:privacy@chatrealty.io" className={link}>privacy@chatrealty.io</a>.
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}
