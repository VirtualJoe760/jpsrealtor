'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import PreviewData, { PreviewDataProps } from './PreviewData';
import ColumnMapper, { ColumnMapping } from './ColumnMapper';
import ImportProgress, { ImportProgressData } from './ImportProgress';

interface ContactSyncModalProps {
  isLight: boolean;
  onClose: () => void;
  onSuccess: (importedContactIds?: string[]) => void;
  campaignId?: string; // Optional campaign ID for tagging imported contacts
  context?: 'campaign' | 'regular'; // Import context: 'campaign' = allow duplicates for campaign selection, 'regular' = skip duplicates
}

type WizardStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'results';
type Provider = 'google_contacts' | 'mojo_dialer' | 'title_rep' | 'outlook' | null;

export default function ContactSyncModal({ isLight, onClose, onSuccess, campaignId, context }: ContactSyncModalProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [quickImport, setQuickImport] = useState(false);

  // File state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewDataProps['preview'] | null>(null);
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Mapping state
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Import state
  const [importProgress, setImportProgress] = useState<ImportProgressData | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Processing state
  const [processing, setProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Handle CSV/Excel file selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedProvider) {
        formData.append('provider', selectedProvider);
      }

      // Call preview API
      const response = await fetch('/api/crm/contacts/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to process file');
        setProcessing(false);
        return;
      }

      // Store preview data
      setPreviewData(data.preview);
      setDetectedProvider(data.detectedProvider);
      setRecommendations(data.recommendations);
      setMappings(data.mappings);

      // Move to next step based on quickImport setting
      if (quickImport) {
        // Skip preview and mapping, go straight to import
        await handleConfirmImport(file, data.mappings);
      } else {
        // Show preview
        setCurrentStep('preview');
      }
    } catch (error: any) {
      console.error('[Smart Import] Preview error:', error);
      alert(error.message || 'Failed to process file');
    } finally {
      setProcessing(false);
    }
  };

  // Handle confirm import
  const handleConfirmImport = async (file?: File, confirmedMappings?: ColumnMapping[]) => {
    const fileToUpload = file || uploadedFile;
    const mappingsToUse = confirmedMappings || mappings;

    if (!fileToUpload) {
      alert('No file selected');
      return;
    }

    setCurrentStep('importing');
    setImportProgress({
      status: 'processing',
      totalRows: previewData?.stats.totalRows || 0,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      skipCount: 0,
    });

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('mappings', JSON.stringify(mappingsToUse));
      if (detectedProvider) {
        formData.append('provider', detectedProvider);
      }
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      // Send context to indicate import mode (campaign vs regular)
      if (context) {
        formData.append('context', context);
      }

      const response = await fetch('/api/crm/contacts/import/confirm', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setImportProgress({
          status: 'failed',
          totalRows: previewData?.stats.totalRows || 0,
          processedRows: 0,
          successCount: 0,
          errorCount: 1,
          skipCount: 0,
          importErrors: [{ row: 0, field: 'system', value: '', error: data.error }],
        });
        setCurrentStep('results');
        return;
      }

      // Update progress with final results
      setBatchId(data.batchId);
      setImportProgress(data.progress);
      setCurrentStep('results');

      // If successful, trigger parent refresh after a moment
      if (data.progress.status === 'completed' && data.progress.successful > 0) {
        setTimeout(() => {
          onSuccess(data.importedContactIds || []);
        }, 3000);
      }
    } catch (error: any) {
      console.error('[Smart Import] Confirm error:', error);
      setImportProgress({
        status: 'failed',
        totalRows: previewData?.stats.totalRows || 0,
        processedRows: 0,
        successCount: 0,
        errorCount: 1,
        skipCount: 0,
        importErrors: [{ row: 0, field: 'system', value: '', error: error.message }],
      });
      setCurrentStep('results');
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return 'Import Contacts';
      case 'preview': return 'Preview Data';
      case 'mapping': return 'Review Column Mapping';
      case 'importing': return 'Importing Contacts';
      case 'results': return 'Import Complete';
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: 'Upload' },
      { key: 'preview', label: 'Preview' },
      { key: 'mapping', label: 'Map' },
      { key: 'importing', label: 'Import' },
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-1 sm:gap-2 ${
              index <= currentIndex
                ? isLight ? 'text-blue-600' : 'text-blue-400'
                : isLight ? 'text-slate-400' : 'text-gray-600'
            }`}>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                index < currentIndex
                  ? 'bg-blue-600 text-white'
                  : index === currentIndex
                  ? isLight ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600' : 'bg-blue-900/30 text-blue-400 ring-2 ring-blue-400'
                  : isLight ? 'bg-slate-200 text-slate-500' : 'bg-gray-700 text-gray-500'
              }`}>
                {index < currentIndex ? '✓' : index + 1}
              </div>
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${
                index < currentIndex
                  ? 'bg-blue-600'
                  : isLight ? 'bg-slate-200' : 'bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            {/* Quick Import Toggle */}
            <div className={`p-4 rounded-lg border ${
              isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700/50'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickImport}
                  onChange={(e) => setQuickImport(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className={`font-semibold ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      Quick Import Mode
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    isLight ? 'text-slate-600' : 'text-gray-400'
                  }`}>
                    Skip preview and column mapping. Import immediately with auto-detected fields.
                  </p>
                </div>
              </label>
            </div>

            {/* File Upload */}
            <div className={`p-6 rounded-lg border-2 transition-all ${
              processing
                ? isLight
                  ? 'border-slate-300 bg-slate-50 opacity-50'
                  : 'border-gray-700 bg-gray-800 opacity-50'
                : isLight
                ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:shadow-md'
                : 'border-emerald-700 bg-emerald-900/10 hover:border-emerald-500/50'
            }`}>
              <div className="flex items-start gap-4">
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
                    Upload CSV or Excel File
                  </h3>
                  <p className={`text-sm mb-3 ${
                    isLight ? 'text-slate-600' : 'text-gray-400'
                  }`}>
                    Smart import with automatic column detection. Supports Google Contacts, MOJO Dialer, Title Rep, Outlook, and more.
                  </p>

                  <div className={`flex flex-col gap-1 text-xs mb-4 ${
                    isLight ? 'text-slate-500' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Automatic column mapping with AI detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Preview and customize before importing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>Supports .csv, .xlsx, .xls files</span>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={processing}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      isLight
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Choose File
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* TCPA Notice */}
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
                    Imported contacts will have <strong>SMS opt-in disabled by default</strong>. You must obtain proper consent before sending marketing messages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'preview':
        if (!previewData) return null;
        return (
          <PreviewData
            preview={previewData}
            mappings={mappings}
            detectedProvider={detectedProvider}
            recommendations={recommendations}
            isLight={isLight}
          />
        );

      case 'mapping':
        return (
          <ColumnMapper
            mappings={mappings}
            sampleRows={previewData?.sampleRows || []}
            isLight={isLight}
            onMappingsChange={setMappings}
          />
        );

      case 'importing':
      case 'results':
        if (!importProgress) return null;
        return <ImportProgress data={importProgress} isLight={isLight} />;

      default:
        return null;
    }
  };

  const renderFooter = () => {
    return (
      <div className={`p-6 border-t flex items-center justify-between ${
        isLight ? 'border-slate-200 bg-slate-50' : 'border-gray-700 bg-gray-800/50'
      }`}>
        <div>
          {currentStep !== 'upload' && currentStep !== 'importing' && currentStep !== 'results' && (
            <button
              onClick={() => {
                if (currentStep === 'preview') setCurrentStep('upload');
                if (currentStep === 'mapping') setCurrentStep('preview');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isLight
                  ? 'text-slate-700 hover:bg-slate-200'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep === 'results' && importProgress?.status === 'completed' && (
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Done
            </button>
          )}

          {currentStep === 'preview' && (
            <button
              onClick={() => setCurrentStep('mapping')}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 'mapping' && (
            <button
              onClick={() => handleConfirmImport()}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isLight
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              Start Import
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {(currentStep === 'upload' || (currentStep === 'results' && importProgress?.status === 'failed')) && (
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
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-5xl w-full rounded-xl shadow-2xl max-h-[90vh] flex flex-col ${
        isLight ? 'bg-white' : 'bg-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b flex-shrink-0 ${
          isLight ? 'border-slate-200' : 'border-gray-700'
        }`}>
          <h2 className={`text-2xl font-bold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {getStepTitle()}
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

        {/* Step Indicator */}
        {currentStep !== 'upload' && (
          <div className="p-4 flex-shrink-0">
            {renderStepIndicator()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>

        {/* Footer */}
        {renderFooter()}
      </div>
    </div>
  );
}
