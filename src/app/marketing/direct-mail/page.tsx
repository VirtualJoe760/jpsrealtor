'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DirectMailPage() {
  const router = useRouter();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    setCsvFile(file);
    setError('');
  };

  const handleNext = () => {
    if (!csvFile) {
      setError('Please upload your farm CSV.');
      return;
    }

    // Store file name in session for later (or use upload here)
    localStorage.setItem('uploaded_farm_csv', csvFile.name);

    // Move to letter body editor step (coming next)
    router.push('/marketing/direct-mail/letter');
  };

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Step 1: Upload Farm CSV</h1>

      <div className="space-y-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block"
        />

        {csvFile && (
          <p className="text-green-700 text-sm">
            Selected file: {csvFile.name}
          </p>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleNext}
          className="mt-4 bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-400 transition"
        >
          Next: Edit Letter
        </button>
      </div>
    </main>
  );
}
