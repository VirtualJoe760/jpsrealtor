'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import ColumnMapper, { ColumnMapping } from './ColumnMapper';
import ImportProgress, { ImportProgressData } from './ImportProgress';
import ContactReviewSwipe from './ContactReviewSwipe';
import ContactReviewList from './ContactReviewList';

// Preview data interface for API response
interface PreviewDataProps {
  fileName: string;
  fileSize: number;
  headers: string[];
  sampleRows: any[];
  stats: {
    totalRows: number;
    totalColumns: number;
    mappedColumns: number;
    unmappedColumns: number;
    avgConfidence: number;
  };
}

interface ContactSyncModalProps {
  isLight: boolean;
  onClose: () => void;
  onSuccess: (importedContactIds?: string[]) => void;
  campaignId?: string; // Optional campaign ID for tagging imported contacts
  context?: 'campaign' | 'regular'; // Import context: 'campaign' = allow duplicates for campaign selection, 'regular' = skip duplicates
}

type WizardStep = 'upload' | 'map' | 'review' | 'importing' | 'results';
type Provider = 'google_contacts' | 'mojo_dialer' | 'title_rep' | 'outlook' | null;

interface ReviewContact {
  rowIndex: number;
  data: any;
  issues: string[];
  confidence: number;
  action?: 'keep' | 'skip' | 'edit';
}

