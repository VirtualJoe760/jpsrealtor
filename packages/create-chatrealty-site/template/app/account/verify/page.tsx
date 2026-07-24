"use client";

// Magic-link landing. The email link points here with ?token=… — we hand the
// token to /api/account/verify (which sets the httpOnly session cookie) and
// bounce home. No token handling in client-visible state beyond the URL param.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function Verifier() {
  const params = useSearchParams();
  const [phase, setPhase] = useState<"working" | "ok" | "fail">("working");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setPhase("fail");
      return;
    }
    fetch("/api/account/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          setPhase("ok");
          // Hard navigation so the account + favorites stores re-initialize with
          // the freshly-set session cookie (they start once per JS context).
          setTimeout(() => window.location.assign("/favorites"), 900);
        } else {
          setPhase("fail");
        }
      })
      .catch(() => setPhase("fail"));
  }, [params]);

  return (
    <div className="mx-auto max-w-sm py-20 text-center">
      {phase === "working" && <p className="text-sm text-gray-500">Signing you in…</p>}
      {phase === "ok" && <p className="text-sm text-green-700">You&apos;re in — taking you to your saved homes.</p>}
      {phase === "fail" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">That sign-in link is invalid or expired.</p>
          <Link href="/" className="inline-block text-sm font-semibold text-brand hover:underline">
            Back home
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-gray-500">Loading…</div>}>
      <Verifier />
    </Suspense>
  );
}
