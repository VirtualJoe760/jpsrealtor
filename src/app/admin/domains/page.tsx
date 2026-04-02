// src/app/admin/domains/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import AdminNav from "@/app/components/AdminNav";
import {
  Globe, CheckCircle, XCircle, Clock, AlertTriangle, Ban,
  RefreshCw, ExternalLink, ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";

interface DomainMapping {
  _id: string;
  domain: string;
  agentEmail: string;
  subdivisionName: string;
  targetPath: string;
  status: string;
  sslStatus: string;
  dnsConfigured: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function AdminDomainsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; domain: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/signin");
  }, [authStatus, router]);

  useEffect(() => {
    if (session) fetchDomains();
  }, [session, filter]);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/domains${params}`);
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
        setCounts(data.counts || {});
      } else if (res.status === 403) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (domainId: string, action: string, reason?: string) => {
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
        fetchDomains();
        setRejectModal(null);
        setRejectReason("");
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending_approval": return <Clock className="w-4 h-4 text-amber-500" />;
      case "pending_dns": return <Clock className="w-4 h-4 text-blue-500" />;
      case "rejected": return <XCircle className="w-4 h-4 text-red-500" />;
      case "suspended": return <Ban className="w-4 h-4 text-gray-500" />;
      case "failed": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_approval: "Pending Approval",
      approved: "Approved",
      pending_dns: "Pending DNS",
      pending_verification: "Verifying",
      active: "Active",
      rejected: "Rejected",
      failed: "Failed",
      suspended: "Suspended",
    };
    return labels[status] || status;
  };

  const filterTabs = [
    { key: "all", label: "All", count: Object.values(counts).reduce((a, b) => a + b, 0) },
    { key: "pending_approval", label: "Pending", count: counts.pending_approval || 0 },
    { key: "pending_dns", label: "DNS Setup", count: counts.pending_dns || 0 },
    { key: "active", label: "Active", count: counts.active || 0 },
    { key: "rejected", label: "Rejected", count: counts.rejected || 0 },
    { key: "suspended", label: "Suspended", count: counts.suspended || 0 },
  ];

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight ? "bg-gray-50" : "bg-gray-950"}`}>
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              Domain Requests
            </h1>
            <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Review and manage agent custom domain mappings
            </p>
          </div>
          <button
            onClick={fetchDomains}
            className={`p-2 rounded-lg transition-colors ${
              isLight ? "hover:bg-gray-200" : "hover:bg-gray-800"
            }`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className={`flex gap-1 mb-6 p-1 rounded-lg border ${
          isLight ? "bg-gray-100 border-gray-200" : "bg-gray-900 border-gray-800"
        }`}>
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "bg-blue-600 text-white"
                  : isLight
                    ? "text-gray-700 hover:bg-gray-200"
                    : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === tab.key
                    ? "bg-white/20 text-white"
                    : tab.key === "pending_approval"
                      ? "bg-amber-100 text-amber-700"
                      : isLight
                        ? "bg-gray-200 text-gray-600"
                        : "bg-gray-700 text-gray-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Domain List */}
        {domains.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border ${
            isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"
          }`}>
            <Globe className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-gray-300" : "text-gray-600"}`} />
            <p className={`${isLight ? "text-gray-500" : "text-gray-500"}`}>
              {filter === "all" ? "No domain requests yet" : `No ${statusLabel(filter).toLowerCase()} domains`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <div
                key={domain._id}
                className={`p-4 rounded-xl border ${
                  domain.status === "pending_approval"
                    ? isLight
                      ? "bg-amber-50 border-amber-200"
                      : "bg-amber-950/10 border-amber-800/50"
                    : isLight
                      ? "bg-white border-gray-200"
                      : "bg-gray-900 border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Domain info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(domain.status)}
                      <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                        {domain.domain}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        domain.status === "active" ? "bg-green-100 text-green-700" :
                        domain.status === "pending_approval" ? "bg-amber-100 text-amber-700" :
                        domain.status === "pending_dns" ? "bg-blue-100 text-blue-700" :
                        domain.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {statusLabel(domain.status)}
                      </span>
                    </div>

                    <div className={`text-sm space-y-0.5 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                      <p>
                        <span className="font-medium">Agent:</span> {domain.agentEmail}
                      </p>
                      <p>
                        <span className="font-medium">Community:</span> {domain.subdivisionName}
                      </p>
                      <p>
                        <span className="font-medium">Path:</span> {domain.targetPath}
                      </p>
                      <p className="text-xs">
                        Submitted {new Date(domain.createdAt).toLocaleDateString()}
                        {domain.reviewedBy && (
                          <> · Reviewed by {domain.reviewedBy} on {new Date(domain.reviewedAt!).toLocaleDateString()}</>
                        )}
                      </p>
                      {domain.rejectionReason && (
                        <p className="text-xs text-red-500">
                          Reason: {domain.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {domain.status === "pending_approval" && (
                      <>
                        <button
                          onClick={() => handleAction(domain._id, "approve")}
                          disabled={actionLoading === domain._id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: domain._id, domain: domain.domain })}
                          disabled={actionLoading === domain._id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                    {(domain.status === "active" || domain.status === "pending_dns") && (
                      <button
                        onClick={() => handleAction(domain._id, "suspend")}
                        disabled={actionLoading === domain._id}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isLight
                            ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Suspend
                      </button>
                    )}
                    {domain.status === "active" && (
                      <a
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-1.5 rounded-lg transition-colors ${
                          isLight ? "hover:bg-gray-100" : "hover:bg-gray-800"
                        }`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {(domain.status === "rejected" || domain.status === "suspended") && (
                      <button
                        onClick={() => handleAction(domain._id, "approve")}
                        disabled={actionLoading === domain._id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Re-approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl p-6 ${
            isLight ? "bg-white" : "bg-gray-900"
          }`}>
            <h3 className={`text-lg font-semibold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
              Reject Domain Request
            </h3>
            <p className={`text-sm mb-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Rejecting <strong>{rejectModal.domain}</strong>. Provide a reason for the agent.
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
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isLight ? "bg-gray-100 text-gray-700" : "bg-gray-800 text-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(rejectModal.id, "reject", rejectReason)}
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
