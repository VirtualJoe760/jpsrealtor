'use client';

import { useState, useRef } from 'react';
import { X, Upload, Cloud, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ContactSyncModalProps {
  isLight: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContactSyncModal({ isLight, onClose, onSuccess }: ContactSyncModalProps) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported?: number;
    skipped?: number;
    errors?: number;
    details?: any;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Handle Google Contacts sync
  const handleGoogleSync = () => {
    setSyncing(true);
    // Redirect to Google OAuth flow
    window.location.href = '/api/crm/contacts/import/google';
  };

  // Handle CSV file upload
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/crm/contacts/import/csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setResult(data);

      if (data.success && data.imported > 0) {
        // Wait a moment to show success, then refresh
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('[Contact Sync] CSV upload error:', error);
      setResult({
        success: false,
        errors: 1,
        details: { errorMessages: [error.message] },
      });
    } finally {
      setSyncing(false);
    }
  };

  // Handle vCard file upload
  const handleVCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/crm/contacts/import/vcard', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setResult(data);

      if (data.success && data.imported > 0) {
        // Wait a moment to show success, then refresh
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('[Contact Sync] vCard upload error:', error);
      setResult({
        success: false,
        errors: 1,
        details: { errorMessages: [error.message] },
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${
        isLight ? 'bg-white' : 'bg-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isLight ? 'border-slate-200' : 'border-gray-700'
        }`}>
          <h2 className={`text-2xl font-bold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Import Contacts
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all ${
              isLight
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Result Message */}
          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success
                ? isLight
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-green-900/20 border-green-500/50 text-green-400'
                : isLight
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-red-900/20 border-red-500/50 text-red-400'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    {result.success
                      ? `Successfully imported ${result.imported} contacts!`
                      : 'Import failed'}
                  </p>
                  {result.skipped && result.skipped > 0 && (
                    <p className="text-sm">
                      Skipped {result.skipped} contacts (already exist or missing required fields)
                    </p>
                  )}
                  {result.errors && result.errors > 0 && (
                    <p className="text-sm">
                      {result.errors} errors occurred during import
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CSV Upload (Google Contacts Export) - PRIMARY OPTION */}
          <div className={`p-6 rounded-lg border-2 transition-all ${
            syncing
              ? isLight
                ? 'border-slate-300 bg-slate-50 opacity-50'
                : 'border-gray-700 bg-gray-800 opacity-50'
              : isLight
              ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:shadow-md'
              : 'border-emerald-700 bg-emerald-900/10 hover:border-emerald-500/50'
          }`}>
            <div className="flex items-start gap-4">
              {/* Upload Icon */}
              <div className={`p-3 rounded-lg ${
                isLight ? 'bg-emerald-100' : 'bg-emerald-900/30'
              }`}>
                <Upload className={`w-8 h-8 ${
                  isLight ? 'text-emerald-700' : 'text-emerald-400'
                }`} />
              </div>

              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-1 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Upload CSV File (Recommended)
                </h3>
                <p className={`text-sm mb-3 ${
                  isLight ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  Import contacts from a Google Contacts CSV export. Fast, secure, and works offline.
                </p>

                <div className={`p-3 rounded-lg mb-3 text-xs ${
                  isLight ? 'bg-white border border-emerald-200 text-slate-600' : 'bg-gray-800 border border-emerald-700/50 text-gray-400'
                }`}>
                  <p className="font-semibold mb-1">How to export CSV from Google Contacts:</p>
                  <ul className="space-y-1 ml-4 list-decimal">
                    <li>Go to <strong>contacts.google.com</strong></li>
                    <li>Select contacts (or click checkbox to select all)</li>
                    <li>Click <strong>Export</strong> → <strong>Google CSV</strong></li>
                    <li>Upload the downloaded file here</li>
                  </ul>
                </div>

                <div className={`flex items-center gap-2 text-xs ${
                  isLight ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  <FileText className="w-4 h-4" />
                  <span>Supports .csv files from Google, Outlook, etc.</span>
                </div>
                <div className={`flex items-center gap-2 text-xs mt-1 ${
                  isLight ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>Automatic duplicate detection</span>
                </div>

                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={syncing}
                  className="hidden"
                />

                <button
                  onClick={() => csvInputRef.current?.click()}
                  disabled={syncing}
                  className={`mt-4 px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isLight
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose CSV File
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className={`absolute inset-0 flex items-center`}>
              <div className={`w-full border-t ${
                isLight ? 'border-slate-200' : 'border-gray-700'
              }`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-4 ${
                isLight ? 'bg-white text-slate-500' : 'bg-gray-900 text-gray-400'
              }`}>
                or
              </span>
            </div>
          </div>

          {/* Google Contacts OAuth - DISABLED/GRAYED OUT */}
          <div className={`p-6 rounded-lg border-2 opacity-40 cursor-not-allowed ${
            isLight
              ? 'border-slate-200 bg-slate-100'
              : 'border-gray-700 bg-gray-800/50'
          }`}>
            <div className="flex items-start gap-4">
              {/* Google Icon */}
              <div className={`p-3 rounded-lg ${
                isLight ? 'bg-blue-50' : 'bg-blue-900/20'
              }`}>
                <Cloud className={`w-8 h-8 ${
                  isLight ? 'text-blue-600' : 'text-blue-400'
                }`} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-lg font-semibold ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    Sync from Google Contacts
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/50 text-blue-300'
                  }`}>
                    Coming Soon
                  </span>
                </div>
                <p className={`text-sm mb-3 ${
                  isLight ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  Import all your Google contacts with one click. We'll only import contacts with phone numbers.
                </p>

                <div className={`flex items-center gap-2 text-xs ${
                  isLight ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>Automatic sync via OAuth</span>
                </div>
                <div className={`flex items-center gap-2 text-xs mt-1 ${
                  isLight ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>Duplicate detection included</span>
                </div>
                <div className={`flex items-center gap-2 text-xs mt-1 ${
                  isLight ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>Import name, email, phone, and address</span>
                </div>

                <button
                  disabled={true}
                  className={`mt-4 px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 opacity-50 cursor-not-allowed ${
                    isLight
                      ? 'bg-gray-400 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                  Connect Google Account
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className={`absolute inset-0 flex items-center`}>
              <div className={`w-full border-t ${
                isLight ? 'border-slate-200' : 'border-gray-700'
              }`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-4 ${
                isLight ? 'bg-white text-slate-500' : 'bg-gray-900 text-gray-400'
              }`}>
                or
              </span>
            </div>
          </div>

          {/* vCard Upload (Apple Contacts, Outlook, etc.) */}
          <div className={`p-6 rounded-lg border-2 transition-all ${
            syncing
              ? isLight
                ? 'border-slate-300 bg-slate-50 opacity-50'
                : 'border-gray-700 bg-gray-800 opacity-50'
              : isLight
              ? 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
              : 'border-gray-700 bg-gray-800 hover:border-emerald-500/50'
          }`}>
            <div className="flex items-start gap-4">
              {/* Upload Icon */}
              <div className={`p-3 rounded-lg ${
                isLight ? 'bg-emerald-50' : 'bg-emerald-900/20'
              }`}>
                <Upload className={`w-8 h-8 ${
                  isLight ? 'text-emerald-600' : 'text-emerald-400'
                }`} />
              </div>

              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-1 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Upload vCard File (.vcf)
                </h3>
                <p className={`text-sm mb-3 ${
                  isLight ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  Import contacts from Apple Contacts, Outlook, or any app that exports vCard format.
                </p>

                <div className={`p-3 rounded-lg mb-3 text-xs ${
                  isLight ? 'bg-slate-50 text-slate-600' : 'bg-gray-800/50 text-gray-400'
                }`}>
                  <p className="font-semibold mb-1">How to export vCard:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li><strong>Apple Contacts:</strong> Select contacts → File → Export vCard</li>
                    <li><strong>Outlook:</strong> File → Open & Export → Import/Export → Export to file → vCard</li>
                    <li><strong>Gmail:</strong> Export → vCard format (for iOS Contacts)</li>
                  </ul>
                </div>

                <div className={`flex items-center gap-2 text-xs ${
                  isLight ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  <FileText className="w-4 h-4" />
                  <span>Supports .vcf files</span>
                </div>
                <div className={`flex items-center gap-2 text-xs mt-1 ${
                  isLight ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>Multiple contacts per file</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.vcard"
                  onChange={handleVCardUpload}
                  disabled={syncing}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={syncing}
                  className={`mt-4 px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isLight
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose vCard File
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className={`p-4 rounded-lg ${
            isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-900/20 border border-amber-500/50'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isLight ? 'text-amber-600' : 'text-amber-400'
              }`} />
              <div className={`text-sm ${
                isLight ? 'text-amber-800' : 'text-amber-300'
              }`}>
                <p className="font-semibold mb-1">TCPA Compliance Notice</p>
                <p>
                  Imported contacts will have <strong>SMS opt-in disabled by default</strong>. You must manually
                  enable SMS opt-in for each contact and obtain proper consent before sending marketing messages.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-gray-700 bg-gray-800/50'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isLight
                ? 'text-slate-700 hover:bg-slate-200'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
