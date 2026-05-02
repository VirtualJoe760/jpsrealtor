'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import SpaticalBackground from '@/app/components/backgrounds/SpaticalBackground';
import CenterHero from '@/components/CenterHero';

export default function TermsOfServicePage() {
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
                Terms of Service
              </h1>
              <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Last Updated: April 22, 2026
              </p>
            </div>

            <div className={`space-y-8 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>

              {/* 1. Agreement to Terms */}
              <section>
                <h2 className={h2}>1. Agreement to Terms</h2>
                <p className={text}>
                  These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;you&quot; or &quot;User&quot;) and Joseph Sardella, licensed real estate agent (DRE# 02106916), operating as JPS &amp; Company LLC through eXp Realty of Southern California (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), governing your access to and use of the websites at{' '}
                  <a href="https://chatrealty.io" className={link}>chatrealty.io</a> and{' '}
                  <a href="https://josephsardella.com" className={link}>josephsardella.com</a>{' '}
                  (collectively, the &quot;Platform&quot;), including all features, content, tools, progressive web application (PWA), and related services.
                </p>
                <p className={`${text} mt-3`}>
                  By accessing or using the Platform, you agree to be bound by these Terms and our{' '}
                  <a href="/privacy-policy" className={link}>Privacy Policy</a>, which is incorporated herein by reference. If you do not agree to these Terms, you must not access or use the Platform.
                </p>
                <p className={`${text} mt-3`}>
                  We reserve the right to modify these Terms at any time. Material changes will be communicated through a notice on the Platform or by email. Your continued use of the Platform after such changes constitutes acceptance of the revised Terms.
                </p>
              </section>

              {/* 2. Eligibility */}
              <section>
                <h2 className={h2}>2. Eligibility</h2>
                <p className={text}>
                  You must be at least 18 years of age and have the legal capacity to enter into binding agreements to use the Platform. By using the Platform, you represent and warrant that you meet these requirements. If you are using the Platform on behalf of a business or entity, you represent that you have the authority to bind that entity to these Terms.
                </p>
              </section>

              {/* 3. Account Registration and Security */}
              <section>
                <h2 className={h2}>3. Account Registration and Security</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>3.1 Account Creation</h3>
                    <p className={text}>
                      Certain features of the Platform require you to create an account. You may register using your email and password, or through third-party authentication providers (Google, Facebook). You agree to provide accurate, current, and complete information during registration and to update such information as necessary.
                    </p>
                  </div>
                  <div>
                    <h3 className={h3}>3.2 Account Security</h3>
                    <p className={text}>
                      You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized access to or use of your account. We are not liable for any loss or damage arising from your failure to protect your account credentials. We offer optional two-factor authentication (2FA) via SMS to enhance your account security.
                    </p>
                  </div>
                  <div>
                    <h3 className={h3}>3.3 Account Termination</h3>
                    <p className={text}>
                      We reserve the right to suspend or terminate your account at our sole discretion, with or without notice, for conduct that we determine violates these Terms, is harmful to other users, or is otherwise objectionable. You may delete your account at any time by contacting us. Upon termination, your right to use the Platform ceases immediately, though certain provisions of these Terms survive termination.
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. Platform Services */}
              <section>
                <h2 className={h2}>4. Platform Services</h2>
                <p className={`${text} mb-4`}>The Platform provides the following services, subject to these Terms:</p>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>4.1 Property Search and Listing Information</h3>
                    <p className={text}>
                      The Platform provides access to real estate listing data sourced from the California Regional Multiple Listing Service (CRMLS) and affiliated MLS associations. Listing information including property details, photos, pricing, and status is provided for informational purposes only. While we strive to ensure accuracy, we do not guarantee that listing information is complete, current, or error-free. All listing data is subject to the terms and conditions of the applicable MLS.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>4.2 AI-Powered Assistant</h3>
                    <p className={text}>
                      The Platform includes an AI-powered real estate assistant that can answer questions about properties, neighborhoods, market conditions, and the home buying or selling process. The AI assistant is designed to provide helpful information but should not be considered a substitute for professional real estate advice, legal counsel, financial advice, or a home inspection. AI-generated responses may contain inaccuracies, and you should independently verify any information before making real estate decisions. We do not guarantee the accuracy, completeness, or suitability of AI-generated content.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>4.3 Market Analysis and CMA Reports</h3>
                    <p className={text}>
                      Comparative Market Analysis (CMA) reports, market statistics, pricing estimates, and trend data provided through the Platform are based on available data and analytical models. These are intended as informational tools only and should not be relied upon as appraisals or guarantees of property value. Actual property values may differ materially from estimates provided.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>4.4 Communication Services</h3>
                    <p className={text}>
                      The Platform facilitates communication between users and real estate professionals through chat, SMS, email, and other channels. By using these communication features, you consent to receiving messages from agents and the Platform. Standard messaging and data rates from your carrier may apply.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>4.5 Push Notifications</h3>
                    <p className={text}>
                      If you opt in to push notifications through our PWA, you consent to receiving notifications about property updates, market alerts, messages, and other relevant information. You may disable push notifications at any time through your browser or device settings.
                    </p>
                  </div>
                </div>
              </section>

              {/* 5. Agent and Professional Services */}
              <section>
                <h2 className={h2}>5. Agent and Professional Services</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>5.1 Real Estate Agent Services</h3>
                    <p className={text}>
                      The Platform serves as a technology tool to facilitate real estate services provided by licensed agents. The Platform itself does not provide real estate brokerage services. All real estate transactions are conducted through eXp Realty of Southern California or the applicable licensed brokerage. Any representation agreements, purchase contracts, or other legal documents are between you and the licensed real estate professional and/or brokerage.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>5.2 Agent Platform (Multi-Tenant)</h3>
                    <p className={text}>
                      Licensed real estate agents may apply to use the Platform&apos;s CRM, marketing, and lead management tools. Agent accounts are subject to additional terms, identity verification through Stripe Identity, and approval at our discretion. Agents are solely responsible for their compliance with applicable real estate laws, MLS rules, advertising regulations, and fair housing requirements when using the Platform&apos;s marketing tools.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>5.3 Marketing Campaigns</h3>
                    <p className={text}>
                      The Platform provides tools for agents to execute multi-channel marketing campaigns including email, SMS, ringless voicemail, direct mail, and digital advertising (Google Ads, Meta Ads). Agents using these tools represent and warrant that they have obtained all necessary consents from recipients, comply with the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, and all other applicable marketing and communications laws. We are not responsible for agents&apos; compliance with these laws.
                    </p>
                  </div>
                </div>
              </section>

              {/* 6. Subscription Plans and Payment */}
              <section>
                <h2 className={h2}>6. Subscription Plans and Payment</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>6.1 Subscription Tiers</h3>
                    <p className={text}>
                      The Platform offers multiple subscription tiers (Free, Pro, Ultimate, Investor) with varying levels of access to features and services. The features, limitations, and pricing for each tier are described on the Platform and may change from time to time. Certain features, including AI query limits, are subject to daily usage caps based on your subscription tier.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>6.2 Payment Processing</h3>
                    <p className={text}>
                      All payment processing is handled by Stripe, a PCI-DSS compliant third-party payment processor. By providing payment information, you authorize us to charge the applicable subscription fees to your designated payment method. You agree to Stripe&apos;s{' '}
                      <a href="https://stripe.com/legal" className={link} target="_blank" rel="noopener noreferrer">Terms of Service</a> in connection with your use of their payment processing services.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>6.3 Billing and Cancellation</h3>
                    <p className={text}>
                      Subscription fees are billed in advance on a recurring basis (monthly or annually). You may cancel your subscription at any time through your account settings or by contacting us. Cancellation takes effect at the end of the current billing period. We do not provide refunds for partial billing periods unless required by applicable law.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>6.4 Third-Party Service Costs</h3>
                    <p className={text}>
                      Certain Platform features incur additional costs charged by third-party providers, including but not limited to: direct mail printing and postage (Thanks.io), ringless voicemail delivery (Drop Cowboy), SMS messaging (Twilio), and digital advertising spend (Google Ads, Meta Ads). These costs are separate from your subscription fee and are your responsibility. Cost estimates provided on the Platform are approximate and may vary.
                    </p>
                  </div>
                </div>
              </section>

              {/* 7. Intellectual Property */}
              <section>
                <h2 className={h2}>7. Intellectual Property</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>7.1 Our Intellectual Property</h3>
                    <p className={text}>
                      The Platform, including its design, code, features, content, branding, logos, graphics, and all underlying technology, is owned by or licensed to us and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, lease, or create derivative works of any part of the Platform without our prior written consent.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>7.2 MLS and Listing Data</h3>
                    <p className={text}>
                      Real estate listing data displayed on the Platform is provided under license from the California Regional Multiple Listing Service (CRMLS) and affiliated MLS associations. This data is intended exclusively for the personal, non-commercial use of consumers and may not be used for any purpose other than identifying prospective properties for purchase. Listing data may not be reproduced, redistributed, or used to create a competing product or service without the express written permission of the applicable MLS.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>7.3 User-Generated Content</h3>
                    <p className={text}>
                      By submitting content to the Platform (including reviews, testimonials, photos, and messages), you grant us a non-exclusive, worldwide, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, display, and distribute such content in connection with the Platform and our business operations, including marketing and promotional purposes. You represent that you have the right to grant this license and that your content does not infringe the rights of any third party.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>7.4 AI-Generated Content</h3>
                    <p className={text}>
                      Content generated by our AI features (including chat responses, article drafts, voicemail scripts, and marketing copy) is provided as a tool for your use. You are responsible for reviewing, editing, and ensuring the accuracy and appropriateness of any AI-generated content before publishing or distributing it. We do not claim ownership of AI-generated content created at your direction, but we retain the right to use aggregated, anonymized data to improve our AI services.
                    </p>
                  </div>
                </div>
              </section>

              {/* 8. Prohibited Conduct */}
              <section>
                <h2 className={h2}>8. Prohibited Conduct</h2>
                <p className={`${text} mb-3`}>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Platform for any unlawful purpose or in violation of any applicable law or regulation.</li>
                  <li>Violate the Fair Housing Act or any fair housing laws, including discriminating on the basis of race, color, religion, national origin, sex, familial status, disability, or any other protected class.</li>
                  <li>Scrape, crawl, or use automated means to access, collect, or extract data from the Platform, including listing data, without our prior written consent.</li>
                  <li>Reproduce, redistribute, or commercially exploit MLS listing data or any other proprietary content from the Platform.</li>
                  <li>Interfere with or disrupt the Platform, its servers, or networks connected to the Platform.</li>
                  <li>Attempt to gain unauthorized access to any part of the Platform, other users&apos; accounts, or any systems or networks connected to the Platform.</li>
                  <li>Upload or transmit viruses, malware, or any malicious code.</li>
                  <li>Use the Platform to send unsolicited communications (spam) or in violation of the TCPA, CAN-SPAM Act, or similar laws.</li>
                  <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
                  <li>Use the AI chat or content generation features to generate harmful, abusive, defamatory, or illegal content.</li>
                  <li>Circumvent, disable, or interfere with any security features of the Platform.</li>
                  <li>Use the Platform in any manner that could overburden, damage, or impair the Platform&apos;s infrastructure.</li>
                  <li>Create multiple accounts to evade subscription limits, bans, or usage restrictions.</li>
                </ul>
              </section>

              {/* 9. Disclaimers */}
              <section>
                <h2 className={h2}>9. Disclaimers</h2>

                <div className={`p-4 rounded-lg border mb-4 ${
                  isLight ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-900/20 border-yellow-700'
                }`}>
                  <p className={`${text} font-semibold`}>
                    THE PLATFORM AND ALL CONTENT, FEATURES, AND SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                  </p>
                </div>

                <ul className="list-disc pl-6 space-y-3">
                  <li>We do not warrant that the Platform will be uninterrupted, error-free, secure, or free of viruses or other harmful components.</li>
                  <li>We do not warrant the accuracy, completeness, or reliability of any listing data, market statistics, CMA reports, property valuations, or AI-generated content available through the Platform.</li>
                  <li>We are not responsible for the actions, omissions, or conduct of any real estate agent, buyer, seller, or other user of the Platform.</li>
                  <li>We do not guarantee any specific results from the use of marketing campaign tools, including but not limited to lead generation, property sales, or advertising performance.</li>
                  <li>Third-party services integrated with the Platform (including but not limited to Stripe, Twilio, Google, Meta, Thanks.io, Drop Cowboy, and AI providers) are provided subject to their own terms and conditions. We are not responsible for the availability, accuracy, or performance of these third-party services.</li>
                  <li>Information provided about mortgage rates, economic indicators, and market forecasts is for informational purposes only and should not be construed as financial advice. Consult with a qualified financial professional before making financial decisions.</li>
                </ul>
              </section>

              {/* 10. Limitation of Liability */}
              <section>
                <h2 className={h2}>10. Limitation of Liability</h2>
                <div className={`p-4 rounded-lg border ${
                  isLight ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-900/20 border-yellow-700'
                }`}>
                  <p className={`${text} mb-3`}>
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WE, OUR OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Your use of or inability to use the Platform.</li>
                    <li>Any errors, inaccuracies, or omissions in listing data, market analysis, or AI-generated content.</li>
                    <li>Any real estate transaction conducted through or facilitated by the Platform.</li>
                    <li>Unauthorized access to or alteration of your data or account.</li>
                    <li>Actions or omissions of third-party service providers.</li>
                    <li>Marketing campaign results, including direct mail delivery, voicemail delivery, or digital advertising performance.</li>
                  </ul>
                  <p className={`${text} mt-3`}>
                    OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100).
                  </p>
                </div>
              </section>

              {/* 11. Indemnification */}
              <section>
                <h2 className={h2}>11. Indemnification</h2>
                <p className={text}>
                  You agree to indemnify, defend, and hold harmless Joseph Sardella, JPS &amp; Company LLC, eXp Realty of Southern California, and their respective officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or in connection with: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any applicable law or the rights of any third party; (d) your user-generated content; or (e) your use of marketing campaign tools in a manner that violates applicable laws, including the TCPA, CAN-SPAM Act, or fair housing laws.
                </p>
              </section>

              {/* 12. Dispute Resolution */}
              <section>
                <h2 className={h2}>12. Dispute Resolution</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className={h3}>12.1 Governing Law</h3>
                    <p className={text}>
                      These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>12.2 Informal Resolution</h3>
                    <p className={text}>
                      Before initiating any formal dispute resolution proceeding, you agree to first contact us at{' '}
                      <a href="mailto:help@josephsardella.com" className={link}>help@josephsardella.com</a>{' '}
                      and attempt to resolve the dispute informally for at least thirty (30) days.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>12.3 Arbitration</h3>
                    <p className={text}>
                      If the dispute cannot be resolved informally, you and we agree to resolve any disputes arising out of or relating to these Terms or the Platform through binding individual arbitration administered by JAMS under its Streamlined Arbitration Rules, except that either party may bring claims in small claims court if eligible. The arbitration shall be conducted in Riverside County, California. You and we agree that any arbitration shall be conducted on an individual basis and not as a class, consolidated, or representative action.
                    </p>
                  </div>

                  <div>
                    <h3 className={h3}>12.4 Class Action Waiver</h3>
                    <p className={`${text} font-semibold`}>
                      YOU AND WE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR OUR INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.
                    </p>
                  </div>
                </div>
              </section>

              {/* 13. Electronic Communications */}
              <section>
                <h2 className={h2}>13. Electronic Communications and Consent</h2>
                <p className={text}>
                  By creating an account or using the Platform, you consent to receive electronic communications from us, including emails, SMS messages, push notifications, and in-app messages. You agree that all agreements, notices, disclosures, and other communications we provide electronically satisfy any legal requirement that such communications be in writing. Standard messaging and data rates from your mobile carrier may apply to SMS communications. You may opt out of non-essential communications as described in our Privacy Policy.
                </p>
              </section>

              {/* 14. Digital Advertising */}
              <section>
                <h2 className={h2}>14. Digital Advertising and Retargeting</h2>
                <p className={text}>
                  The Platform uses tracking technologies including the Meta Pixel and Google Ads tags to deliver targeted advertising based on your interactions with the Platform. By using the Platform, you acknowledge that your browsing behavior may be used to create audience segments for retargeting purposes on third-party platforms including Google Search, Google Display Network, Facebook, and Instagram. You may opt out of personalized advertising through the advertising platform settings described in our Privacy Policy.
                </p>
              </section>

              {/* 15. Direct Mail and Physical Communications */}
              <section>
                <h2 className={h2}>15. Direct Mail and Physical Communications</h2>
                <p className={text}>
                  If you provide a mailing address through the Platform, you may receive physical mail including postcards, letters, or notecards related to real estate services, market updates, or promotional offers. Direct mail services are fulfilled by third-party providers. You may opt out of direct mail by contacting us at{' '}
                  <a href="mailto:help@josephsardella.com" className={link}>help@josephsardella.com</a>.
                </p>
              </section>

              {/* 16. Representation Agreements */}
              <section>
                <h2 className={h2}>16. Real Estate Representation Agreements</h2>
                <p className={text}>
                  The Platform facilitates the execution of buyer and seller representation agreements between you and licensed real estate agents. These agreements are legally binding contracts separate from these Terms. By electronically signing a representation agreement through the Platform, you acknowledge that: (a) you have read and understand the terms of the agreement; (b) your electronic signature has the same legal effect as a handwritten signature; and (c) your IP address and device information are recorded at the time of signing for verification purposes. Representation agreements may have defined terms, renewal provisions, and cancellation procedures as specified in the agreement itself.
                </p>
              </section>

              {/* 17. Third-Party Services */}
              <section>
                <h2 className={h2}>17. Third-Party Services and Links</h2>
                <p className={text}>
                  The Platform integrates with and contains links to third-party services, websites, and applications. These include but are not limited to Google Maps, Stripe, Twilio, Cloudinary, Meta, and various AI providers. Your use of these third-party services is subject to their respective terms of service and privacy policies. We do not control, endorse, or assume responsibility for any third-party services, and your interactions with third-party services are at your own risk.
                </p>
              </section>

              {/* 18. Severability */}
              <section>
                <h2 className={h2}>18. Severability and Waiver</h2>
                <p className={text}>
                  If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, or if modification is not possible, shall be severed from these Terms without affecting the validity and enforceability of the remaining provisions. Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
                </p>
              </section>

              {/* 19. Entire Agreement */}
              <section>
                <h2 className={h2}>19. Entire Agreement</h2>
                <p className={text}>
                  These Terms, together with our Privacy Policy and any additional agreements you enter into with us (including representation agreements and subscription agreements), constitute the entire agreement between you and us regarding your use of the Platform. These Terms supersede all prior or contemporaneous communications, proposals, and agreements, whether oral or written, between you and us regarding the Platform.
                </p>
              </section>

              {/* 20. Contact Information */}
              <section className={`p-6 rounded-lg border ${
                isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700'
              }`}>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  20. Contact Us
                </h2>
                <p className={`${text} mb-4`}>
                  If you have questions about these Terms of Service, please contact us:
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
