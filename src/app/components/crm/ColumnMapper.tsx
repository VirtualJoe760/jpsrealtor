'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, ArrowRight, Info, Search, List, Grid } from 'lucide-react';

export interface ColumnMapping {
  csvColumn: string;
  suggestedField: string;
  confidence: number;
  pattern: string;
  sampleData: string[];
  alternativeMatches?: {
    field: string;
    confidence: number;
  }[];
}

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  sampleRows: any[]; // Full row objects from CSV
  isLight: boolean;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onSaveTemplate?: (name: string) => void;
}

// Available target fields
const TARGET_FIELDS = [
  // Contact Info
  { value: 'firstName', label: 'First Name', required: false },
  { value: 'lastName', label: 'Last Name', required: false },
  { value: 'fullName', label: 'Full Name', required: false },
  { value: 'phone', label: 'Phone Number', required: true },
  { value: 'phone2', label: 'Phone 2', required: false },
  { value: 'phone3', label: 'Phone 3', required: false },
  { value: 'email', label: 'Email Address', required: false },
  { value: 'email2', label: 'Email 2', required: false },
  { value: 'email3', label: 'Email 3', required: false },
  // Address
  { value: 'address.street', label: 'Street Address', required: false },
  { value: 'address.city', label: 'City', required: false },
  { value: 'address.state', label: 'State', required: false },
  { value: 'address.zip', label: 'ZIP Code', required: false },
  { value: 'address.country', label: 'Country', required: false },
  { value: 'address', label: 'Full Address', required: false },
  // Professional
  { value: 'organization', label: 'Company/Organization', required: false },
  { value: 'jobTitle', label: 'Job Title', required: false },
  { value: 'website', label: 'Website', required: false },
  // Personal
  { value: 'birthday', label: 'Birthday', required: false },
  { value: 'notes', label: 'Notes', required: false },
  // Property Data
  { value: 'apn', label: 'APN / Parcel Number', required: false },
  { value: 'longitude', label: 'Longitude', required: false },
  { value: 'latitude', label: 'Latitude', required: false },
  { value: 'beds', label: 'Bedrooms', required: false },
  { value: 'baths', label: 'Bathrooms', required: false },
  { value: 'sqft', label: 'Square Feet', required: false },
  { value: 'lotSize', label: 'Lot Size', required: false },
  { value: 'yearBuilt', label: 'Year Built', required: false },
  { value: 'propertyType', label: 'Property Type', required: false },
  { value: 'price', label: 'Price', required: false },
  { value: 'soldPrice', label: 'Sold Price', required: false },
  { value: 'purchaseDate', label: 'Purchase Date', required: false },
  { value: 'purchasePrice', label: 'Purchase Price', required: false },
  { value: 'subdivision', label: 'Subdivision', required: false },
  { value: 'legalDescription', label: 'Legal Description', required: false },
  { value: 'zoning', label: 'Zoning', required: false },
  { value: 'assessedValue', label: 'Assessed Value', required: false },
  { value: 'marketValue', label: 'Market Value', required: false },
  { value: 'county', label: 'County', required: false },
  { value: 'ownerOccupied', label: 'Owner Occupied', required: false },
  { value: 'numberOfUnits', label: 'Number of Units', required: false },
  { value: 'numberOfStories', label: 'Number of Stories', required: false },
  { value: 'garage', label: 'Garage Type', required: false },
  { value: 'fireplace', label: 'Fireplace', required: false },
  { value: 'pool', label: 'Pool', required: false },
  { value: 'view', label: 'View', required: false },
  { value: 'acreage', label: 'Acreage', required: false },
  // Mailing Info
  { value: 'mailingAddress', label: 'Mailing Address', required: false },
  { value: 'mailingCity', label: 'Mailing City', required: false },
  { value: 'mailingState', label: 'Mailing State', required: false },
  { value: 'mailingZip', label: 'Mailing ZIP', required: false },
  // Other
  { value: 'ignore', label: '-- Ignore Column --', required: false },
];

