"use client";

import { useEffect, useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";

interface DomainMapping {
  _id: string;
  domain: string;
  agentId: string;
  agentEmail: string;
  subdivisionName?: string;
  targetPath: string;
  mappingType: "agent_landing" | "community_page" | "custom";
  status: string;
  sslStatus: string;
  dnsConfigured: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

type TabKey = "pending" | "all" | "vercel";

interface VercelDomain {
  name: string;
  apexName: string;
  verified: boolean;
  createdAt: number;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  pending_dns: "bg-amber-100 text-amber-700",
  pending_verification: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  suspended: "bg-gray-200 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Pending Approval",
  approved: "Approved",
  pending_dns: "Pending DNS",
  pending_verification: "Verifying",
  active: "Active",
  rejected: "Rejected",
  failed: "Failed",
  suspended: "Suspended",
};

const MAPPING_TYPE_LABELS: Record<string, string> = {
  agent_landing: "Agent Landing",
  community_page: "Community",
  custom: "Custom",
};

function formatTarget(mapping: DomainMapping): string {
  if (mapping.mappingType === "agent_landing") return "Agent Homepage";
  if (mapping.mappingType === "community_page" && mapping.subdivisionName) {
    return `Community: ${mapping.subdivisionName}`;
  }
  return mapping.targetPath;
}

export default function AdminDomainsPage() {
  const { textPrimary, textSecondary, border, cardBg, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [allDomains, setAllDomains] = useState<DomainMapping[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    domain: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [vercelDomains, setVercelDomains] = useState<VercelDomain[]>([]);

  const pendingDomains = allDomains.filter(
    (d) => d.status === "pending_approval"
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingsRes, vercelRes] = await Promise.all([
        fetch("/api/admin/domains"),
        fetch("/api/domains/list").catch(() => null),
      ]);
      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setAllDomains(data.domains || []);
        setCounts(data.counts || {});
      }
      if (vercelRes?.ok) {
        const data = await vercelRes.json();
        setVercelDomains(data.domains || []);
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (
    domainId: string,
    action: string,
    reason?: string
  ) => {
    setActionLoading(domainId);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, action, rejectionReason: reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchData();
        setRejectModal(null);
        setRejectReason("");
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const cls = STATUS_BADGE_CLASSES[status] || "bg-gray-100 text-gray-600";
    const label = STATUS_LABELS[status] || status;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}
      >
        {label}
      </span>
    );
  };

  const mappingTypeBadge = (type: string) => {
    const label = MAPPING_TYPE_LABELS[type] || type;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          isLight ? "bg-blue-50 text-blue-600" : "bg-blue-900/40 text-blue-300"
        }`}
      >
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse">Loading domains...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>Domains</h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            {pendingDomains.length} pending &middot; {allDomains.length} total
            mappings
          </p>
        </div>
        <button
          onClick={fetchData}
          className={`p-2 rounded-lg transition-colors ${
            isLight ? "hover:bg-gray-100" : "hover:bg-white/5"
          }`}
        >
          <RefreshCw size={18} className={textSecondary} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div
        className={`flex gap-1 p-1 rounded-lg border w-fit ${
          isLight
            ? "bg-gray-100 border-gray-200"
            : "bg-white/5 border-white/10"
        }`}
      >
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "bg-blue-600 text-white"
              : `${textSecondary} ${isLight ? "hover:bg-gray-200" : "hover:bg-white/10"}`
          }`}
        >
          Pending Requests
          {pendingDomains.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "pending"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {pendingDomains.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "all"
              ? "bg-blue-600 text-white"
              : `${textSecondary} ${isLight ? "hover:bg-gray-200" : "hover:bg-white/10"}`
          }`}
        >
          All Domains
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "all"
                ? "bg-white/20 text-white"
                : isLight
                  ? "bg-gray-200 text-gray-600"
                  : "bg-gray-700 text-gray-400"
            }`}
          >
            {allDomains.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("vercel")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "vercel"
              ? "bg-blue-600 text-white"
              : `${textSecondary} ${isLight ? "hover:bg-gray-200" : "hover:bg-white/10"}`
          }`}
        >
          Vercel Project
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "vercel"
                ? "bg-white/20 text-white"
                : isLight
                  ? "bg-gray-200 text-gray-600"
                  : "bg-gray-700 text-gray-400"
            }`}
          >
            {vercelDomains.length}
          </span>
        </button>
      </div>

      {/* Pending Requests Tab */}
      {activeTab === "pending" && (
        <div>
          {pendingDomains.length === 0 ? (
            <div
              className={`${cardBg} border ${border} rounded-xl p-12 text-center`}
            >
              <CheckCircle
                size={40}
                className={`mx-auto mb-3 ${isLight ? "text-green-300" : "text-green-600/50"}`}
              />
              <p className={`font-medium ${textPrimary}`}>All caught up</p>
              <p className={`text-sm mt-1 ${textSecondary}`}>
                No pending domain requests to review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDomains.map((domain) => (
                <div
                  key={domain._id}
                  className={`${cardBg} border ${border} rounded-xl p-5`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Domain name */}
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={18} className="text-blue-500 flex-shrink-0" />
                        <span className={`text-lg font-semibold ${textPrimary}`}>
                          {domain.domain}
                        </span>
                        {mappingTypeBadge(domain.mappingType)}
                      </div>

                      {/* Details grid */}
                      <div
                        className={`text-sm space-y-1 ml-[26px] ${textSecondary}`}
                      >
                        <p>
                          <span className="font-medium">Agent:</span>{" "}
                          {domain.agentEmail}
                        </p>
                        <p>
                          <span className="font-medium">Target:</span>{" "}
                          {formatTarget(domain)}
                        </p>
                        <p className="text-xs">
                          Submitted{" "}
                          {new Date(domain.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                      <button
                        onClick={() => handleAction(domain._id, "approve")}
                        disabled={actionLoading === domain._id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          setRejectModal({
                            id: domain._id,
                            domain: domain.domain,
                          })
                        }
                        disabled={actionLoading === domain._id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Domains Tab */}
      {activeTab === "all" && (
        <div className={`${cardBg} border ${border} rounded-xl overflow-hidden`}>
          {allDomains.length === 0 ? (
            <div className="p-12 text-center">
              <Globe
                size={40}
                className={`mx-auto mb-3 ${isLight ? "text-gray-300" : "text-gray-600"}`}
              />
              <p className={textSecondary}>No domain mappings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className={`border-b ${border} ${
                      isLight ? "bg-gray-50" : "bg-white/5"
                    }`}
                  >
                    <th
                      className={`text-left px-4 py-3 font-medium ${textSecondary}`}
                    >
                      Domain
                    </th>
                    <th
                      className={`text-left px-4 py-3 font-medium ${textSecondary}`}
                    >
                      Agent
                    </th>
                    <th
                      className={`text-left px-4 py-3 font-medium ${textSecondary}`}
                    >
                      Target
                    </th>
                    <th
                      className={`text-left px-4 py-3 font-medium ${textSecondary}`}
                    >
                      Status
                    </th>
                    <th
                      className={`text-left px-4 py-3 font-medium ${textSecondary}`}
                    >
                      Type
                    </th>
                    <th
                      className={`text-left px-4 py-3 font-medium ${textSecondary}`}
                    >
                      Created
                    </th>
                    <th
                      className={`text-right px-4 py-3 font-medium ${textSecondary}`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allDomains.map((domain) => (
                    <tr
                      key={domain._id}
                      className={`border-b last:border-b-0 ${border} ${
                        isLight ? "hover:bg-gray-50" : "hover:bg-white/[0.02]"
                      } transition-colors`}
                    >
                      <td className={`px-4 py-3 font-medium ${textPrimary}`}>
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-blue-500 flex-shrink-0" />
                          {domain.domain}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${textSecondary}`}>
                        {domain.agentEmail}
                      </td>
                      <td className={`px-4 py-3 ${textSecondary}`}>
                        <span className="max-w-[200px] truncate block">
                          {formatTarget(domain)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(domain.status)}</td>
                      <td className="px-4 py-3">
                        {mappingTypeBadge(domain.mappingType)}
                      </td>
                      <td className={`px-4 py-3 ${textSecondary}`}>
                        {new Date(domain.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {domain.status === "pending_approval" && (
                            <>
                              <button
                                onClick={() =>
                                  handleAction(domain._id, "approve")
                                }
                                disabled={actionLoading === domain._id}
                                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setRejectModal({
                                    id: domain._id,
                                    domain: domain.domain,
                                  })
                                }
                                disabled={actionLoading === domain._id}
                                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {(domain.status === "active" ||
                            domain.status === "pending_dns") && (
                            <button
                              onClick={() =>
                                handleAction(domain._id, "suspend")
                              }
                              disabled={actionLoading === domain._id}
                              className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                                isLight
                                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                  : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                              }`}
                              title="Suspend"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(domain.status === "rejected" ||
                            domain.status === "suspended") && (
                            <button
                              onClick={() =>
                                handleAction(domain._id, "approve")
                              }
                              disabled={actionLoading === domain._id}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                              title="Re-approve"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {domain.status === "active" && (
                            <a
                              href={`https://${domain.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1.5 rounded-md transition-colors ${
                                isLight
                                  ? "hover:bg-gray-100"
                                  : "hover:bg-white/10"
                              }`}
                              title="Visit"
                            >
                              <ExternalLink
                                className={`w-3.5 h-3.5 ${textSecondary}`}
                              />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vercel Project Domains Tab */}
      {activeTab === "vercel" && (
        <div>
          {vercelDomains.length === 0 ? (
            <div className={`${cardBg} border ${border} rounded-xl p-12 text-center`}>
              <Globe size={40} className={`mx-auto mb-3 ${textSecondary}`} />
              <p className={`text-lg font-semibold ${textPrimary}`}>No Vercel domains found</p>
              <p className={`text-sm mt-1 ${textSecondary}`}>
                VERCEL_PROJECT_ID may not be configured, or the project has no domains.
              </p>
            </div>
          ) : (
            <div className={`${cardBg} border ${border} rounded-xl overflow-hidden`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${border}`}>
                    <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Domain</th>
                    <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Apex</th>
                    <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Status</th>
                    <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Added</th>
                    <th className={`text-right px-4 py-3 font-semibold ${textPrimary}`}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {vercelDomains.map((d) => (
                    <tr key={d.name} className={`border-b ${border} last:border-0`}>
                      <td className={`px-4 py-3 font-medium ${textPrimary}`}>{d.name}</td>
                      <td className={`px-4 py-3 ${textSecondary}`}>{d.apexName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          d.verified
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {d.verified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${textSecondary}`}>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a href={`https://${d.name}`} target="_blank" rel="noopener noreferrer"
                          className={`p-1.5 rounded inline-block transition-colors ${isLight ? "hover:bg-gray-100 text-gray-500" : "hover:bg-white/10 text-gray-400"}`}>
                          <ExternalLink size={16} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-xl p-6 ${
              isLight ? "bg-white" : "bg-gray-900"
            }`}
          >
            <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
              Reject Domain Request
            </h3>
            <p className={`text-sm mb-4 ${textSecondary}`}>
              Rejecting <strong>{rejectModal.domain}</strong>. Provide a reason
              for the agent.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border text-sm mb-4 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-gray-800 border-gray-700 text-white"
              }`}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isLight
                    ? "bg-gray-100 text-gray-700"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(rejectModal.id, "reject", rejectReason)
                }
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Reject Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
