'use client';

import { useState } from 'react';
import { Mic, Upload, Loader2 } from 'lucide-react';

interface DropCowboyCampaignProps {
  isLight: boolean;
}

export default function DropCowboyCampaign({ isLight }: DropCowboyCampaignProps) {
  const [audioMode, setAudioMode] = useState<'ai' | 'upload'>('ai');
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [voicemailText, setVoicemailText] = useState('');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [forwardingNumber, setForwardingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateAudio = async () => {
    if (!voicemailText) {
      setError('Please enter voicemail text');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/voicemail/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voicemailText }),
      });

      const data = await response.json();

      if (data.success) {
        // Convert base64 to blob URL
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: data.mimeType }
        );
        const url = URL.createObjectURL(audioBlob);
        setGeneratedAudioUrl(url);
      } else {
        setError(data.error || 'Failed to generate audio');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to generate audio');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!contactsFile) {
        setError('Please upload contacts file');
        setLoading(false);
        return;
      }

      if (audioMode === 'upload' && !audioFile) {
        setError('Please upload audio file');
        setLoading(false);
        return;
      }

      if (audioMode === 'ai' && !generatedAudioUrl) {
        setError('Please generate AI voicemail first');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('contacts', contactsFile);

      if (audioMode === 'upload' && audioFile) {
        formData.append('audio', audioFile);
      } else if (audioMode === 'ai' && generatedAudioUrl) {
        // Convert blob URL to File
        const response = await fetch(generatedAudioUrl);
        const blob = await response.blob();
        const file = new File([blob], 'generated-voicemail.mp3', { type: 'audio/mpeg' });
        formData.append('audio', file);
      }

      formData.append('campaignName', campaignName);
      formData.append('brandId', brandId);
      formData.append('forwardingNumber', forwardingNumber);

      const campaignResponse = await fetch('/api/dropcowboy/campaign', {
        method: 'POST',
        body: formData,
      });

      const data = await campaignResponse.json();

      if (!campaignResponse.ok) {
        setError(data.error || 'Failed to create campaign');
      } else {
        setResult(data);
        // Reset form
        setContactsFile(null);
        setAudioFile(null);
        setVoicemailText('');
        setGeneratedAudioUrl(null);
        setCampaignName('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-2 rounded-lg border transition-all ${
    isLight
      ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      : 'bg-gray-800 border-gray-700 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${
    isLight ? 'text-slate-700' : 'text-gray-300'
  }`;

  const cardClass = `rounded-xl p-6 ${
    isLight
      ? 'bg-white/95 border border-slate-200'
      : 'bg-gray-800/95 border border-gray-700'
  }`;

  return (
    <div className="space-y-6">
      {/* Campaign Form */}
      <div className={cardClass}>
        <h2 className={`text-2xl font-bold mb-4 ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          Ringless Voicemail Campaign
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Name */}
          <div>
            <label className={labelClass}>Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className={inputClass}
              placeholder="e.g., November Expired Listings"
              required
            />
          </div>

          {/* Brand ID */}
          <div>
            <label className={labelClass}>
              Brand ID <span className="text-xs text-gray-500">(Optional - for TCPA compliance)</span>
            </label>
            <input
              type="text"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={inputClass}
              placeholder="Optional: Your registered brand ID from Drop Cowboy"
            />
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
              Leave blank if you haven't registered a brand yet. Find in Drop Cowboy dashboard under Brand Management.
            </p>
          </div>

          {/* Forwarding Number */}
          <div>
            <label className={labelClass}>Forwarding Number (for replies)</label>
            <input
              type="text"
              value={forwardingNumber}
              onChange={(e) => setForwardingNumber(e.target.value)}
              className={inputClass}
              placeholder="+15555551234"
              required
            />
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
              Phone number to receive replies (E.164 format: +1XXXXXXXXXX)
            </p>
          </div>

          {/* Contacts File */}
          <div>
            <label className={labelClass}>Upload Contacts (CSV)</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setContactsFile(e.target.files?.[0] || null)}
              className={inputClass}
              required
            />
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
              CSV file with headers: phone, firstName, lastName, email, postalCode
            </p>
          </div>

          {/* Audio Mode Selection */}
          <div>
            <label className={labelClass}>Voicemail Audio</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAudioMode('ai')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  audioMode === 'ai'
                    ? isLight
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Mic className="w-5 h-5" />
                AI Voice Clone
              </button>
              <button
                type="button"
                onClick={() => setAudioMode('upload')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  audioMode === 'upload'
                    ? isLight
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Upload className="w-5 h-5" />
                Upload Audio
              </button>
            </div>

            {/* AI Voice Generation */}
            {audioMode === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    Voicemail Message
                  </label>
                  <textarea
                    value={voicemailText}
                    onChange={(e) => setVoicemailText(e.target.value)}
                    rows={6}
                    placeholder="Hi, this is Joseph Sardella with eXp Realty. I wanted to reach out about..."
                    className={`w-full px-4 py-3 rounded-lg border transition-all resize-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        : 'bg-gray-800 border-gray-700 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={generateAudio}
                  disabled={generating || !voicemailText}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    generating || !voicemailText ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                  } ${
                    isLight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating AI Voice...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Generate AI Voicemail
                    </>
                  )}
                </button>

                {generatedAudioUrl && (
                  <div className={`p-4 rounded-lg ${
                    isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-800'
                  }`}>
                    <p className={`text-sm font-semibold mb-2 ${
                      isLight ? 'text-green-700' : 'text-green-300'
                    }`}>
                      ✓ AI Voicemail Generated
                    </p>
                    <audio controls src={generatedAudioUrl} className="w-full" />
                  </div>
                )}
              </div>
            )}

            {/* Upload Audio File */}
            {audioMode === 'upload' && (
              <div>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className={inputClass}
                />
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                  Supported formats: MP3, WAV, M4A
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
            } ${
              isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {loading ? 'Sending Campaign...' : 'Send Campaign'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`p-4 rounded-lg ${
          isLight
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-red-900/20 border border-red-800 text-red-400'
        }`}>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className={cardClass}>
          <h2 className={`text-xl font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Campaign Results
          </h2>
          <div className="space-y-2">
            <p className={isLight ? 'text-slate-700' : 'text-gray-300'}>
              <span className="font-semibold">Campaign Name:</span> {result.campaignName}
            </p>
            <p className={isLight ? 'text-slate-700' : 'text-gray-300'}>
              <span className="font-semibold">Recording ID:</span> {result.recordingId}
            </p>
            <p className={isLight ? 'text-slate-700' : 'text-gray-300'}>
              <span className="font-semibold">Total Contacts:</span> {result.totalContacts}
            </p>
            <p className={`font-semibold ${isLight ? 'text-green-600' : 'text-emerald-400'}`}>
              ✅ Successful: {result.successCount}
            </p>
            {result.failureCount > 0 && (
              <p className={`font-semibold ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                ❌ Failed: {result.failureCount}
              </p>
            )}
          </div>

          {/* Detailed Results */}
          {result.results && result.results.length > 0 && (
            <div className="mt-4">
              <h3 className={`text-lg font-semibold mb-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Detailed Results
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className={`sticky top-0 ${isLight ? 'bg-slate-100' : 'bg-gray-700'}`}>
                    <tr>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r: any, i: number) => (
                      <tr key={i} className={`border-t ${
                        isLight ? 'border-slate-200' : 'border-gray-700'
                      }`}>
                        <td className="p-2">{r.phone}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            r.status === 'success'
                              ? isLight
                                ? 'bg-green-100 text-green-700'
                                : 'bg-emerald-900/30 text-emerald-400'
                              : isLight
                              ? 'bg-red-100 text-red-700'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2 text-xs">{r.dropId || r.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
