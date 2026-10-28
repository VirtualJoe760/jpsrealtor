import type { Metadata } from "next";
import { Suspense } from "react";
import JoinClient from "./JoinClient";

export const metadata: Metadata = {
  title: { absolute: "Join ChatRealty — Careers & Agents" },
  description:
    "Open roles at ChatRealty — fundraising, data engineering, real estate law and operations — and one platform for agents' websites, CRM and AI tools.",
};

export default function JoinPage() {
  // useSearchParams (?role=) needs a Suspense boundary to prerender.
  return (
    <Suspense>
      <JoinClient />
    </Suspense>
  );
}
