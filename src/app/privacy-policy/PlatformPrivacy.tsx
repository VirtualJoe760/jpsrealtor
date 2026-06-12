'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import SpaticalBackground from '@/app/components/backgrounds/SpaticalBackground';
import CenterHero from '@/components/CenterHero';

export default function PrivacyPolicyPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const h2 = `text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`;
  const h3 = `text-lg font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`;
  const link = `underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`;
  const text = 'leading-relaxed';

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
                Privacy Policy
              </h1>
              <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Last Updated: April 22, 2026
              </p>
            </div>

            <div className={`space-y-8 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>

              {/* 1. Introduction */}
              <section>
                <h2 className={h2}>1. Introduction</h2>
                <p className={text}>
                  This Privacy Policy describes how Joseph Sardella, licensed real estate agent (DRE# 02106916), operating as JPS &amp; Company LLC through eXp Realty of Southern California (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), collects, uses, shares, and protects your personal information when you access or use our websites at{' '}
                  <a href="https://chatrealty.io" className={link}>chatrealty.io</a> and{' '}
                  <a href="https://josephsardella.com" className={link}>josephsardella.com</a>{' '}
                  (collectively, the &quot;Platform&quot;), including our progressive web application (PWA), AI-powered chat features, real estate search tools, customer relationship management (CRM) tools, marketing campaign services, and all related services.
                </p>
                <p className={`${text} mt-3`}>
                  By accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please discontinue use of the Platform immediately.
                </p>
              </section>

              {/* 2. Information We Collect */}
              <section>
                <h2 className={h2}>2. Information We Collect</h2>
                <p className={`${text} mb-4`}>
                  We collect information in several ways depending on how you interact with our Platform.
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className={h3}>2.1 Information You Provide Directly</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Account Registration:</strong> Name, email address, phone number, password, and profile photo when you create an account.</li>
                      <li><strong>Authentication via Third Parties:</strong> If you sign in using Google or Facebook OAuth, we receive your name, email address, and profile picture from those services.</li>
                      <li><strong>Real Estate Preferences:</strong> Property types, price ranges, preferred locations, buying or selling timeline, and neighborhood interests you provide through search filters, saved searches, or conversations with our AI assistant.</li>
                      <li><strong>Contact Information:</strong> Names, phone numbers, email addresses, and mailing addresses you provide when requesting information, scheduling appointments, or submitting inquiry forms.</li>
                      <li><strong>Communication Content:</strong> Messages, emails, SMS texts, and chat conversations you send or receive through the Platform, including conversations with our AI-powered real estate assistant.</li>
                      <li><strong>Representation Agreements:</strong> Electronic signatures, agreement terms, IP address, and user-agent information captured at the time of signing buyer or seller representation agreements.</li>
                      <li><strong>Agent Applications:</strong> For real estate professionals applying to join our platform: license number, MLS ID, brokerage affiliation, years of experience, resume, cover letter, and identity verification documents.</li>
                      <li><strong>Payment Information:</strong> Credit card numbers, billing addresses, and payment details processed through our third-party payment processor Stripe. We do not store your full credit card number on our servers.</li>
                      <li><strong>Voice Data:</strong> Voice recordings and audio samples if you use our voice training features for AI-powered voicemail campaigns.</li>
                      <li><strong>User-Generated Content:</strong> Photos, videos, reviews, testimonials, and other content you upload or submit to the Platform.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>2.2 Information Collected Automatically</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Device and Browser Information:</strong> IP address, browser type and version, operating system, device type (mobile, desktop, tablet), screen resolution, and unique device identifiers.</li>
                      <li><strong>Usage Data:</strong> Pages viewed, links clicked, search queries, listing views, time spent on pages, referring URLs, and navigation paths through the Platform.</li>
                      <li><strong>Location Data:</strong> Approximate geographic location derived from your IP address. If you grant permission, precise geolocation data from your device for map-based property searches and radius-based features.</li>
                      <li><strong>Cookies and Tracking Technologies:</strong> We use cookies, pixels, and similar technologies to maintain your session, remember your preferences (such as theme settings), and collect analytics data. See Section 7 for details.</li>
                      <li><strong>Push Notification Data:</strong> If you subscribe to push notifications through our PWA, we store your device endpoint, encryption keys, and device type to deliver notifications.</li>
                      <li><strong>Property Interaction Data:</strong> Listings you favorite, save, compare, dismiss, or view, including the frequency and recency of these interactions.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>2.3 Information from Third-Party Sources</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>MLS Data:</strong> Property listing information including addresses, prices, property characteristics, photos, and sales history from the California Regional Multiple Listing Service (CRMLS) and affiliated MLS associations.</li>
                      <li><strong>Public Records:</strong> Property ownership records, tax assessments, and transaction history from publicly available sources.</li>
                      <li><strong>Contact Enrichment:</strong> We may supplement contact information you provide with additional data from third-party data providers to improve accuracy and completeness.</li>
                      <li><strong>Market Data:</strong> Mortgage rates, economic indicators, and market statistics from the Federal Reserve Economic Data (FRED) service and other financial data providers.</li>
                      <li><strong>Business Listings:</strong> Neighborhood information, business reviews, and points of interest from services such as Yelp and Google Maps.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. How We Use Your Information */}
              <section>
                <h2 className={h2}>3. How We Use Your Information</h2>
                <p className={`${text} mb-4`}>We use the information we collect for the following purposes:</p>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>3.1 Providing Real Estate Services</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Displaying property listings, neighborhood information, and market data relevant to your search criteria.</li>
                      <li>Generating Comparative Market Analysis (CMA) reports using current and historical sales data.</li>
                      <li>Facilitating communication between you and real estate agents.</li>
                      <li>Processing property inquiries, appointment requests, and showing schedules.</li>
                      <li>Managing buyer and seller representation agreements.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>3.2 AI-Powered Features</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Providing real-time conversational assistance through our AI chat feature, which uses your questions and preferences to deliver relevant property recommendations, market insights, and neighborhood information.</li>
                      <li>Generating and personalizing content including property descriptions, market reports, blog articles, and marketing materials.</li>
                      <li>Producing AI-generated voicemail scripts and audio for marketing campaigns.</li>
                      <li>Your chat conversations may be stored to improve the quality of responses and maintain conversation context across sessions. You may have up to five concurrent conversation threads.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>3.3 Marketing and Communications</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Sending transactional emails including account verification, password resets, and appointment confirmations.</li>
                      <li>Delivering marketing communications including property alerts, market updates, newsletters, and promotional offers, subject to your communication preferences.</li>
                      <li>Executing multi-channel marketing campaigns that may include email, SMS, ringless voicemail, and direct mail on behalf of real estate agents using our platform.</li>
                      <li>Running targeted digital advertising campaigns through Google Ads and Meta (Facebook/Instagram) to promote property listings and real estate services.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>3.4 Analytics and Improvement</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Analyzing usage patterns to improve Platform functionality, performance, and user experience.</li>
                      <li>Monitoring search engine performance and optimizing our content for discoverability.</li>
                      <li>Measuring the effectiveness of marketing campaigns and advertising spend.</li>
                      <li>Conducting market research and generating aggregate real estate market statistics.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>3.5 Security and Compliance</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Verifying your identity for account security and two-factor authentication via SMS.</li>
                      <li>Detecting, preventing, and responding to fraud, abuse, or security incidents.</li>
                      <li>Complying with legal obligations, including real estate licensing requirements and consumer protection laws.</li>
                      <li>Enforcing our Terms of Service and other agreements.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. How We Share Your Information */}
              <section>
                <h2 className={h2}>4. How We Share Your Information</h2>
                <p className={`${text} mb-4 font-semibold`}>
                  We do not sell your personal information to third parties for their own marketing purposes.
                </p>
                <p className={`${text} mb-4`}>
                  We may share your information in the following circumstances:
                </p>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>4.1 Service Providers</h3>
                    <p className={text}>We share information with third-party service providers who perform services on our behalf, including:</p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li><strong>Payment Processing:</strong> Stripe processes payment transactions and identity verification. Stripe&apos;s use of your data is governed by the <a href="https://stripe.com/privacy" className={link} target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>.</li>
                      <li><strong>Communications:</strong> Twilio (SMS and voice), Resend and SendFox (email delivery) process messages on our behalf.</li>
                      <li><strong>Cloud Infrastructure:</strong> MongoDB (database hosting on DigitalOcean), Cloudinary (image and video storage and delivery), and Vercel (web application hosting).</li>
                      <li><strong>AI Services:</strong> Anthropic (Claude AI) and Groq process your chat messages and content generation requests. Conversations may be processed by these providers to generate responses.</li>
                      <li><strong>Video Generation:</strong> HeyGen, Runway ML, and Kling AI may process media content for marketing video creation.</li>
                      <li><strong>Direct Mail:</strong> Thanks.io receives recipient names and mailing addresses to print and deliver physical mail pieces on behalf of agents using our platform.</li>
                      <li><strong>Voicemail Delivery:</strong> Drop Cowboy receives phone numbers and pre-recorded audio to deliver ringless voicemail messages for marketing campaigns.</li>
                      <li><strong>Mapping and Geocoding:</strong> Google Maps, Mapbox, MapTiler, and OpenCage process location data to provide interactive maps and address lookup services.</li>
                      <li><strong>Contact Enrichment:</strong> Third-party data providers may receive contact information to supplement and verify accuracy.</li>
                    </ul>
                    <p className={`${text} mt-2`}>
                      These service providers are contractually bound to use your information only for the purposes of providing their services to us and are required to maintain the confidentiality and security of your data.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>4.2 Advertising Partners</h3>
                    <p className={text}>
                      We share data with advertising platforms to deliver targeted advertising and measure campaign effectiveness:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li><strong>Google Analytics and Google Ads:</strong> We use Google Analytics (Measurement ID: G-613BBEB2FS) to analyze website traffic and Google Ads to run search and display advertising campaigns. Google may use cookies and tracking technologies subject to <a href="https://policies.google.com/privacy" className={link} target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.</li>
                      <li><strong>Meta (Facebook/Instagram):</strong> We use the Meta Pixel and Conversions API (CAPI) to track website events, build retargeting audiences, and measure advertising performance. Meta&apos;s use of this data is governed by <a href="https://www.facebook.com/privacy/policy/" className={link} target="_blank" rel="noopener noreferrer">Meta&apos;s Privacy Policy</a>.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>4.3 Real Estate Professionals</h3>
                    <p className={text}>
                      If you submit an inquiry, request a showing, or otherwise express interest in a property or real estate services, your contact information and inquiry details may be shared with the listing agent or the real estate professional best suited to assist you.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>4.4 Legal Requirements</h3>
                    <p className={text}>
                      We may disclose your information when required by law, subpoena, court order, or governmental regulation, or when we believe in good faith that disclosure is necessary to protect our rights, your safety, the safety of others, investigate fraud, or respond to a government request.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>4.5 Business Transfers</h3>
                    <p className={text}>
                      In the event of a merger, acquisition, reorganization, bankruptcy, or sale of all or a portion of our assets, your personal information may be transferred as part of that transaction. We will notify you via email or prominent notice on the Platform of any change in ownership or uses of your personal information.
                    </p>
                  </div>
                </div>
              </section>

              {/* 5. Data Retention */}
              <section>
                <h2 className={h2}>5. Data Retention</h2>
                <p className={text}>
                  We retain your personal information for as long as your account is active or as needed to provide you with our services. Specific retention periods include:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li><strong>Account Data:</strong> Retained for the duration of your account and for up to 3 years after account closure for legal and compliance purposes.</li>
                  <li><strong>Chat Conversations:</strong> AI chat conversation history is retained to maintain context and improve service quality. You may request deletion at any time.</li>
                  <li><strong>Transaction Records:</strong> Real estate transaction records and representation agreements are retained for a minimum of 5 years as required by California real estate regulations.</li>
                  <li><strong>Marketing Campaign Data:</strong> Campaign execution records, including delivery receipts and engagement metrics, are retained for up to 3 years.</li>
                  <li><strong>MLS Listing Data:</strong> Property listing data is updated daily and historical sales data is retained for up to 5 years for market analysis purposes.</li>
                  <li><strong>Analytics Data:</strong> Aggregated and anonymized analytics data may be retained indefinitely.</li>
                </ul>
              </section>

              {/* 6. Data Security */}
              <section>
                <h2 className={h2}>6. Data Security</h2>
                <p className={text}>
                  We implement industry-standard security measures to protect your personal information, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>Encryption of data in transit using TLS/SSL protocols.</li>
                  <li>Encryption of sensitive data at rest in our database, including TLS-enabled MongoDB connections.</li>
                  <li>Secure password hashing using bcrypt algorithms.</li>
                  <li>Two-factor authentication (2FA) via SMS for account security.</li>
                  <li>HttpOnly, Secure, and SameSite cookie flags for session management.</li>
                  <li>PCI-DSS compliant payment processing through Stripe (we never store full credit card numbers).</li>
                  <li>Regular security audits and vulnerability assessments.</li>
                  <li>Access controls limiting employee and contractor access to personal data on a need-to-know basis.</li>
                </ul>
                <p className={`${text} mt-3`}>
                  While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to promptly notifying affected users in the event of a data breach as required by applicable law.
                </p>
              </section>

              {/* 7. Cookies and Tracking Technologies */}
              <section>
                <h2 className={h2}>7. Cookies and Tracking Technologies</h2>
                <p className={`${text} mb-4`}>We use the following cookies and tracking technologies:</p>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>7.1 Essential Cookies</h3>
                    <p className={text}>
                      Session cookies required for authentication, security, and basic Platform functionality. These cannot be disabled without affecting your ability to use the Platform.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>7.2 Preference Cookies</h3>
                    <p className={text}>
                      Cookies that remember your settings such as theme preference (light/dark mode), language, and display options.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>7.3 Analytics Cookies</h3>
                    <p className={text}>
                      Google Analytics cookies that help us understand how visitors interact with the Platform, including page views, session duration, bounce rates, and traffic sources. You can opt out of Google Analytics by installing the{' '}
                      <a href="https://tools.google.com/dlpage/gaoptout" className={link} target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>7.4 Advertising Cookies and Pixels</h3>
                    <p className={text}>
                      The Meta Pixel and Google Ads conversion tracking tags collect information about your browsing behavior to deliver relevant advertisements and measure campaign performance. You can manage your ad preferences through{' '}
                      <a href="https://www.facebook.com/settings/?tab=ads" className={link} target="_blank" rel="noopener noreferrer">Facebook Ad Settings</a> and{' '}
                      <a href="https://adssettings.google.com" className={link} target="_blank" rel="noopener noreferrer">Google Ad Settings</a>.
                    </p>
                  </div>
                </div>

                <p className={`${text} mt-4`}>
                  Most web browsers allow you to control cookies through their settings. However, disabling certain cookies may limit your ability to use some features of the Platform.
                </p>
              </section>

              {/* 8. Your Privacy Rights */}
              <section>
                <h2 className={h2}>8. Your Privacy Rights</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>8.1 California Residents (CCPA/CPRA)</h3>
                    <p className={text}>
                      If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li><strong>Right to Know:</strong> You may request information about the categories and specific pieces of personal information we have collected, used, disclosed, or sold about you in the past 12 months.</li>
                      <li><strong>Right to Delete:</strong> You may request deletion of personal information we have collected from you, subject to certain exceptions.</li>
                      <li><strong>Right to Correct:</strong> You may request correction of inaccurate personal information we maintain about you.</li>
                      <li><strong>Right to Opt-Out of Sale/Sharing:</strong> We do not sell your personal information. We share certain data with advertising partners (Google, Meta) for targeted advertising purposes. You may opt out of this sharing.</li>
                      <li><strong>Right to Limit Use of Sensitive Information:</strong> You may limit our use of sensitive personal information to purposes necessary for providing our services.</li>
                      <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your privacy rights.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className={h3}>8.2 Other Jurisdictions</h3>
                    <p className={text}>
                      Depending on your location, you may have additional rights under applicable data protection laws, including the right to access, rectification, erasure, restriction of processing, data portability, and the right to object to processing.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>8.3 Exercising Your Rights</h3>
                    <p className={text}>
                      To exercise any of these rights, contact us at{' '}
                      <a href="mailto:help@josephsardella.com" className={link}>help@josephsardella.com</a>{' '}
                      or call <a href="tel:7603333676" className={link}>(760) 333-3676</a>. We will respond to verifiable requests within 45 days. You may also manage certain preferences directly through your account settings.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>8.4 Communication Opt-Out</h3>
                    <p className={text}>
                      You may opt out of marketing communications at any time by clicking the &quot;unsubscribe&quot; link in any marketing email, replying STOP to any marketing SMS, or adjusting your communication preferences in your account settings. Opting out of marketing communications does not affect transactional messages related to your account or active real estate transactions.
                    </p>
                  </div>
                </div>
              </section>

              {/* 9. Children's Privacy */}
              <section>
                <h2 className={h2}>9. Children&apos;s Privacy</h2>
                <p className={text}>
                  The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we learn that we have collected personal information from a child under 18, we will take steps to delete that information promptly. If you believe a child has provided us with personal information, please contact us at{' '}
                  <a href="mailto:help@josephsardella.com" className={link}>help@josephsardella.com</a>.
                </p>
              </section>

              {/* 10. Third-Party Links */}
              <section>
                <h2 className={h2}>10. Third-Party Links and Services</h2>
                <p className={text}>
                  The Platform may contain links to third-party websites, including MLS listing sources, mapping services, social media platforms, and advertising networks. We are not responsible for the privacy practices of these third-party sites. We encourage you to review the privacy policies of any third-party sites you visit.
                </p>
              </section>

              {/* 11. International Data Transfers */}
              <section>
                <h2 className={h2}>11. International Data Transfers</h2>
                <p className={text}>
                  Our Platform is hosted in the United States and our services are primarily directed to users in the United States. If you access the Platform from outside the United States, your information may be transferred to, stored, and processed in the United States where data protection laws may differ from those in your jurisdiction. By using the Platform, you consent to the transfer of your information to the United States.
                </p>
              </section>

              {/* 12. Changes to This Policy */}
              <section>
                <h2 className={h2}>12. Changes to This Privacy Policy</h2>
                <p className={text}>
                  We may update this Privacy Policy from time to time to reflect changes in our practices, services, or applicable laws. When we make material changes, we will update the &quot;Last Updated&quot; date at the top of this page and, where appropriate, notify you by email or through a notice on the Platform. Your continued use of the Platform after any changes constitutes your acceptance of the updated Privacy Policy.
                </p>
              </section>

              {/* 13. Contact Information */}
              <section className={`p-6 rounded-lg border ${
                isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700'
              }`}>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  13. Contact Us
                </h2>
                <p className={`${text} mb-4`}>
                  If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="space-y-2">
                  <p>
                    <strong>Joseph Sardella</strong><br />
                    Real Estate Agent | DRE# 02106916<br />
                    JPS &amp; Company LLC<br />
                    eXp Realty of Southern California
                  </p>
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:help@josephsardella.com" className={link}>help@josephsardella.com</a>
                  </p>
                  <p>
                    <strong>Phone:</strong>{' '}
                    <a href="tel:7603333676" className={link}>(760) 333-3676</a>
                  </p>
                  <p>
                    <strong>Website:</strong>{' '}
                    <a href="https://chatrealty.io" className={link}>chatrealty.io</a>
                  </p>
                  <p>
                    <strong>Mailing Address:</strong><br />
                    Palm Desert, California 92260
                  </p>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}
