"use client";

// Banner shown when an admin is impersonating an agent via /api/auth/impersonate.
// Reads impersonation state from the session — no props needed.
// Shows a persistent amber bar with agent info and "Exit to Admin" button.

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Eye, ArrowLeft } from "lucide-react";

export default function ImpersonationBanner() {
  const { data: session } = useSession();
  const [exiting, setExiting] = useState(false);

  const impersonatedBy = (session?.user as any)?.impersonatedBy as string | undefined;
  const impersonatedByName = (session?.user as any)?.impersonatedByName as string | undefined;

  if (!impersonatedBy) return null;

  const handleExit = async () => {
    setExiting(true);
    try {
      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (res.ok) {
        window.location.href = "/admin";
      } else {
        setExiting(false);
      }
    } catch {
      setExiting(false);
    }
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Eye size={16} />
        <span>
          Viewing as <strong>{session?.user?.name}</strong> ({session?.user?.email})
          {" — "}logged in as {impersonatedByName || impersonatedBy}
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1 px-3 py-1 bg-amber-700 text-white rounded-md text-xs font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
      >
        <ArrowLeft size={12} />
        {exiting ? "Exiting..." : "Exit to Admin"}
      </button>
    </div>
  );
}
