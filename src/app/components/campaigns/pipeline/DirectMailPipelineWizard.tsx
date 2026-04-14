'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useThemeClasses } from '@/app/contexts/ThemeContext';
import PipelineStepIndicator, { DIRECT_MAIL_STEPS } from './PipelineStepIndicator';
import PipelineContactsStep from './PipelineContactsStep';
import { MAIL_PRICING } from '@/lib/thanksio';

const PinDropMap = dynamic(() => import('../PinDropMap'), { ssr: false });

type MailType = 'postcard_4x6' | 'postcard_6x9' | 'postcard_6x11' | 'letter' | 'notecard';

interface DirectMailPipelineWizardProps {
  campaign: any;
  onRefresh?: () => void;
}

interface MailDesign {
  mailType: MailType;
  frontImageUrl: string;
  backImageUrl: string;
  message: string;
  handwritingStyle?: number;
  qrUrl: string;
  returnAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

const MAIL_TYPE_OPTIONS: { value: MailType; label: string; price: string; description: string }[] = [
  { value: 'postcard_4x6', label: 'Postcard (4x6)', price: '$0.99', description: 'Standard postcard — great for just listed/sold' },
  { value: 'postcard_6x9', label: 'Postcard (6x9)', price: '$1.59', description: 'Large postcard — ideal for CMA reports and highlights' },
  { value: 'postcard_6x11', label: 'Postcard (6x11)', price: '$1.99', description: 'Oversized postcard — maximum visual impact' },
  { value: 'letter', label: 'Letter', price: '$1.99', description: 'Printed letter in envelope — detailed CMA, personal outreach' },
  { value: 'notecard', label: 'Handwritten Notecard', price: '$2.79', description: 'Simulated handwriting — thank you notes, follow-ups' },
];

export default function DirectMailPipelineWizard({
  campaign,
  onRefresh,
}: DirectMailPipelineWizardProps) {
  const { currentTheme } = useTheme();
  const { cardBg, cardBorder, textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [currentStep, setCurrentStep] = useState('contacts');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [contactCount, setContactCount] = useState(campaign.totalContacts || 0);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Recipient mode: CRM contacts or radius send
  const [recipientMode, setRecipientMode] = useState<'contacts' | 'radius'>('contacts');
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusAddress, setRadiusAddress] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(5);

  const [design, setDesign] = useState<MailDesign>({
    mailType: 'postcard_4x6',
    frontImageUrl: '',
    backImageUrl: '',
    message: '',
    qrUrl: '',
    returnAddress: {
      name: 'Joseph Sardella | JP\'s Realtor',
      address: '',
      city: '',
      state: 'CA',
      zip: '',
    },
  });

  const steps = DIRECT_MAIL_STEPS.map(s => s.id);

  const handleNext = (fromStep: string) => {
    if (!completedSteps.includes(fromStep)) {
      setCompletedSteps([...completedSteps, fromStep]);
    }
    const idx = steps.indexOf(fromStep);
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1]);
    }
  };

  const handleBack = (fromStep: string) => {
    const idx = steps.indexOf(fromStep);
    if (idx > 0) {
      setCurrentStep(steps[idx - 1]);
    }
  };

  const estimatedCost = (MAIL_PRICING[design.mailType] || 0.99) * contactCount;

  const handleSend = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailType: design.mailType,
          frontImageUrl: design.frontImageUrl,
          backImageUrl: design.backImageUrl,
          message: design.message,
          handwritingStyle: design.handwritingStyle,
          qrUrl: design.qrUrl,
          returnAddress: design.returnAddress,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: true, message: `Successfully submitted ${data.mailPiecesCreated || contactCount} mail pieces!` });
        if (!completedSteps.includes('send')) {
          setCompletedSteps([...completedSteps, 'send']);
        }
        onRefresh?.();
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send mail' });
      }
    } catch (err) {
      setSendResult({ success: false, message: 'Network error — please try again' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PipelineStepIndicator
        steps={DIRECT_MAIL_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => setCurrentStep(step)}
      />

      <div className="mt-8">
        {/* Step 1: Contacts / Recipients */}
        {currentStep === 'contacts' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Choose Recipients</h3>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Mail to your CRM contacts or send to every address in a radius.
              </p>

              {/* Mode Toggle */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setRecipientMode('contacts')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                    recipientMode === 'contacts'
                      ? isLight ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  CRM Contacts ({contactCount})
                </button>
                <button
                  onClick={() => setRecipientMode('radius')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                    recipientMode === 'radius'
                      ? isLight ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Radius Send
                </button>
              </div>

              {recipientMode === 'radius' && (
                <div className="space-y-4">
                  <p className={`text-sm ${textSecondary}`}>
                    Drop a pin on the map to mail to every residential address within your radius.
                    Thanks.io handles address resolution — no contact list needed.
                  </p>

                  {/* Radius slider */}
                  <div>
                    <label className={`block text-sm ${textSecondary} mb-1`}>
                      Radius: <span className={`font-semibold ${textPrimary}`}>{radiusMiles} miles</span>
                    </label>
                    <input
                      type="range" min="1" max="25" value={radiusMiles}
                      onChange={(e) => setRadiusMiles(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className={`flex justify-between text-xs ${textSecondary}`}>
                      <span>1 mi</span>
                      <span>10 mi</span>
                      <span>25 mi</span>
                    </div>
                  </div>

                  <PinDropMap
                    radiusMiles={radiusMiles}
                    onChange={(loc) => {
                      setRadiusCenter({ lat: loc.lat, lng: loc.lng });
                      if (loc.address) setRadiusAddress(loc.address);
                    }}
                    height="350px"
                    searchPlaceholder="Search for a listing address, neighborhood, or city..."
                  />

                  {radiusAddress && (
                    <p className={`text-sm ${textSecondary}`}>
                      Sending to all addresses near: <span className={`font-medium ${textPrimary}`}>{radiusAddress}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Show contacts manager when in contacts mode */}
            {recipientMode === 'contacts' && (
              <PipelineContactsStep
                campaign={campaign}
                contactCount={contactCount}
                onNext={() => handleNext('contacts')}
                onBack={undefined}
              />
            )}

            {/* Next button for radius mode */}
            {recipientMode === 'radius' && (
              <div className="flex justify-end">
                <button
                  onClick={() => handleNext('contacts')}
                  disabled={!radiusCenter}
                  className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                    isLight ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Design Mail Piece →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Design */}
        {currentStep === 'design' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Design Your Mail Piece</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Choose the mail type and configure your design.
              </p>

              {/* Mail Type Selection */}
              <div className="mb-6">
                <label className={`block text-sm font-medium ${textPrimary} mb-3`}>Mail Type</label>
                <div className="grid gap-3">
                  {MAIL_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDesign({ ...design, mailType: opt.value })}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        design.mailType === opt.value
                          ? isLight
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-blue-500 bg-blue-900/30'
                          : isLight
                          ? 'border-gray-200 hover:border-gray-300 bg-white'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${textPrimary}`}>{opt.label}</p>
                          <p className={`text-sm ${textSecondary}`}>{opt.description}</p>
                        </div>
                        <span className={`text-lg font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                          {opt.price}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Front Image URL */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>
                  Front Image URL {design.mailType !== 'letter' ? '(required)' : ''}
                </label>
                <input
                  type="url"
                  value={design.frontImageUrl}
                  onChange={(e) => setDesign({ ...design, frontImageUrl: e.target.value })}
                  placeholder="https://example.com/front-design.jpg"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                  }`}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>
                  Upload your design to an image host and paste the URL here
                </p>
              </div>

              {/* Back Image URL (postcards only) */}
              {design.mailType.startsWith('postcard') && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium ${textPrimary} mb-1`}>
                    Back Image URL (optional)
                  </label>
                  <input
                    type="url"
                    value={design.backImageUrl}
                    onChange={(e) => setDesign({ ...design, backImageUrl: e.target.value })}
                    placeholder="https://example.com/back-design.jpg"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                    }`}
                  />
                </div>
              )}

              {/* Message (notecards and postcards with message area) */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>
                  Message {design.mailType === 'notecard' ? '(required — will be handwritten)' : '(optional)'}
                </label>
                <textarea
                  value={design.message}
                  onChange={(e) => setDesign({ ...design, message: e.target.value })}
                  rows={4}
                  placeholder={
                    design.mailType === 'notecard'
                      ? 'Thank you for your interest in the neighborhood! I would love to help you find your dream home...'
                      : 'Optional message to include on the mail piece'
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                  }`}
                />
              </div>

              {/* QR Code URL */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>
                  QR Code URL (optional — links to your landing page)
                </label>
                <input
                  type="url"
                  value={design.qrUrl}
                  onChange={(e) => setDesign({ ...design, qrUrl: e.target.value })}
                  placeholder="https://jpsrealtor.com/lp/your-landing-page"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                  }`}
                />
              </div>

              {/* Return Address */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-3`}>Return Address</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input
                      value={design.returnAddress.name}
                      onChange={(e) => setDesign({ ...design, returnAddress: { ...design.returnAddress, name: e.target.value } })}
                      placeholder="Name"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                      }`}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      value={design.returnAddress.address}
                      onChange={(e) => setDesign({ ...design, returnAddress: { ...design.returnAddress, address: e.target.value } })}
                      placeholder="Street Address"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                      }`}
                    />
                  </div>
                  <input
                    value={design.returnAddress.city}
                    onChange={(e) => setDesign({ ...design, returnAddress: { ...design.returnAddress, city: e.target.value } })}
                    placeholder="City"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                    }`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={design.returnAddress.state}
                      onChange={(e) => setDesign({ ...design, returnAddress: { ...design.returnAddress, state: e.target.value } })}
                      placeholder="State"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                      }`}
                    />
                    <input
                      value={design.returnAddress.zip}
                      onChange={(e) => setDesign({ ...design, returnAddress: { ...design.returnAddress, zip: e.target.value } })}
                      placeholder="ZIP"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Nav Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => handleBack('design')}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Back
              </button>
              <button
                onClick={() => handleNext('design')}
                disabled={!design.frontImageUrl && design.mailType !== 'notecard'}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Preview →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Preview Your Mail Piece</h3>

              {/* Mail type summary */}
              <div className={`p-4 rounded-lg mb-6 ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={textSecondary}>Type: </span>
                    <span className={`font-medium ${textPrimary}`}>
                      {MAIL_TYPE_OPTIONS.find(o => o.value === design.mailType)?.label}
                    </span>
                  </div>
                  <div>
                    <span className={textSecondary}>Price per piece: </span>
                    <span className={`font-medium ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                      ${MAIL_PRICING[design.mailType]?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className={textSecondary}>Recipients: </span>
                    <span className={`font-medium ${textPrimary}`}>{contactCount}</span>
                  </div>
                  <div>
                    <span className={textSecondary}>Estimated total: </span>
                    <span className={`font-bold text-lg ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                      ${estimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Front Image Preview */}
              {design.frontImageUrl && (
                <div className="mb-4">
                  <p className={`text-sm font-medium ${textPrimary} mb-2`}>Front</p>
                  <div className={`border-2 border-dashed rounded-lg overflow-hidden ${
                    isLight ? 'border-gray-300' : 'border-gray-600'
                  }`}>
                    <img
                      src={design.frontImageUrl}
                      alt="Front design"
                      className="w-full max-h-64 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Back Image Preview */}
              {design.backImageUrl && (
                <div className="mb-4">
                  <p className={`text-sm font-medium ${textPrimary} mb-2`}>Back</p>
                  <div className={`border-2 border-dashed rounded-lg overflow-hidden ${
                    isLight ? 'border-gray-300' : 'border-gray-600'
                  }`}>
                    <img
                      src={design.backImageUrl}
                      alt="Back design"
                      className="w-full max-h-64 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Message Preview */}
              {design.message && (
                <div className="mb-4">
                  <p className={`text-sm font-medium ${textPrimary} mb-2`}>Message</p>
                  <div className={`p-4 rounded-lg ${isLight ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-900/20 border border-yellow-700/50'}`}>
                    <p className={`text-sm ${textPrimary} whitespace-pre-wrap ${design.mailType === 'notecard' ? 'font-serif italic' : ''}`}>
                      {design.message}
                    </p>
                  </div>
                </div>
              )}

              {/* QR Code */}
              {design.qrUrl && (
                <div className="mb-4">
                  <p className={`text-sm font-medium ${textPrimary} mb-1`}>QR Code links to:</p>
                  <p className={`text-sm ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{design.qrUrl}</p>
                </div>
              )}
            </div>

            {/* Nav Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => handleBack('preview')}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Back to Design
              </button>
              <button
                onClick={() => handleNext('preview')}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm & Send →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Send */}
        {currentStep === 'send' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Send Direct Mail</h3>

              {/* Cost Summary */}
              <div className={`p-6 rounded-lg mb-6 ${isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'}`}>
                <div className="text-center">
                  <p className={`text-sm ${textSecondary} mb-1`}>Total Cost</p>
                  <p className={`text-3xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                    ${estimatedCost.toFixed(2)}
                  </p>
                  <p className={`text-sm ${textSecondary} mt-1`}>
                    {contactCount} {MAIL_TYPE_OPTIONS.find(o => o.value === design.mailType)?.label}s × ${MAIL_PRICING[design.mailType]?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Send Result */}
              {sendResult && (
                <div className={`p-4 rounded-lg mb-6 ${
                  sendResult.success
                    ? isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'
                    : isLight ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-700/50'
                }`}>
                  <p className={`text-sm font-medium ${
                    sendResult.success
                      ? isLight ? 'text-green-700' : 'text-green-400'
                      : isLight ? 'text-red-700' : 'text-red-400'
                  }`}>
                    {sendResult.message}
                  </p>
                </div>
              )}

              {/* Send Button */}
              {!sendResult?.success && (
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className={`w-full py-4 rounded-lg font-semibold text-lg text-white transition-colors ${
                    isLight ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Sending to thanks.io...
                    </span>
                  ) : (
                    `Send ${contactCount} Mail Pieces — $${estimatedCost.toFixed(2)}`
                  )}
                </button>
              )}
            </div>

            {/* Nav */}
            <div className="flex justify-start">
              <button
                onClick={() => handleBack('send')}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Back to Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
