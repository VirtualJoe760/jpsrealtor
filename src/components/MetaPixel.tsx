// src/components/MetaPixel.tsx
"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initMetaPixel, pageView, FB_PIXEL_ID } from "@/lib/meta-pixel";

function MetaPixelCore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize Meta Pixel on mount
    initMetaPixel();
  }, []);

  useEffect(() => {
    // Track page views on route change
    if (pathname) {
      pageView();
    }
  }, [pathname, searchParams]);

  // Render the noscript pixel for users without JavaScript
  if (!FB_PIXEL_ID) {
    return null;
  }

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

export default function MetaPixel() {
  return (
    <Suspense fallback={null}>
      <MetaPixelCore />
    </Suspense>
  );
}