export default function ColumnMapper({
  mappings,
  sampleRows,
  isLight,
  onMappingsChange,
  onSaveTemplate,
}: ColumnMapperProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'list'>('preview');
  const [searchQuery, setSearchQuery] = useState('');

  const handleFieldChange = (csvColumn: string, newField: string) => {
    const updated = mappings.map(m =>
      m.csvColumn === csvColumn
        ? { ...m, suggestedField: newField, confidence: 1.0 }
        : m
    );
    onMappingsChange(updated);
    setEditingField(null);
  };

  // Helper: Clean contact data (preview of what will be imported)
  const cleanContactData = (rowIndex: number) => {
    const row = sampleRows[rowIndex];
    if (!row) return { rawData: {}, cleaned: {} };

    const rawData: any = {};
    const cleaned: any = {};

    // Build raw data object from CSV row
    mappings.forEach(mapping => {
      const value = row[mapping.csvColumn];
      if (value !== undefined && value !== '') {
        rawData[mapping.csvColumn] = value;
      }
    });

    // Map CSV columns to contact fields
    mappings.forEach(mapping => {
      if (mapping.suggestedField !== 'ignore') {
        const value = row[mapping.csvColumn];
        if (value && value !== '') {
          cleaned[mapping.suggestedField] = String(value).trim();
        }
      }
    });

    // Smart name splitting (same logic as import)
    // Case 1: Full name in "fullName" field
    if (cleaned.fullName && !cleaned.firstName && !cleaned.lastName) {
      const parts = cleaned.fullName.trim().split(' ');
      if (parts.length >= 2) {
        cleaned.firstName = parts[0];
        cleaned.lastName = parts.slice(1).join(' ');
      } else {
        cleaned.firstName = cleaned.fullName;
      }
      delete cleaned.fullName;
    }

    // Case 2: Full name in firstName field (contains space)
    // Split even if lastName exists - the space indicates incorrect storage
    if (cleaned.firstName && cleaned.firstName.includes(' ')) {
      const parts = cleaned.firstName.trim().split(' ');
      if (parts.length >= 2 && !cleaned.lastName) {
        // No lastName exists - use split version
        cleaned.firstName = parts[0];
        cleaned.lastName = parts.slice(1).join(' ');
      } else if (parts.length >= 2 && cleaned.lastName) {
        // lastName exists - just take first part, keep existing lastName
        cleaned.firstName = parts[0];
      }
    }

    // Helper: Split multi-value fields (separated by :::) into array
    const splitMultiValue = (value: string | undefined): string[] => {
      if (!value) return [];
      // Split by ::: and filter out empty values
      return value.split(':::').map(p => p.trim()).filter(p => p);
    };

    // Helper: Clean single value (first from multi-value field)
    const cleanMultiValue = (value: string | undefined): string => {
      const parts = splitMultiValue(value);
      return parts[0] || '';
    };

    // Process phones - split :::separated values into phone1, phone2, phone3
    const allPhones: string[] = [];
    if (cleaned.phone) {
      allPhones.push(...splitMultiValue(cleaned.phone));
      delete cleaned.phone; // Remove original
    }
    // Add numbered phones
    allPhones.forEach((phoneNum, index) => {
      if (index === 0) {
        cleaned.phone = phoneNum;
      } else {
        cleaned[`phone${index + 1}`] = phoneNum;
      }
    });

    // Process emails - split ::: separated values into email1, email2, email3
    const allEmails: string[] = [];
    if (cleaned.email) {
      allEmails.push(...splitMultiValue(cleaned.email));
      delete cleaned.email; // Remove original
    }
    // Add numbered emails
    allEmails.forEach((emailAddr, index) => {
      if (index === 0) {
        cleaned.email = emailAddr;
      } else {
        cleaned[`email${index + 1}`] = emailAddr;
      }
    });

    // Process labels - remove asterisk prefix and split by :::
    if (cleaned.labels) {
      const labelsParts = splitMultiValue(cleaned.labels);
      // Remove leading asterisk and space from each label
      const cleanedLabels = labelsParts.map(label => label.replace(/^\*\s*/, '').trim());
      cleaned.labels = cleanedLabels.join(', ');
    }

    // Combine address fields with smart deduplication
    const street = cleanMultiValue(cleaned['address.street']);
    const city = cleanMultiValue(cleaned['address.city']);
    const state = cleanMultiValue(cleaned['address.state']);
    const zip = cleanMultiValue(cleaned['address.zip']);

    const addressParts = [];
    const seen = new Set<string>();

    // Helper to add unique non-empty parts
    const addUnique = (value: string) => {
      if (!value) return;
      const normalized = value.trim().toLowerCase();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        addressParts.push(value.trim());
      }
    };

    addUnique(street);
    addUnique(city);
    addUnique(state);
    addUnique(zip);

    if (addressParts.length > 0) {
      cleaned.address = addressParts.join(', ');
    }

    // Validation: Skip contacts with invalid first names
    const invalidFirstNamePatterns = ['/','\\', '...', '___'];
    if (cleaned.firstName) {
      const hasInvalidPattern = invalidFirstNamePatterns.some(pattern =>
        cleaned.firstName.trim().startsWith(pattern)
      );
      if (hasInvalidPattern || cleaned.firstName.trim().length === 0) {
        cleaned._skipReason = 'Invalid first name';
        cleaned._shouldSkip = true;
      }
    }

    return { rawData, cleaned };
  };

  // Get sample rows (up to 3) for preview mode
  const maxSamples = Math.min(3, sampleRows.length);
  const samples = Array.from({ length: maxSamples }, (_, i) => cleanContactData(i));

  // Get all contacts with cleaned data for list view
  const allContacts = sampleRows.map((_, index) => ({
    index,
    ...cleanContactData(index),
  }));

  // Filter contacts based on search query
  const filteredContacts = allContacts.filter(contact => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const searchableText = [
      contact.cleaned.firstName,
      contact.cleaned.lastName,
      contact.cleaned.organization,
      contact.cleaned.phone,
      contact.cleaned.phone2,
      contact.cleaned.phone3,
      contact.cleaned.email,
      contact.cleaned.email2,
      contact.cleaned.email3,
      contact.cleaned.address,
      contact.cleaned.jobTitle,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });

  const requiredFields = TARGET_FIELDS.filter(f => f.required).map(f => f.value);
  const mappedRequiredFields = mappings
    .filter(m => requiredFields.includes(m.suggestedField))
    .map(m => m.suggestedField);
  const missingRequired = requiredFields.filter(f => !mappedRequiredFields.includes(f));

  const stats = {
    total: mappings.length,
    mapped: mappings.filter(m => m.suggestedField !== 'ignore').length,
    highConfidence: mappings.filter(m => m.confidence >= 0.9 && m.suggestedField !== 'ignore').length,
    needReview: mappings.filter(m => m.confidence < 0.7 && m.suggestedField !== 'ignore').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className={`rounded-lg border overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
      }`}>
        <div className={`px-4 py-3 border-b ${
          isLight ? 'bg-blue-50 border-slate-200' : 'bg-blue-900/20 border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-base font-semibold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Review Import Transformation
            </h3>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'preview'
                    ? isLight
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Grid className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'list'
                    ? isLight
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
                List ({sampleRows.length})
              </button>
            </div>
          </div>
          <p className={`text-xs ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            {viewMode === 'preview'
              ? 'Compare raw CSV data with cleaned contacts that will be imported'
              : 'Search and review all contacts before importing'}
          </p>
        </div>

        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={isLight ? 'text-slate-600' : 'text-gray-400'}>Mapped:</span>
              <span className={`font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                {stats.mapped} of {stats.total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
              <span className={`font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                {stats.highConfidence}
              </span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>high confidence</span>
            </div>
            {stats.needReview > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-4 h-4 ${isLight ? 'text-orange-600' : 'text-orange-400'}`} />
                <span className={`font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                  {stats.needReview}
                </span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>need review</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar (List View Only) */}
      {viewMode === 'list' && (
        <div className={`rounded-lg border ${
          isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="p-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isLight ? 'text-slate-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search contacts by name, phone, email, organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-blue-500'
                    : 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              />
            </div>
            {searchQuery && (
              <p className={`text-xs mt-2 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Showing {filteredContacts.length} of {sampleRows.length} contacts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Missing Required Fields Warning */}
      {missingRequired.length > 0 && (
        <div className={`px-4 py-3 rounded-lg border-l-4 ${
          isLight
            ? 'bg-red-50 border-red-500'
            : 'bg-red-900/20 border-red-500'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isLight ? 'text-red-600' : 'text-red-400'
            }`} />
            <div className={`text-sm ${isLight ? 'text-red-800' : 'text-red-300'}`}>
              <span className="font-semibold">Missing required:</span> {missingRequired.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Content: Preview or List View */}
      {viewMode === 'preview' ? (
        /* Before/After Comparison Table (Preview Mode) */
        <div className={`rounded-lg border overflow-hidden ${
          isLight ? 'border-slate-200' : 'border-gray-700'
        }`}>
          <div className={`px-4 py-3 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-800/50 border-gray-700'
          }`}>
            <div className="flex items-center gap-2">
              <Info className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <h4 className={`font-semibold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Before → After Comparison (First 3 Contacts)
              </h4>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-gray-700">
            {samples.map((sample, sampleIndex) => (
            <div key={sampleIndex} className={`p-4 ${
              isLight ? 'bg-white' : 'bg-gray-800'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  isLight ? 'bg-slate-100 text-slate-700' : 'bg-gray-700 text-gray-300'
                }`}>
                  Contact {sampleIndex + 1}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* BEFORE - Raw CSV Data */}
                <div className={`rounded-lg border p-4 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-900/50 border-gray-700'
                }`}>
                  <h5 className={`text-xs font-semibold mb-3 uppercase tracking-wide ${
                    isLight ? 'text-slate-600' : 'text-gray-400'
                  }`}>
                    Raw CSV Data
                  </h5>
                  <div className="space-y-2">
                    {Object.entries(sample.rawData).map(([column, value], idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className={`text-xs font-medium min-w-[120px] ${
                          isLight ? 'text-slate-600' : 'text-gray-500'
                        }`}>
                          {column}:
                        </span>
                        <span className={`text-sm font-mono flex-1 break-all ${
                          isLight ? 'text-slate-900' : 'text-gray-200'
                        }`}>
                          {String(value) || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:flex items-center justify-center">
                  <ArrowRight className={`w-8 h-8 ${
                    isLight ? 'text-blue-500' : 'text-blue-400'
                  }`} />
                </div>

                {/* AFTER - Cleaned Contact Data */}
                <div className={`rounded-lg border p-4 ${
                  isLight ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-700/50'
                }`}>
                  <h5 className={`text-xs font-semibold mb-3 uppercase tracking-wide ${
                    sample.cleaned._shouldSkip
                      ? (isLight ? 'text-red-700' : 'text-red-400')
                      : (isLight ? 'text-green-700' : 'text-green-400')
                  }`}>
                    {sample.cleaned._shouldSkip ? '⚠️ Will Be Skipped' : 'Cleaned Contact'}
                  </h5>

                  {/* Skip Warning */}
                  {sample.cleaned._shouldSkip && (
                    <div className={`mb-3 p-2 rounded border ${
                      isLight ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-700'
                    }`}>
                      <p className={`text-xs font-semibold ${
                        isLight ? 'text-red-800' : 'text-red-300'
                      }`}>
                        Reason: {sample.cleaned._skipReason || 'Invalid data'}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Show all fields dynamically */}
                    {Object.entries(sample.cleaned)
                      .filter(([key]) => !key.startsWith('_')) // Skip internal fields like _shouldSkip
                      .sort(([keyA], [keyB]) => {
                        // Custom sort order
                        const order = ['organization', 'firstName', 'lastName', 'jobTitle', 'phone', 'phone2', 'phone3', 'email', 'email2', 'email3', 'address', 'labels', 'website', 'notes'];
                        return order.indexOf(keyA) - order.indexOf(keyB);
                      })
                      .map(([field, value], idx) => {
                        if (!value) return null;

                        // Get field label
                        const fieldLabel =
                          field === 'firstName' ? 'First Name' :
                          field === 'lastName' ? 'Last Name' :
                          field === 'phone' ? 'Phone 1' :
                          field === 'phone2' ? 'Phone 2' :
                          field === 'phone3' ? 'Phone 3' :
                          field === 'email' ? 'Email 1' :
                          field === 'email2' ? 'Email 2' :
                          field === 'email3' ? 'Email 3' :
                          field === 'address' ? 'Address' :
                          field === 'organization' ? 'Organization' :
                          field === 'jobTitle' ? 'Job Title' :
                          field === 'labels' ? 'Labels' :
                          field === 'website' ? 'Website' :
                          field === 'notes' ? 'Notes' :
                          field;

                        const isMonospace = field.includes('phone') || field.includes('email') || field === 'website';

                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <span className={`text-xs font-medium min-w-[100px] ${
                              sample.cleaned._shouldSkip
                                ? (isLight ? 'text-red-700' : 'text-red-400')
                                : (isLight ? 'text-green-700' : 'text-green-400')
                            }`}>
                              {fieldLabel}:
                            </span>
                            <span className={`text-sm flex-1 break-all ${
                              isMonospace ? 'font-mono' : ''
                            } ${sample.cleaned._shouldSkip
                              ? (isLight ? 'text-red-900 font-medium line-through' : 'text-red-200 font-medium line-through')
                              : (isLight ? 'text-green-900 font-medium' : 'text-green-200 font-medium')
                            }`}>
                              {String(value)}
                            </span>
                          </div>
                        );
                      })}
                    {Object.keys(sample.cleaned).filter(k => !k.startsWith('_')).length === 0 && (
                      <p className={`text-xs italic ${
                        isLight ? 'text-green-600' : 'text-green-400'
                      }`}>
                        No data mapped for this contact
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      ) : (
        /* Contact List View */
        <div className={`rounded-lg border overflow-hidden ${
          isLight ? 'border-slate-200' : 'border-gray-700'
        }`}>
          <div className={`px-4 py-3 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-800/50 border-gray-700'
          }`}>
            <div className="flex items-center gap-2">
              <List className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <h4 className={`font-semibold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                All Contacts ({filteredContacts.length})
              </h4>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center">
                <Search className={`w-12 h-12 mx-auto mb-3 ${
                  isLight ? 'text-slate-300' : 'text-gray-600'
                }`} />
                <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  No contacts match your search
                </p>
              </div>
            ) : (
              filteredContacts.map((contact, idx) => (
                <div
                  key={idx}
                  className={`p-4 ${
                    isLight ? 'bg-white hover:bg-slate-50' : 'bg-gray-800 hover:bg-gray-750'
                  } transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    {/* Contact Number Badge */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      contact.cleaned._shouldSkip
                        ? isLight
                          ? 'bg-red-100 text-red-700'
                          : 'bg-red-900/30 text-red-400'
                        : isLight
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-blue-900/30 text-blue-400'
                    }`}>
                      {contact.index + 1}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name/Organization */}
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className={`font-semibold ${
                          contact.cleaned._shouldSkip
                            ? isLight
                              ? 'text-red-900 line-through'
                              : 'text-red-200 line-through'
                            : isLight
                            ? 'text-slate-900'
                            : 'text-white'
                        }`}>
                          {contact.cleaned.firstName || contact.cleaned.lastName
                            ? `${contact.cleaned.firstName || ''} ${contact.cleaned.lastName || ''}`.trim()
                            : contact.cleaned.organization || 'Unnamed Contact'}
                        </h5>
                        {contact.cleaned._shouldSkip && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            isLight ? 'bg-red-100 text-red-700' : 'bg-red-900/30 text-red-400'
                          }`}>
                            SKIP
                          </span>
                        )}
                      </div>

                      {/* Skip Reason */}
                      {contact.cleaned._shouldSkip && contact.cleaned._skipReason && (
                        <p className={`text-xs mb-2 ${
                          isLight ? 'text-red-700' : 'text-red-400'
                        }`}>
                          ⚠️ {contact.cleaned._skipReason}
                        </p>
                      )}

                      {/* Contact Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        {contact.cleaned.organization && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Organization:
                            </span>
                            <span className={`text-sm ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.organization}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.jobTitle && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Title:
                            </span>
                            <span className={`text-sm ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.jobTitle}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.phone && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Phone 1:
                            </span>
                            <span className={`text-sm font-mono ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.phone}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.phone2 && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Phone 2:
                            </span>
                            <span className={`text-sm font-mono ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.phone2}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.phone3 && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Phone 3:
                            </span>
                            <span className={`text-sm font-mono ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.phone3}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.email && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Email 1:
                            </span>
                            <span className={`text-sm font-mono ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.email}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.email2 && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Email 2:
                            </span>
                            <span className={`text-sm font-mono ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.email2}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.email3 && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Email 3:
                            </span>
                            <span className={`text-sm font-mono ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.email3}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.address && (
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Address:
                            </span>
                            <span className={`text-sm ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.address}
                            </span>
                          </div>
                        )}
                        {contact.cleaned.labels && (
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <span className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Labels:
                            </span>
                            <span className={`text-sm ${
                              contact.cleaned._shouldSkip
                                ? isLight ? 'text-red-700' : 'text-red-400'
                                : isLight ? 'text-slate-900' : 'text-gray-200'
                            }`}>
                              {contact.cleaned.labels}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Column Mapping Adjustments */}
      <div className={`rounded-lg border ${
        isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
      }`}>
        <div className={`px-4 py-3 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-800/50 border-gray-700'
        }`}>
          <h4 className={`font-semibold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Adjust Column Mappings
          </h4>
          <p className={`text-xs mt-1 ${
            isLight ? 'text-slate-500' : 'text-gray-500'
          }`}>
            Click on a target field to change the mapping
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-gray-700">
          {mappings.map((mapping, index) => {
            const isEditing = editingField === mapping.csvColumn;
            const targetField = TARGET_FIELDS.find(f => f.value === mapping.suggestedField);

            return (
              <div
                key={index}
                className={`px-4 py-3 flex items-center justify-between ${
                  isLight ? 'hover:bg-slate-50' : 'hover:bg-gray-700/30'
                }`}
              >
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {mapping.csvColumn}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className={`w-4 h-4 ${
                    isLight ? 'text-slate-400' : 'text-gray-600'
                  }`} />

                  {isEditing ? (
                    <select
                      value={mapping.suggestedField}
                      onChange={(e) => handleFieldChange(mapping.csvColumn, e.target.value)}
                      onBlur={() => setEditingField(null)}
                      autoFocus
                      className={`px-3 py-1.5 rounded border text-sm ${
                        isLight
                          ? 'bg-white border-blue-300 focus:border-blue-500'
                          : 'bg-gray-700 border-blue-600 text-white focus:border-blue-400'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    >
                      {TARGET_FIELDS.map(field => (
                        <option key={field.value} value={field.value}>
                          {field.label} {field.required ? '*' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingField(mapping.csvColumn)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        isLight
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                      }`}
                    >
                      {targetField?.label}
                      {targetField?.required && <span className="text-red-500 ml-1">*</span>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Tip */}
      <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
        <p>💡 Tip: The "Before → After" comparison shows how your data will be cleaned and imported. Names will be split, addresses combined, and phone numbers formatted automatically.</p>
      </div>
    </div>
  );
}
