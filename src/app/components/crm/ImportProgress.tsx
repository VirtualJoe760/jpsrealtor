'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, XCircle, ChevronDown } from 'lucide-react';

export interface ImportProgressData {
  status: 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  successful: number;
  failed: number;
  duplicates: number;
  importErrors?: {
    row: number;
    field: string;
    value: string;
    error: string;
  }[];
}

interface ImportProgressProps {
  data: ImportProgressData;
  isLight: boolean;
}

export default function ImportProgress({ data, isLight }: ImportProgressProps) {
  const [showErrors, setShowErrors] = useState(false);

  const progressPercent = data.total > 0
    ? Math.round((data.processed / data.total) * 100)
    : 0;

  const isProcessing = data.status === 'processing';
  const isCompleted = data.status === 'completed';
  const isFailed = data.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className={`rounded-lg border p-6 ${
        isCompleted
          ? isLight
            ? 'bg-green-50 border-green-200'
            : 'bg-green-900/20 border-green-500/50'
          : isFailed
          ? isLight
            ? 'bg-red-50 border-red-200'
            : 'bg-red-900/20 border-red-500/50'
          : isLight
          ? 'bg-blue-50 border-blue-200'
          : 'bg-blue-900/20 border-blue-700/50'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {isProcessing && (
              <Loader2 className={`w-12 h-12 animate-spin ${
                isLight ? 'text-blue-600' : 'text-blue-400'
              }`} />
            )}
            {isCompleted && (
              <CheckCircle className={`w-12 h-12 ${
                isLight ? 'text-green-600' : 'text-green-400'
              }`} />
            )}
            {isFailed && (
              <XCircle className={`w-12 h-12 ${
                isLight ? 'text-red-600' : 'text-red-400'
              }`} />
            )}
          </div>

          <div className="flex-1">
            <h3 className={`text-2xl font-bold ${
              isCompleted
                ? isLight ? 'text-green-900' : 'text-green-400'
                : isFailed
                ? isLight ? 'text-red-900' : 'text-red-400'
                : isLight ? 'text-blue-900' : 'text-blue-400'
            }`}>
              {isProcessing && 'Importing Contacts...'}
              {isCompleted && 'Import Complete!'}
              {isFailed && 'Import Failed'}
            </h3>
            <p className={`text-sm mt-1 ${
              isCompleted
                ? isLight ? 'text-green-700' : 'text-green-300'
                : isFailed
                ? isLight ? 'text-red-700' : 'text-red-300'
                : isLight ? 'text-blue-700' : 'text-blue-300'
            }`}>
              {isProcessing && `Processing row ${data.processed} of ${data.total}...`}
              {isCompleted && `Successfully imported ${data.successful} contacts`}
              {isFailed && `Import stopped at row ${data.processed}`}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${
            isLight ? 'text-slate-700' : 'text-gray-300'
          }`}>
            Overall Progress
          </span>
          <span className={`text-sm font-bold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {progressPercent}%
          </span>
        </div>
        <div className={`w-full h-3 rounded-full overflow-hidden ${
          isLight ? 'bg-slate-200' : 'bg-gray-700'
        }`}>
          <div
            className={`h-full transition-all duration-300 ${
              isCompleted
                ? 'bg-green-500'
                : isFailed
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium ${
              isLight ? 'text-slate-600' : 'text-gray-400'
            }`}>
              Total Rows
            </p>
            <div className={`w-2 h-2 rounded-full ${
              isLight ? 'bg-slate-400' : 'bg-gray-600'
            }`} />
          </div>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {data.total}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-green-50 border-green-200'
            : 'bg-green-900/20 border-green-700/50'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium ${
              isLight ? 'text-green-700' : 'text-green-400'
            }`}>
              Successful
            </p>
            <CheckCircle className={`w-3 h-3 ${
              isLight ? 'text-green-600' : 'text-green-400'
            }`} />
          </div>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-green-900' : 'text-green-400'
          }`}>
            {data.successful}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-red-50 border-red-200'
            : 'bg-red-900/20 border-red-700/50'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium ${
              isLight ? 'text-red-700' : 'text-red-400'
            }`}>
              Errors
            </p>
            <XCircle className={`w-3 h-3 ${
              isLight ? 'text-red-600' : 'text-red-400'
            }`} />
          </div>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-red-900' : 'text-red-400'
          }`}>
            {data.failed}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-yellow-900/20 border-yellow-700/50'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium ${
              isLight ? 'text-yellow-700' : 'text-yellow-400'
            }`}>
              Skipped
            </p>
            <AlertCircle className={`w-3 h-3 ${
              isLight ? 'text-yellow-600' : 'text-yellow-400'
            }`} />
          </div>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-yellow-900' : 'text-yellow-400'
          }`}>
            {data.duplicates}
          </p>
        </div>
      </div>

      {/* Error Details */}
      {data.importErrors && data.importErrors.length > 0 && (
        <div className={`rounded-lg border ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <button
            onClick={() => setShowErrors(!showErrors)}
            className={`w-full p-4 flex items-center justify-between transition-colors ${
              isLight
                ? 'hover:bg-slate-50'
                : 'hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-5 h-5 ${
                isLight ? 'text-red-600' : 'text-red-400'
              }`} />
              <span className={`font-semibold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Error Details ({data.importErrors.length} errors)
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${
              showErrors ? 'rotate-180' : ''
            } ${isLight ? 'text-slate-600' : 'text-gray-400'}`} />
          </button>

          {showErrors && (
            <div className={`border-t max-h-64 overflow-y-auto ${
              isLight ? 'border-slate-200' : 'border-gray-700'
            }`}>
              <div className="p-4 space-y-3">
                {data.importErrors.map((error, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      isLight
                        ? 'bg-red-50'
                        : 'bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-xs font-semibold ${
                        isLight ? 'text-red-700' : 'text-red-400'
                      }`}>
                        Row {error.row}
                      </span>
                      <span className={`text-xs ${
                        isLight ? 'text-red-600' : 'text-red-300'
                      }`}>
                        Field: {error.field}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      isLight ? 'text-red-800' : 'text-red-200'
                    }`}>
                      {error.error}
                    </p>
                    {error.value && (
                      <p className={`text-xs mt-1 font-mono ${
                        isLight ? 'text-red-600' : 'text-red-400'
                      }`}>
                        Value: &quot;{error.value}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {isCompleted && data.successful > 0 && (
        <div className={`p-4 rounded-lg border ${
          isLight
            ? 'bg-green-50 border-green-200'
            : 'bg-green-900/20 border-green-500/50'
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              isLight ? 'text-green-600' : 'text-green-400'
            }`} />
            <div className={isLight ? 'text-green-800' : 'text-green-300'}>
              <p className="font-semibold mb-1">Import Successful!</p>
              <p className="text-sm">
                {data.successful} contact{data.successful !== 1 ? 's' : ''} imported successfully.
                {data.duplicates > 0 && ` ${data.duplicates} contact${data.duplicates !== 1 ? 's' : ''} skipped (duplicates or missing required fields).`}
                {data.failed > 0 && ` ${data.failed} error${data.failed !== 1 ? 's' : ''} occurred.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
