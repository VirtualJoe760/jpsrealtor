// src/app/campaign/layout.tsx
// Landing pages have their own minimal layout — no sidebar, no bottom nav.
// Clean, distraction-free experience for conversion-focused pages.

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "index, follow",
};

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" data-page="campaign">
      {children}
    </div>
  );
}
