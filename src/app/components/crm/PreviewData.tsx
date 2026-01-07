'use client';

import { AlertCircle, CheckCircle, FileText, Info } from 'lucide-react';

export interface PreviewDataProps {
  preview: {
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
  };
  mappings: Array<{
    csvColumn: string;
    suggestedField: string;
    confidence: number;
  }>;
  detectedProvider?: string | null;
  recommendations: string[];
  isLight: boolean;
}

export default function PreviewData({
  preview,
  mappings,
  detectedProvider,
  recommendations,
  isLight,
}: PreviewDataProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      google_contacts: 'Google Contacts',
      mojo_dialer: 'MOJO Dialer',
      title_rep: 'Title Rep',
      outlook: 'Microsoft Outlook',
    };
    return labels[provider] || provider;
  };

  // Helper: Clean contact data (preview of what will be imported)
  const cleanContactData = (row: any) => {
    const cleaned: any = {};

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
    const street = cleanMultiValue(cleaned['address.street'] || cleaned.street);
    const city = cleanMultiValue(cleaned['address.city'] || cleaned.city);
    const state = cleanMultiValue(cleaned['address.state'] || cleaned.state);
    const zip = cleanMultiValue(cleaned['address.zip'] || cleaned.zip);

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
      cleaned.fullAddress = addressParts.join(', ');
    }

    return cleaned;
  };

  // Transform sample rows to show cleaned contact data
  const contactRows = preview.sampleRows.map(row => cleanContactData(row));

  // Display columns in order: First Name, Last Name, Phone, Email, Address
  const displayColumns = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'fullAddress', label: 'Address' },
  ];

  return (
    <div className="space-y-6">
      {/* File Info Header */}
      <div className={`rounded-lg border p-6 ${
        isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${
            isLight ? 'bg-blue-100' : 'bg-blue-900/30'
          }`}>
            <FileText className={`w-6 h-6 ${
              isLight ? 'text-blue-600' : 'text-blue-400'
            }`} />
          </div>

          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-1 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {preview.fileName}
            </h3>
            <p className={`text-sm ${
              isLight ? 'text-slate-600' : 'text-gray-400'
            }`}>
              {formatFileSize(preview.fileSize)} " {preview.stats.totalRows} rows " {preview.stats.totalColumns} columns
            </p>

            {detectedProvider && (
              <div className="mt-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  isLight
                    ? 'bg-green-100 text-green-800'
                    : 'bg-green-900/30 text-green-400'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  Detected: {getProviderLabel(detectedProvider)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-xs font-medium mb-1 ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            Mapped Columns
          </p>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-blue-600' : 'text-blue-400'
          }`}>
            {preview.stats.mappedColumns}
          </p>
          <p className={`text-xs mt-1 ${
            isLight ? 'text-slate-500' : 'text-gray-500'
          }`}>
            of {preview.stats.totalColumns}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-xs font-medium mb-1 ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            Avg Confidence
          </p>
          <p className={`text-2xl font-bold ${
            preview.stats.avgConfidence >= 80
              ? isLight ? 'text-green-600' : 'text-green-400'
              : preview.stats.avgConfidence >= 60
              ? isLight ? 'text-yellow-600' : 'text-yellow-400'
              : isLight ? 'text-red-600' : 'text-red-400'
          }`}>
            {preview.stats.avgConfidence}%
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-xs font-medium mb-1 ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            Unmapped
          </p>
          <p className={`text-2xl font-bold ${
            preview.stats.unmappedColumns > 0
              ? isLight ? 'text-orange-600' : 'text-orange-400'
              : isLight ? 'text-slate-400' : 'text-gray-600'
          }`}>
            {preview.stats.unmappedColumns}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-xs font-medium mb-1 ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            Total Rows
          </p>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {preview.stats.totalRows}
          </p>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className={`rounded-lg border p-4 ${
          recommendations.some(r => r.includes('high confidence') || r.includes('proceed'))
            ? isLight
              ? 'bg-green-50 border-green-200'
              : 'bg-green-900/20 border-green-500/50'
            : isLight
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-yellow-900/20 border-yellow-500/50'
        }`}>
          <div className="flex items-start gap-3">
            {recommendations.some(r => r.includes('high confidence') || r.includes('proceed')) ? (
              <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isLight ? 'text-green-600' : 'text-green-400'
              }`} />
            ) : (
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isLight ? 'text-yellow-600' : 'text-yellow-400'
              }`} />
            )}
            <div className="flex-1">
              <p className={`font-semibold mb-2 ${
                recommendations.some(r => r.includes('high confidence') || r.includes('proceed'))
                  ? isLight ? 'text-green-900' : 'text-green-400'
                  : isLight ? 'text-yellow-900' : 'text-yellow-400'
              }`}>
                Recommendations
              </p>
              <ul className={`space-y-1 text-sm ${
                recommendations.some(r => r.includes('high confidence') || r.includes('proceed'))
                  ? isLight ? 'text-green-800' : 'text-green-300'
                  : isLight ? 'text-yellow-800' : 'text-yellow-300'
              }`}>
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1">"</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Identified Table */}
      <div className={`rounded-lg border ${
        isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
      }`}>
        <div className={`p-4 border-b ${
          isLight ? 'border-slate-200' : 'border-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <Info className={`w-4 h-4 ${
              isLight ? 'text-slate-600' : 'text-gray-400'
            }`} />
            <h4 className={`font-semibold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Contacts Identified
            </h4>
          </div>
          <p className={`text-xs mt-1 ${
            isLight ? 'text-slate-500' : 'text-gray-500'
          }`}>
            Preview of cleaned data - showing first {Math.min(5, contactRows.length)} of {preview.stats.totalRows} contacts
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={
              isLight ? 'bg-slate-50' : 'bg-gray-900'
            }>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold ${
                  isLight ? 'text-slate-700' : 'text-gray-300'
                }`}>
                  #
                </th>
                {displayColumns.map((col, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left text-xs font-semibold ${
                      isLight ? 'text-slate-700' : 'text-gray-300'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contactRows.slice(0, 5).map((contact, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-t ${
                    isLight ? 'border-slate-200' : 'border-gray-700'
                  }`}
                >
                  <td className={`px-4 py-3 text-xs ${
                    isLight ? 'text-slate-500' : 'text-gray-500'
                  }`}>
                    {rowIndex + 1}
                  </td>
                  {displayColumns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-sm max-w-xs ${
                        isLight ? 'text-slate-900' : 'text-gray-200'
                      }`}
                      title={contact[col.key]}
                    >
                      {contact[col.key] ? (
                        <span className={col.key === 'phone' || col.key === 'email' ? 'font-mono' : ''}>
                          {contact[col.key]}
                        </span>
                      ) : (
                        <span className={`text-xs italic ${
                          isLight ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {contactRows.length === 0 && (
          <div className={`px-4 py-8 text-center ${
            isLight ? 'text-slate-500' : 'text-gray-500'
          }`}>
            <p className="text-sm">No contacts could be identified from the data.</p>
            <p className="text-xs mt-1">Please check your column mappings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
