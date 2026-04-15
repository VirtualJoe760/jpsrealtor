// src/app/lp/layout.tsx
// Dedicated layout for landing pages at /lp/{slug}.
// Inherits root theme providers. Includes agent footer on all landing pages.

import LandingPageFooter from "./LandingPageFooter";

export default function LandingPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <LandingPageFooter />
    </>
  );
}
