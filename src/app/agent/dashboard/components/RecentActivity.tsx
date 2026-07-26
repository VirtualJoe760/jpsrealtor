"use client";

// The agent's live activity stream — who signed up, inquired, or saved a home
// on their site. Fed by AgentActivity (Mongo), written by the tenant→owner
// bridge in src/lib/crm/mirror-to-owner.ts.
//
// Empty state is deliberately informative rather than blank: before a tenant
// site is connected (or while it runs on test data, which transmits nothing),
// there is genuinely no activity, and the agent should know that's expected.

import { useEffect, useState } from "react";
import { UserPlus, LogIn, MessageSquare, Heart, FileText, Activity } from "lucide-react";

type ActivityItem = {
  id: string;
  type: "signup" | "signin" | "lead" | "favorite" | "form";
  title: string;
  detail: string | null;
  source: string | null;
  createdAt: string;
};

const ICONS = {
  signup: UserPlus,
  signin: LogIn,
  lead: MessageSquare,
  favorite: Heart,
  form: FileText,
} as const;

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RecentActivity({ isLight }: { isLight: boolean }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/activity?limit=15", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems(d?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className={`rounded-xl border p-6 ${
        isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Activity className={`h-5 w-5 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
        <h2 className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
          Recent activity
        </h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-12 animate-pulse rounded-lg ${isLight ? "bg-gray-100" : "bg-gray-800"}`}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          Nothing yet. When someone creates an account, sends an inquiry, or saves a home on
          your site, it shows up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => {
            const Icon = ICONS[a.type] ?? Activity;
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isLight ? "bg-blue-50 text-blue-600" : "bg-emerald-900/30 text-emerald-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-gray-100"
                    }`}
                  >
                    {a.title}
                  </p>
                  <p className={`truncate text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                    {[a.detail, a.source].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {timeAgo(a.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
