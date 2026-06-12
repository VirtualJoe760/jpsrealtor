'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';

interface LegalData {
  terms: string;
  privacy: string;
  customTerms: string;
  customPrivacy: string;
}

export default function LegalSettings() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [data, setData] = useState<LegalData | null>(null);
  const [draftTerms, setDraftTerms] = useState('');
  const [draftPrivacy, setDraftPrivacy] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/agent/legal');
      const d = await res.json();
      if (d.success) {
        setData(d);
        setDraftTerms(d.customTerms || '');
        setDraftPrivacy(d.customPrivacy || '');
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/agent/legal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tab === 'terms' ? { customTerms: draftTerms } : { customPrivacy: draftPrivacy }),
      });
      if (!res.ok) throw new Error();
      setMsg('Saved');
      await load();
    } catch {
      setMsg('Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={`text-sm ${textSecondary} py-6`}>Loading legal documents…</div>;
  if (!data) return null;

  const preview = tab === 'terms' ? data.terms : data.privacy;
  const draft = tab === 'terms' ? draftTerms : draftPrivacy;
  const setDraft = tab === 'terms' ? setDraftTerms : setDraftPrivacy;
  const card = isLight ? 'bg-white border-gray-200' : 'bg-gray-800/40 border-gray-700/70';

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <h3 className={`font-semibold ${textPrimary}`}>Terms & Privacy</h3>
      <p className={`text-xs ${textSecondary} mb-3`}>
        We generate standardized legal documents with your information for your branded site.
        You may add your own language below — the ChatRealty platform clause and SMS terms are
        always included and can&apos;t be removed.
      </p>

      <div className="flex gap-2 mb-3">
        {(['terms', 'privacy'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMsg(''); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-blue-600 text-white' : isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-700 text-gray-200'
            }`}
          >
            {t === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-3 text-sm ${msg === 'Saved' ? 'text-green-600' : 'text-amber-600'}`}>{msg}</div>
      )}

      <label className={`block text-xs ${textSecondary} mb-1`}>
        Your custom {tab === 'terms' ? 'Terms' : 'Privacy'} body (optional — leave blank to use the standard one)
      </label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={8}
        placeholder="Leave blank to use the standardized document…"
        className={`w-full rounded-lg border p-3 text-sm font-mono ${
          isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-900/50 text-gray-100'
        }`}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <details className="mt-4">
        <summary className={`cursor-pointer text-sm font-medium ${textPrimary}`}>Preview published document</summary>
        <div className={`mt-3 max-h-96 overflow-y-auto rounded-lg border p-4 text-sm ${
          isLight ? 'border-gray-200 text-gray-700' : 'border-gray-700 text-gray-300'
        }`}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className={`text-xl font-bold mb-3 ${textPrimary}`}>{children}</h1>,
              h2: ({ children }) => <h2 className={`text-base font-bold mt-4 mb-2 ${textPrimary}`}>{children}</h2>,
              h3: ({ children }) => <h3 className={`text-sm font-semibold mt-2 mb-1 ${textPrimary}`}>{children}</h3>,
              p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>,
              strong: ({ children }) => <strong className={textPrimary}>{children}</strong>,
              hr: () => <hr className={`my-4 ${isLight ? 'border-gray-200' : 'border-gray-700'}`} />,
              a: ({ href, children }) => <a href={href} className="underline text-blue-500">{children}</a>,
            }}
          >
            {preview}
          </ReactMarkdown>
        </div>
      </details>
    </div>
  );
}
