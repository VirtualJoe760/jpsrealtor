import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Real Estate — powered by ChatRealty",
  description: "Search homes for sale, explore neighborhoods, and save your favorites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold text-brand">
              My Real Estate
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link href="/listings" className="hover:text-brand">Listings</Link>
              <Link href="/neighborhoods/palm-desert" className="hover:text-brand">Neighborhoods</Link>
              <Link href="/favorites" className="hover:text-brand">Favorites</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
          Listing data via the MLS. Powered by{" "}
          <a href="https://chatrealty.io" className="underline">ChatRealty</a>.
        </footer>
      </body>
    </html>
  );
}
