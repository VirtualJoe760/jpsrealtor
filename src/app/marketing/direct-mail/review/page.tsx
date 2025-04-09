'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ReviewAndGeneratePage() {
  const router = useRouter();
  const [letterBody, setLetterBody] = useState('');
  const [csvName, setCsvName] = useState('');
  const [background, setBackground] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [flyers, setFlyers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState('');

  useEffect(() => {
    setLetterBody(localStorage.getItem('letter_body') || '');
    setCsvName(localStorage.getItem('uploaded_farm_csv') || '');
    setBackground(sessionStorage.getItem('background_file') || '');
    setQrCode(sessionStorage.getItem('qr_code_file') || '');
    const flyerList = sessionStorage.getItem('additional_files');
    setFlyers(flyerList ? flyerList.split(',') : []);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setDownloadLink('');

    try {
      // This would be your actual API call to run the Python script
      const res = await fetch('/api/marketing/generate', {
        method: 'POST',
        body: JSON.stringify({
          csv: csvName,
          letterBody,
          background,
          qrCode,
          flyers,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.success && data.downloadUrl) {
        setDownloadLink(data.downloadUrl);
      } else {
        alert('Something went wrong generating your package.');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating package.');
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Step 4: Review & Generate</h1>

      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="font-semibold text-lg mb-1">CSV File</h2>
          <p>{csvName || 'None uploaded'}</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-1">Letter Body</h2>
          <div className="p-4 border rounded-md bg-gray-800 whitespace-pre-wrap text-sm">
            {letterBody}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-1">Background PDF</h2>
          <p>{background || 'Not uploaded'}</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-1">QR Code</h2>
          <p>{qrCode || 'Not uploaded'}</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-1">Flyers (Optional)</h2>
          {flyers.length > 0 ? (
            <ul className="list-disc ml-5 text-sm">
              {flyers.map((file, idx) => (
                <li key={idx}>{file}</li>
              ))}
            </ul>
          ) : (
            <p>None</p>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-6 bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-400 transition"
        >
          {loading ? 'Generating...' : 'Generate Marketing Package'}
        </button>

        {downloadLink && (
          <div className="mt-6">
            <a
              href={downloadLink}
              download
              className="text-blue-600 underline"
            >
              Download Marketing Package (.rar)
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
