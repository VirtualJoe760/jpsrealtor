// src/app/not-found.tsx
//
// Server wrapper for the 404 page so it can declare its own robots metadata.
// Next adds `noindex` to a 404 on its own, but the root layout's
// `robots: index, follow` (+ googleBot index) was ALSO emitted, so every 404
// carried two contradictory robots metas (site-platform-plan P1.5). Declaring
// noindex here overrides the layout's value; the body stays a client component
// because it reads the theme.

import type { Metadata } from "next";
import NotFoundClient from "./NotFoundClient";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function NotFound() {
  return <NotFoundClient />;
}
