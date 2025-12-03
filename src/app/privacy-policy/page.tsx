'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import SpaticalBackground from '@/app/components/backgrounds/SpaticalBackground';
import CenterHero from '@/components/CenterHero';

export default function PrivacyPolicyPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen flex flex-col py-8">
        {/* Hero Section */}
        <CenterHero
          backgroundImage="/joey/about.png"
          maxWidth="max-w-5xl"
          showBusinessCard={true}
        />

        {/* Content Section */}
        <div className="flex flex-col items-center justify-center flex-grow px-6 pb-12 mt-8">
          <div className={`max-w-5xl w-full shadow-2xl p-8 md:p-12 rounded-2xl border ${
            isLight ? 'bg-white/95 backdrop-blur-sm border-gray-200' : 'bg-gray-800/95 backdrop-blur-sm border-gray-700'
          }`}>
            {/* Header */}
            <div className="mb-8">
              <h1 className={`text-4xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Privacy Policy
              </h1>
              <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Last Updated: December 2025
              </p>
            </div>

            {/* Content */}
            <div className={`space-y-8 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              {/* Introduction */}
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  1. Introduction
                </h2>
                <p className="leading-relaxed">
                  Welcome! Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website{' '}
                  <a href="https://jpsrealtor.com" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>
                    jpsrealtor.com
                  </a>{' '}
                  |{' '}
                  <a href="https://josephsardella.com" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>
                    josephsardella.com
                  </a>
                </p>
              </section>

              {/* Information We Collect */}
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  2. Information We Collect
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-lg font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      Personal Information
                    </h3>
                    <p className="leading-relaxed">
                      When you register, make a purchase, or contact us, we may collect personal information such as your name, email address, phone number, and billing information.
                    </p>
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      Usage Data
                    </h3>
                    <p className="leading-relaxed">
                      We may collect information about your device, browser, and how you interact with our website (e.g., pages viewed, links clicked).
                    </p>
                  </div>
                </div>
              </section>

              {/* How We Use Your Information */}
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  3. How We Use Your Information
                </h2>
                <p className="leading-relaxed mb-3">We use the collected data to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and manage our services</li>
                  <li>Improve your user experience</li>
                  <li>Send you updates, promotional materials, or important information</li>
                  <li>Monitor and analyze usage to improve site functionality and security</li>
                </ul>
              </section>

              {/* Information Sharing */}
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  4. Information Sharing
                </h2>
                <p className="leading-relaxed mb-4 font-semibold">
                  We do not sell, rent, or share your personal information with third-party companies for their marketing purposes.
                </p>
                <p className="leading-relaxed mb-3">
                  However, we may share your information in the following situations:
                </p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    <strong>Service Providers:</strong> We may share non-personal or aggregated data with third-party vendors who assist us in providing services, but they are bound by confidentiality agreements and are only authorized to use the information for the specified purposes.
                  </li>
                  <li>
                    <strong>Compliance:</strong> We may share information if required by law or to comply with legal processes or requests by government entities.
                  </li>
                </ul>
              </section>

              {/* Security */}
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  5. Security of Your Information
                </h2>
                <p className="leading-relaxed">
                  We use administrative, technical, and physical security measures to protect your personal information. However, please remember that no data transmission over the Internet is 100% secure.
                </p>
              </section>

              {/* Privacy Rights */}
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  6. Your Privacy Rights
                </h2>
                <p className="leading-relaxed">
                  Depending on your location, you may have certain rights regarding your personal information, such as access, correction, deletion, and portability. Contact us at{' '}
                  <a href="mailto:help@josephsardella.com" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>
                    help@josephsardella.com
                  </a>{' '}
                  to make a request.
                </p>
              </section>

              {/* Policy Updates */}
              <section>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  7. Policy Updates
                </h2>
                <p className="leading-relaxed">
                  We may update this Privacy Policy occasionally. Updates will be posted on this page with a revised date.
                </p>
              </section>

              {/* Contact Information */}
              <section className={`p-6 rounded-lg border ${
                isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700'
              }`}>
                <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Contact Us
                </h2>
                <p className="leading-relaxed mb-4">
                  If you have questions or concerns about this Privacy Policy, please contact us:
                </p>
                <div className="space-y-2">
                  <p>
                    <strong>Joseph Sardella</strong><br />
                    Real Estate Agent | DRE# 02106916<br />
                    JPS & Company LLC<br />
                    eXp Realty of Southern California
                  </p>
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:help@josephsardella.com" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>
                      help@josephsardella.com
                    </a>
                  </p>
                  <p>
                    <strong>Phone:</strong>{' '}
                    <a href="tel:7603332674" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>
                      (760) 333-2674
                    </a>
                  </p>
                  <p>
                    <strong>Website:</strong>{' '}
                    <a href="https://jpsrealtor.com" className={`underline ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>
                      jpsrealtor.com
                    </a>
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
