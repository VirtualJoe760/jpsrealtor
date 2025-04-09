'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AssetUploadPage() {
  const router = useRouter();
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<FileList | null>(null);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!backgroundFile || !qrCodeFile) {
      setError('Please upload both a background PDF and a QR code image.');
      return;
    }

    // Save files to session (or pass along using formData in the next API call)
    // For now, we’ll use sessionStorage to temporarily hold file names (not the files themselves)
    sessionStorage.setItem('background_file', backgroundFile.name);
    sessionStorage.setItem('qr_code_file', qrCodeFile.name);
    sessionStorage.setItem(
      'additional_files',
      additionalFiles ? Array.from(additionalFiles).map(f => f.name).join(',') : ''
    );

    router.push('/marketing/direct-mail/review'); // This will be the final "generate & download" step
  };

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Step 3: Upload Assets</h1>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block font-medium mb-1">Background PDF *</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setBackgroundFile(e.target.files?.[0] || null)}
          />
          {backgroundFile && <p className="text-sm text-green-700 mt-1">✔ {backgroundFile.name}</p>}
        </div>

        <div>
          <label className="block font-medium mb-1">QR Code Image *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setQrCodeFile(e.target.files?.[0] || null)}
          />
          {qrCodeFile && <p className="text-sm text-green-700 mt-1">✔ {qrCodeFile.name}</p>}
        </div>

        <div>
          <label className="block font-medium mb-1">Additional Flyer PDFs (Optional)</label>
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => setAdditionalFiles(e.target.files)}
          />
          {additionalFiles && (
            <ul className="text-sm text-green-700 mt-1 list-disc ml-5">
              {Array.from(additionalFiles).map((file, idx) => (
                <li key={idx}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleNext}
          className="mt-4 bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-400 transition"
        >
          Next: Generate Marketing Package
        </button>
      </div>
    </main>
  );
}
