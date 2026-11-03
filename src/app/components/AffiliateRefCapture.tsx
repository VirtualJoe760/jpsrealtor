"use client";

// Captures affiliate links (?ref=CODE) on any page: POSTs the code to
// /api/affiliate/track, which counts the click and sets the first-party
// cr_aff cookie (httpOnly, 90 days). Reads window.location instead of
// useSearchParams so the root layout needs no Suspense boundary.
// Docs: docs/commerce/affiliates.md.

import { useEffect } from "react";

export default function AffiliateRefCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (!code || code.length > 40) return;
      fetch("/api/affiliate/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* never break the page for tracking */
    }
  }, []);
  return null;
}
