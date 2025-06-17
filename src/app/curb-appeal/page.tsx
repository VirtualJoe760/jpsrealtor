// src/app/curb-appeal/page.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curb Appeal AI | JPS Realtor",
  description: "Transform your property photos with AI-generated enhancements that boost curb appeal.",
};

export default function CurbAppealPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">Boost Your Curb Appeal</h1>
        <p className="text-lg text-gray-300">
          Upload a photo of your property and let AI enhance its exterior to attract more buyers.
        </p>
        <div className="mt-10">
          {/* Add upload or UI logic here later */}
          <p className="text-sm text-gray-500">Upload form coming soon.</p>
        </div>
      </div>
    </main>
  );
}
