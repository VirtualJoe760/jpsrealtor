import type { Metadata } from "next";
import { Suspense } from "react";
import SupportClient from "./SupportClient";

export const metadata: Metadata = {
  title: { absolute: "Support ChatRealty" },
  description: "Make a one-time contribution to fund ChatRealty's development.",
};

export default function SupportPage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense>
      <SupportClient />
    </Suspense>
  );
}
