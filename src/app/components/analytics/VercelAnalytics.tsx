"use client";

// Vercel Web Analytics — page views for every host this deployment serves
// (jpsrealtor.com, josephsardella.com, chatrealty.io + agent subdomains).
// The beacon carries the full URL, so the dashboard's Hostnames panel splits
// traffic per domain with no extra wiring. Client component only because
// beforeSend is a function and can't cross the server→client boundary.
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Query params that carry credentials or contact details. Auth emails land on
// /auth/reset-password?token=…, /auth/welcome?token=…, and preview links carry
// crpv — none of that may leave the browser in an analytics beacon.
const SENSITIVE_PARAMS = /^(token|code|state|crpv|email|phone|key|secret|otp|session|auth.*|.*token)$/i;

function redact(event: BeforeSendEvent): BeforeSendEvent {
  try {
    const url = new URL(event.url);
    // Every /auth/* query string is credential-shaped; drop it wholesale.
    if (url.pathname.startsWith("/auth")) {
      url.search = "";
    } else {
      for (const name of Array.from(url.searchParams.keys())) {
        if (SENSITIVE_PARAMS.test(name)) url.searchParams.delete(name);
      }
    }
    return { ...event, url: url.toString() };
  } catch {
    return event;
  }
}

export default function VercelAnalytics() {
  return <Analytics beforeSend={redact} />;
}
