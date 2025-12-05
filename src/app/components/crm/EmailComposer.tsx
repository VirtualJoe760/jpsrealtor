'use client';

import { useState } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

interface EmailComposerProps {
  isLight: boolean;
}

export default function EmailComposer({ isLight }: EmailComposerProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('message', message);

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/resend/send', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send email');
      } else {
        setResult(data);
        // Reset form
        setTo('');
        setSubject('');
        setMessage('');
        setAttachments([]);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-2 rounded-lg border transition-all shadow-md hover:shadow-lg focus:shadow-xl ${
    isLight
      ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      : 'bg-gray-800 border-gray-700 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-black/50'
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
      {/* Compose Email Form */}
      <div className={cardClass}>
        <h2 className={`text-2xl font-bold mb-4 ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          Compose Email
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* To */}
          <div>
            <label className={labelClass}>To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
              placeholder="recipient@example.com"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className={labelClass}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
              placeholder="Email subject"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className={labelClass}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputClass} min-h-[200px]`}
              placeholder="Write your message here..."
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className={labelClass}>Attachments (optional)</label>
            <input
              type="file"
              onChange={handleFileChange}
              className={inputClass}
              multiple
            />
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isLight ? 'bg-slate-100' : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                      <span className={`text-xs ${
                        isLight ? 'text-slate-500' : 'text-gray-500'
                      }`}>
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className={`p-1 rounded hover:bg-red-100 ${
                        isLight ? 'text-red-600' : 'text-red-400'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
            } ${
              isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send Email'}
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
        <div className={`p-4 rounded-lg ${
          isLight
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-emerald-900/20 border border-emerald-800 text-emerald-400'
        }`}>
          <p className="font-semibold">Email Sent Successfully!</p>
          <p className="text-sm mt-1">Message ID: {result.id}</p>
        </div>
      )}
    </div>
  );
}
