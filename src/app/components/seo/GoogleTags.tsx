// Google gtag.js for this tenant: GA4 measurement + Google Ads remarketing.
//
// Both ride ONE gtag.js load with a `config` call per ID — that is Google's
// documented way to run GA4 and Ads together, and loading the library twice
// double-counts pageviews.
//
// The Google Ads (AW-) tag is the part that was missing entirely. GA4 alone
// cannot build Google Ads remarketing audiences — YouTube and Display
// retargeting need the AW- tag on the page, so without it the site could
// measure traffic it had no way to advertise back to.

import Script from "next/script";
import type { TenantTracking } from "@/lib/nav-layout";

interface GoogleTagsProps {
  tracking: Pick<TenantTracking, "ga4MeasurementId" | "googleAdsId">;
}

export default function GoogleTags({ tracking }: GoogleTagsProps) {
  const { ga4MeasurementId, googleAdsId } = tracking;
  if (!ga4MeasurementId && !googleAdsId) return null;

  // gtag.js is fetched once, keyed on whichever ID exists; the id in the URL
  // only selects the initial config, and the explicit config() calls below are
  // what actually register each stream.
  const loaderId = ga4MeasurementId || googleAdsId;

  const configLines = [
    ga4MeasurementId && `gtag('config', '${ga4MeasurementId}');`,
    // allow_enhanced_conversions stays off: it sends hashed user data, which is
    // a consent decision for the agent to make, not a default to inherit.
    googleAdsId && `gtag('config', '${googleAdsId}');`,
  ]
    .filter(Boolean)
    .join("\n                ");

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
        strategy="afterInteractive"
      />
      <Script id="google-tags" strategy="afterInteractive">
        {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${configLines}
              `}
      </Script>
    </>
  );
}
