'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const defaultBody = `I am reaching out to let you know about the incredible opportunities available for your property located at:

[Property Address]

Attached is a cma of recently sold properties in your neighborhood. This report will provide insights into current market trends and if you would like a more detailed report reach out via my contact information below and I'll be happy to provide you with additional property data.

You will find a flyer for my current listing in your neighborhood 538 E Miraleste Ct. This stunning estate boasts 6 beds, 5 baths with 3,524Sft on a 16,988 Sqft Lot. If you know someone who would be interested in this listing I would highly appreciate your referral business. Contact me for a private showing.

Finally, I would like to offer you a free Seller's Guide to the Coachella Valley, which you can access by scanning the QR code below. The guide provides essential tips for selling your home and includes an option to book a coffee appointment with me to discuss your real estate needs.

Please contact me at your earliest convenience to discuss your options.`;

export default function LetterEditorPage() {
  const router = useRouter();
  const [letterBody, setLetterBody] = useState(defaultBody);

  const handleNext = () => {
    localStorage.setItem('letter_body', letterBody);
    router.push('/marketing/direct-mail/assets');
  };

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Step 2: Edit Letter Body</h1>

      <div className="flex flex-col gap-4 max-w-3xl">
        <label htmlFor="letterBody" className="font-semibold">
          Letter Body (editable section only):
        </label>
        <textarea
          id="letterBody"
          value={letterBody}
          onChange={(e) => setLetterBody(e.target.value)}
          rows={20}
          className="w-full p-4 border border-gray-300 text-black rounded-md shadow-sm text-sm font-mono"
        />

        <button
          onClick={handleNext}
          className="self-start mt-4 bg-slate-800 text-black px-6 py-2 rounded hover:bg-slate-400 transition"
        >
          Next: Upload Assets
        </button>
      </div>
    </main>
  );
}
