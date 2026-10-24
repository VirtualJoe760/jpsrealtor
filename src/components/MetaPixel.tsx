// src/components/MetaPixel.tsx
"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initMetaPixel, pageView, FB_PIXEL_ID } from "@/lib/meta-pixel";

/** pixelId comes from agentProfile.tracking (resolved server-side); it falls back
 *  to the platform env pixel so existing tenants keep reporting unchanged. */
interface MetaPixelProps {
  pixelId?: string;
}

function MetaPixelCore({ pixelId }: MetaPixelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = (pixelId || "").trim() || FB_PIXEL_ID;

  useEffect(() => {
    // Initialize Meta Pixel on mount
    initMetaPixel(activeId);
  }, [activeId]);

  useEffect(() => {
    // Fires on EVERY route, including map URLs carrying lat/lng.
    //
    // This used to bail out when lat/lng were present, to avoid Meta's "parameters
    // blocked" notice. That cost far more than it saved: MapLayer writes lat/lng into
    // the URL on every pan/zoom — on /chap AND on / — so the pixel went silent on the
    // map and on the homepage the moment anyone touched it, i.e. exactly where
    // engagement happens. Meta strips suspected PII from event_source_url and still
    // records the event, so the suppression traded real conversion data for a clean
    // dashboard. autoConfig is off (see lib/meta-pixel.ts), which is the correct fix
    // for the underlying PII concern — it stops the query string being sent as event
    // parameters at all.
    if (pathname) {
      pageView();
    }
  }, [pathname, searchParams]);

  // Render the noscript pixel for users without JavaScript
  if (!activeId) {
    return null;
  }

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${activeId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

export default function MetaPixel({ pixelId }: MetaPixelProps) {
  return (
    <Suspense fallback={null}>
      <MetaPixelCore pixelId={pixelId} />
    </Suspense>
  );
}