export default function ContactSyncModal({ isLight, onClose, onSuccess, campaignId, context }: ContactSyncModalProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [quickImport, setQuickImport] = useState(false);

  // File state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(null);
  const [contactLabel, setContactLabel] = useState<string>(''); // Label for the batch

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewDataProps | null>(null);
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Mapping state
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Review state
  const [reviewContacts, setReviewContacts] = useState<ReviewContact[]>([]);
  const [reviewDecisions, setReviewDecisions] = useState<Map<number, 'keep' | 'skip'>>(new Map());
  const [editedContacts, setEditedContacts] = useState<Map<number, any>>(new Map());

  // Import state
  const [importProgress, setImportProgress] = useState<ImportProgressData | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Processing state
  const [processing, setProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // POLLING FOR IMPORT PROGRESS
  // ============================================================================

  useEffect(() => {
    // Only poll if we have a batchId and we're in the importing step
    if (!batchId || currentStep !== 'importing') {
      return;
    }

    // Poll for progress updates every 1.5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/crm/contacts/import/status/${batchId}`);
        const data = await response.json();

        if (data.success && data.progress) {
          setImportProgress(data.progress);

          // If import completed or failed, stop polling and move to results
          if (data.progress.status === 'completed' || data.progress.status === 'failed') {
            clearInterval(pollInterval);
            setCurrentStep('results');

            // If successful, trigger parent refresh
            if (data.progress.status === 'completed' && data.progress.successful > 0) {
              setTimeout(() => {
                onSuccess();
              }, 3000);
            }
          }
        }
      } catch (error) {
        console.error('[Import Polling] Error fetching progress:', error);
      }
    }, 1500);

    // Cleanup on unmount or when dependencies change
    return () => {
      clearInterval(pollInterval);
    };
  }, [batchId, currentStep, onSuccess]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Map raw CSV row to contact data using column mappings
   */
  const mapRowToContact = (row: any, mappings: ColumnMapping[]): any => {
    const contactData: any = {};

    // Map each CSV column to target field
    mappings.forEach(mapping => {
      if (mapping.suggestedField !== 'ignore' && row[mapping.csvColumn]) {
        const value = row[mapping.csvColumn];
        if (value && String(value).trim()) {
          contactData[mapping.suggestedField] = String(value).trim();
        }
      }
    });

    return contactData;
  };

  /**
   * Analyze contacts to identify which need review
   * Returns contacts with confidence < 90% or identified issues
   */
  const analyzeContactsForReview = (sampleRows: any[], mappings: ColumnMapping[]): ReviewContact[] => {
    const contactsNeedingReview: ReviewContact[] = [];

    sampleRows.forEach((row, index) => {
      const issues: string[] = [];
      let confidence = 1.0;

      // Map raw CSV row to contact data
      const contactData = mapRowToContact(row, mappings);

      // Check for problematic patterns
      const firstName = contactData.firstName || '';
      const lastName = contactData.lastName || '';
      const phone = contactData.phone || '';
      const email = contactData.email || '';

      // Check for invalid first name patterns
      const invalidPatterns = ['/', '\\', '...', '___'];
      if (firstName && invalidPatterns.some(p => firstName.trim().startsWith(p))) {
        issues.push('Invalid first name pattern');
        confidence *= 0.3;
      }

      // Check for missing critical fields
      if (!firstName && !lastName && !contactData.organization) {
        issues.push('Missing name and organization');
        confidence *= 0.5;
      }

      // Check for missing contact methods
      if (!phone && !email) {
        issues.push('Missing phone and email');
        confidence *= 0.6;
      }

      // Check for emoji in names
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
      if (emojiRegex.test(firstName) || emojiRegex.test(lastName)) {
        issues.push('Contains emoji in name');
        confidence *= 0.4;
      }

      // If confidence is below 90% or has issues, add to review list
      if (confidence < 0.9 || issues.length > 0) {
        contactsNeedingReview.push({
          rowIndex: index,
          data: contactData, // Use mapped contact data
          issues,
          confidence,
        });
      }
    });

    return contactsNeedingReview;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Extract label from filename
  const extractLabelFromFilename = (filename: string): string => {
    let name = filename.replace(/\.(csv|xlsx|xls)$/i, '');
    name = name.replace(/_/g, ' ');
    name = name.replace(/\s*-+\s*\d+$/g, ''); // Remove trailing dashes and numbers
    name = name.replace(/\s+\d+$/g, ''); // Remove trailing numbers
    name = name.trim();
    // Capitalize each word
    name = name.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    return name || 'Imported Contacts';
  };

  // Handle CSV/Excel file selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    // Auto-extract label from filename
    const autoLabel = extractLabelFromFilename(file.name);
    setContactLabel(autoLabel);
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

      // Analyze contacts for review step
      const contactsForReview = analyzeContactsForReview(data.preview.sampleRows, data.mappings);
      setReviewContacts(contactsForReview);

      // Move to next step based on quickImport setting
      if (quickImport) {
        // Skip map and review, go straight to import
        await handleConfirmImport(file, data.mappings);
      } else {
        // Show map step
        setCurrentStep('map');
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
      total: previewData?.stats.totalRows || 0,
      processed: 0,
      successful: 0,
      failed: 0,
      duplicates: 0,
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
      // Send contact label to be applied to imported contacts
      if (contactLabel) {
        formData.append('label', contactLabel);
      }

      const response = await fetch('/api/crm/contacts/import/confirm', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setImportProgress({
          status: 'failed',
          total: previewData?.stats.totalRows || 0,
          processed: 0,
          successful: 0,
          failed: 1,
          duplicates: 0,
          importErrors: [{ row: 0, field: 'system', value: '', error: data.error }],
        });
        setCurrentStep('results');
        return;
      }

      // Set batchId to start polling for progress
      setBatchId(data.batchId);

      // Note: The polling useEffect will handle progress updates
      // and transition to results when complete
    } catch (error: any) {
      console.error('[Smart Import] Confirm error:', error);
      setImportProgress({
        status: 'failed',
        total: previewData?.stats.totalRows || 0,
        processed: 0,
        successful: 0,
        failed: 1,
        duplicates: 0,
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
      case 'map': return 'Map Columns';
      case 'review': return 'Review Problematic Contacts';
      case 'importing': return 'Importing Contacts';
      case 'results': return 'Import Complete';
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: 'Upload' },
      { key: 'map', label: 'Map' },
      { key: 'review', label: 'Review' },
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

      case 'map':
        if (!previewData) return null;
        return (
          <div className="space-y-4">
            <ColumnMapper
              mappings={mappings}
              sampleRows={previewData.sampleRows}
              isLight={isLight}
              onMappingsChange={setMappings}
            />

            {/* Label Input */}
            <div className={`p-4 rounded-lg border ${
              isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700/50'
            }`}>
              <label className="block">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Label for this batch
                  </span>
                </div>
                <input
                  type="text"
                  value={contactLabel}
                  onChange={(e) => setContactLabel(e.target.value)}
                  placeholder="e.g., Old Town 247, Farm Owners, etc."
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      : 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                  }`}
                />
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  This label will be applied to all kept contacts from this import.
                </p>
              </label>
            </div>

            {reviewContacts.length > 0 && (
              <div className={`p-4 rounded-lg border ${
                isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-500/50'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isLight ? 'text-amber-600' : 'text-amber-400'
                  }`} />
                  <div className={`text-sm ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                    <p className="font-semibold mb-1">Review Required</p>
                    <p>
                      {reviewContacts.length} contacts have low confidence or issues and will need your review on the next step.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'review':
        if (reviewContacts.length === 0) {
          // Skip review if no problematic contacts
          return (
            <div className="text-center py-12">
              <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
              <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                All Contacts Look Good!
              </h3>
              <p className={`mt-2 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                No contacts require review. Click Next to continue.
              </p>
            </div>
          );
        }
        return (
          <ContactReviewList
            contacts={reviewContacts}
            isLight={isLight}
            onComplete={(decisions, edited) => {
              setReviewDecisions(decisions);
              setEditedContacts(edited);
              // After review, proceed directly to import
              handleConfirmImport();
            }}
            onBack={() => setCurrentStep('map')}
            contactLabel={contactLabel}
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
    // Hide footer for review step (it has its own controls)
    if (currentStep === 'review') {
      return null;
    }

    return (
      <div className={`p-6 border-t flex items-center justify-between ${
        isLight ? 'border-slate-200 bg-slate-50' : 'border-gray-700 bg-gray-800/50'
      }`}>
        <div>
          {currentStep !== 'upload' && currentStep !== 'importing' && currentStep !== 'results' && (
            <button
              onClick={() => {
                if (currentStep === 'map') setCurrentStep('upload');
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

          {currentStep === 'map' && (
            <button
              onClick={() => {
                // Go to review if there are contacts to review, otherwise start import
                if (reviewContacts.length > 0) {
                  setCurrentStep('review');
                } else {
                  handleConfirmImport();
                }
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isLight
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {reviewContacts.length > 0 ? 'Next: Review' : 'Start Import'}
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
