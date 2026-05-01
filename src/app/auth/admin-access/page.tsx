"use client";

// src/app/auth/admin-access/page.tsx
// Shown to admins when they visit an agent's subdomain.
// Choose: "View as Agent" (impersonate) or "View as Administrator" (own account).

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { Shield, User, ArrowRight } from "lucide-react";

export default function AdminAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = searchParams.get("subdomain") || "";
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const { textPrimary, textSecondary, cardBg, border, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [loading, setLoading] = useState<"agent" | "admin" | null>(null);
  const [agentName, setAgentName] = useState<string>("");

  // Fetch agent name for the subdomain
  useEffect(() => {
    if (!subdomain) return;
    fetch(`/api/agent-branding?subdomain=${subdomain}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.agentName) setAgentName(data.agentName);
      })
      .catch(() => {});
  }, [subdomain]);

  const handleAgentMode = async () => {
    setLoading("agent");
    try {
      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", subdomain }),
      });
      if (res.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to impersonate");
        setLoading(null);
      }
    } catch {
      alert("Failed to impersonate");
      setLoading(null);
    }
  };

  const handleAdminMode = () => {
    setLoading("admin");
    router.push(callbackUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div
            className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              isLight ? "bg-amber-100" : "bg-amber-900/30"
            }`}
          >
            <Shield size={28} className="text-amber-500" />
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Admin Access</h1>
          <p className={`text-sm ${textSecondary}`}>
            You&apos;re visiting{" "}
            <span className="font-semibold">
              {agentName || subdomain}
            </span>
            &apos;s site as an administrator.
          </p>
          <p className={`text-xs ${textSecondary}`}>
            How would you like to proceed?
          </p>
        </div>

        <div className="space-y-3">
          {/* View as Agent */}
          <button
            onClick={handleAgentMode}
            disabled={loading !== null}
            className={`w-full flex items-center gap-4 p-5 rounded-xl border transition-all text-left ${
              isLight
                ? `${cardBg} ${border} hover:border-blue-400 hover:bg-blue-50/50`
                : `${cardBg} ${border} hover:border-blue-500 hover:bg-blue-900/20`
            } ${loading === "agent" ? "opacity-70" : ""} disabled:cursor-not-allowed`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                isLight ? "bg-blue-100" : "bg-blue-900/40"
              }`}
            >
              <User size={22} className={isLight ? "text-blue-600" : "text-blue-400"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${textPrimary}`}>
                View as {agentName || "Agent"}
              </p>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Access their dashboard, settings, and profile. You can upload
                photos, edit branding, and manage their account.
              </p>
            </div>
            <ArrowRight size={18} className={textSecondary} />
          </button>

          {/* View as Administrator */}
          <button
            onClick={handleAdminMode}
            disabled={loading !== null}
            className={`w-full flex items-center gap-4 p-5 rounded-xl border transition-all text-left ${
              isLight
                ? `${cardBg} ${border} hover:border-amber-400 hover:bg-amber-50/50`
                : `${cardBg} ${border} hover:border-amber-500 hover:bg-amber-900/20`
            } ${loading === "admin" ? "opacity-70" : ""} disabled:cursor-not-allowed`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                isLight ? "bg-amber-100" : "bg-amber-900/40"
              }`}
            >
              <Shield size={22} className={isLight ? "text-amber-600" : "text-amber-400"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${textPrimary}`}>
                View as Administrator
              </p>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Stay logged in as your admin account. You&apos;ll see your own
                dashboard and data.
              </p>
            </div>
            <ArrowRight size={18} className={textSecondary} />
          </button>
        </div>

        <p className={`text-center text-[11px] ${textSecondary}`}>
          Only admin accounts see this prompt.
          {agentName && ` Agent: ${agentName} (${subdomain})`}
        </p>
      </div>
    </div>
  );
}
