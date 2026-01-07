'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, ArrowRight, Info } from 'lucide-react';

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
  { value: 'firstName', label: 'First Name', required: false },
  { value: 'lastName', label: 'Last Name', required: false },
  { value: 'fullName', label: 'Full Name', required: false },
  { value: 'phone', label: 'Phone Number', required: true },
  { value: 'email', label: 'Email Address', required: false },
  { value: 'address.street', label: 'Street Address', required: false },
  { value: 'address.city', label: 'City', required: false },
  { value: 'address.state', label: 'State', required: false },
  { value: 'address.zip', label: 'ZIP Code', required: false },
  { value: 'address.country', label: 'Country', required: false },
  { value: 'organization', label: 'Company/Organization', required: false },
  { value: 'jobTitle', label: 'Job Title', required: false },
  { value: 'website', label: 'Website', required: false },
  { value: 'birthday', label: 'Birthday', required: false },
  { value: 'notes', label: 'Notes', required: false },
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

    // Helper: Clean Google Contacts multi-value fields (separated by :::)
    const cleanMultiValue = (value: string | undefined): string => {
      if (!value) return '';
      // Split by ::: and take first non-empty value
      const parts = value.split(':::').map(p => p.trim()).filter(p => p);
      return parts[0] || '';
    };

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

    return { rawData, cleaned };
  };

  // Get sample rows (up to 3)
  const maxSamples = Math.min(3, sampleRows.length);
  const samples = Array.from({ length: maxSamples }, (_, i) => cleanContactData(i));

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
          <h3 className={`text-base font-semibold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Review Import Transformation
          </h3>
          <p className={`text-xs mt-1 ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            Compare raw CSV data with cleaned contacts that will be imported
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

      {/* Before/After Comparison Table */}
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
              Before → After Comparison
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
                    isLight ? 'text-green-700' : 'text-green-400'
                  }`}>
                    Cleaned Contact
                  </h5>
                  <div className="space-y-2">
                    {['firstName', 'lastName', 'phone', 'email', 'address'].map((field, idx) => {
                      const value = sample.cleaned[field];
                      if (!value) return null;
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className={`text-xs font-medium min-w-[100px] ${
                            isLight ? 'text-green-700' : 'text-green-400'
                          }`}>
                            {field === 'firstName' ? 'First Name' :
                             field === 'lastName' ? 'Last Name' :
                             field === 'phone' ? 'Phone' :
                             field === 'email' ? 'Email' :
                             'Address'}:
                          </span>
                          <span className={`text-sm flex-1 break-all ${
                            field === 'phone' || field === 'email' ? 'font-mono' : ''
                          } ${isLight ? 'text-green-900 font-medium' : 'text-green-200 font-medium'}`}>
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
          {mappings.filter(m => m.suggestedField !== 'ignore').map((mapping, index) => {
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
