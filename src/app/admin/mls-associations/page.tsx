"use client";

// Admin: MLS associations to contact about IDX data access. Grouped by
// association, with the contact details agents gave us and a status per
// agent record to track the calls. API: /api/admin/mls-associations.

import { useEffect, useState } from "react";
import { Building2, Loader2, Phone, Mail, Globe, User as UserIcon } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";

type Agent = {
  userId: string;
  name: string;
  email: string;
  isAgent: boolean;
  phase: string | null;
  associationName: string;
  mlsId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  dataAccessStatus: string;
  adminNotes: string;
  complete: boolean;
};
type Group = { associationName: string; agents: Agent[] };

const STATUS_LABEL: Record<string, string> = {
  not_contacted: "Not contacted",
  contacted: "Contacted",
  in_progress: "In progress",
  connected: "Data connected",
  declined: "Declined",
};

export default function AdminMlsAssociationsPage() {
  const { currentTheme } = useTheme();
  const { textPrimary, textMuted, cardBg, cardBorder } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/admin/mls-associations")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load"))))
      .then((d) => setGroups(d.groups || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function patch(userId: string, body: Record<string, string>) {
    await fetch("/api/admin/mls-associations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...body }),
    });
  }

  const input = `rounded-md border px-2 py-1 text-xs ${isLight ? "bg-white border-gray-300 text-gray-900" : "bg-gray-800 border-gray-700 text-white"}`;

  return (
    <div className="p-6 max-w-6xl">
      <h1 className={`text-2xl font-bold ${textPrimary}`}>MLS Associations</h1>
      <p className={`mt-1 text-sm ${textMuted}`}>
        Who to call about IDX data access. Agents enter their association and its contact details on their
        application, dashboard or Settings → Identity.
      </p>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      {!groups && !error && <Loader2 className="mt-6 w-6 h-6 animate-spin text-blue-500" />}

      <div className="mt-6 space-y-5">
        {groups?.map((g) => {
          // Association contact details: the most complete agent entry wins.
          const c = [...g.agents].sort((a, b) => Number(b.complete) - Number(a.complete))[0];
          return (
            <div key={g.associationName} className={`rounded-xl border p-5 ${cardBg} ${cardBorder}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Building2 className={`w-5 h-5 mt-0.5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>{g.associationName}</h2>
                    <p className={`text-xs ${textMuted}`}>
                      {g.agents.length} agent{g.agents.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {g.associationName !== "Not provided yet" && (
                  <div className={`text-sm space-y-0.5 ${textPrimary}`}>
                    {c.contactName && <p className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" />{c.contactName}</p>}
                    {c.contactPhone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /><a className="underline" href={`tel:${c.contactPhone}`}>{c.contactPhone}</a></p>}
                    {c.contactEmail && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /><a className="underline" href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a></p>}
                    {c.website && <p className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /><a className="underline" href={c.website} target="_blank" rel="noopener noreferrer">{c.website.replace(/^https?:\/\//, "")}</a></p>}
                    {!c.contactPhone && !c.contactEmail && <p className={textMuted}>No contact details yet</p>}
                  </div>
                )}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-left text-xs ${textMuted}`}>
                      <th className="py-1 pr-3 font-medium">Agent</th>
                      <th className="py-1 pr-3 font-medium">MLS ID</th>
                      <th className="py-1 pr-3 font-medium">Status</th>
                      <th className="py-1 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.agents.map((a) => (
                      <tr key={a.userId} className={`border-t ${cardBorder}`}>
                        <td className={`py-2 pr-3 ${textPrimary}`}>
                          {a.name}
                          <span className={`block text-xs ${textMuted}`}>
                            {a.email}
                            {!a.isAgent && a.phase ? ` · applicant (${a.phase.replace(/_/g, " ")})` : ""}
                          </span>
                        </td>
                        <td className={`py-2 pr-3 font-mono ${textPrimary}`}>{a.mlsId || "—"}</td>
                        <td className="py-2 pr-3">
                          <select
                            className={input}
                            defaultValue={a.dataAccessStatus}
                            onChange={(e) => patch(a.userId, { dataAccessStatus: e.target.value })}
                          >
                            {Object.entries(STATUS_LABEL).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <input
                            className={`${input} w-full min-w-[12rem]`}
                            defaultValue={a.adminNotes}
                            placeholder="Call notes…"
                            onBlur={(e) => e.target.value !== a.adminNotes && patch(a.userId, { adminNotes: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
