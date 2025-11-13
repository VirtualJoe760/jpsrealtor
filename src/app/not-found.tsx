// src/app/not-found.tsx
// Custom 404 page for Next.js

import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Joey Sardella - Real Estate",
  description: "The page you're looking for doesn't exist. Explore our listings and neighborhoods instead.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-4">
      <div className="max-w-3xl mx-auto text-center">
        {/* 404 Message */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4">
            404
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Page Not Found
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Looks like this property has been moved or doesn't exist. Let's get you back on track.
          </p>
        </div>

        {/* Navigation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/"
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
          >
            <span className="relative z-10">🏠 Go Home</span>
          </Link>
          <Link
            href="/mls-listings"
            className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
          >
            <span className="relative z-10">🔍 Browse Listings</span>
          </Link>
          <Link
            href="/neighborhoods"
            className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
          >
            <span className="relative z-10">🗺️ Explore Neighborhoods</span>
          </Link>
          <a
            href="/#contact"
            className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
          >
            <span className="relative z-10">💬 Contact Joey</span>
          </a>
        </div>

        {/* Additional Help Text */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-3">Need Help?</h3>
          <p className="text-gray-300 mb-4">
            If you think this page should exist or if you need assistance finding a specific property or neighborhood, please contact me directly.
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <a href="tel:+1234567890" className="text-blue-400 hover:text-blue-300">
              📞 Call
            </a>
            <a href="mailto:joey@example.com" className="text-blue-400 hover:text-blue-300">
              ✉️ Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
