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
  Database,
  Cloud,
  Shield,
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

interface AgentInfo {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  brokerageName?: string;
  image?: string;
}

type TabKey = "pending" | "all" | "registry" | "vercel";

interface RegistryDomain {
  _id: string;
  domain: string;
  type: "platform" | "agent_subdomain" | "agent_custom" | "community";
  status: "active" | "pending" | "suspended" | "decommissioned";
  ownerEmail?: string;
  ownerType: string;
  target: { type: string; path: string; agentSubdomain?: string };
  vercel: { registered: boolean; verified: boolean; sslStatus: string };
  cloudflare: { registered: boolean; status?: string; zoneId?: string; nameserversUpdated?: boolean; nameservers?: string[]; registrar?: string; nameserverCheckedAt?: string };
  gsc: { registered: boolean; verified: boolean };
  analytics: { gaEnabled: boolean; measurementId?: string };
  createdAt: string;
}

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

// Platform master domains (chatrealty.io, jpsrealtor.com, vercel.app)
const PLATFORM_APEX_DOMAINS = ["chatrealty.io", "jpsrealtor.com", "vercel.app"];

function VercelDomainsGrouped({
  domains,
  agentDomains,
  agents,
  isLight,
  textPrimary,
  textSecondary,
  border,
  cardBg,
}: {
  domains: VercelDomain[];
  agentDomains: DomainMapping[];
  agents: Record<string, AgentInfo>;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  border: string;
  cardBg: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["platform"]));

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Group domains: platform vs agent-owned
  const platformDomains = domains.filter((d) =>
    PLATFORM_APEX_DOMAINS.some((apex) => d.apexName === apex || d.name.endsWith(apex))
  );

  // Build agent map from DomainMapping records
  const agentMap = new Map<string, { email: string; domains: VercelDomain[] }>();
  const unmatchedAgent: VercelDomain[] = [];

  for (const d of domains) {
    if (platformDomains.includes(d)) continue;
    // Try to match to an agent via DomainMapping
    const mapping = agentDomains.find((m) => m.domain === d.name || m.domain === d.apexName);
    if (mapping) {
      const key = mapping.agentEmail;
      if (!agentMap.has(key)) agentMap.set(key, { email: key, domains: [] });
      agentMap.get(key)!.domains.push(d);
    } else {
      unmatchedAgent.push(d);
    }
  }

  const renderDomainRow = (d: VercelDomain) => (
    <div key={d.name} className={`flex items-center justify-between px-4 py-2.5 border-b last:border-0 ${border}`}>
      <div className="flex items-center gap-3">
        <Globe size={14} className={textSecondary} />
        <span className={`text-sm font-medium ${textPrimary}`}>{d.name}</span>
        {d.name !== d.apexName && (
          <span className={`text-xs ${textSecondary}`}>({d.apexName})</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          d.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}>
          {d.verified ? "Verified" : "Unverified"}
        </span>
        <span className={`text-xs ${textSecondary}`}>{new Date(d.createdAt).toLocaleDateString()}</span>
        <a href={`https://${d.name}`} target="_blank" rel="noopener noreferrer"
          className={`p-1 rounded transition-colors ${isLight ? "hover:bg-gray-100 text-gray-500" : "hover:bg-white/10 text-gray-400"}`}>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );

  const renderAccordion = (key: string, title: string, subtitle: string, badge: string, badgeColor: string, items: VercelDomain[]) => (
    <div key={key} className={`${cardBg} border ${border} rounded-xl overflow-hidden`}>
      <button
        onClick={() => toggle(key)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${isLight ? "hover:bg-gray-50" : "hover:bg-white/5"}`}
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>{badge}</span>
          <div>
            <span className={`font-semibold ${textPrimary}`}>{title}</span>
            <span className={`text-xs ml-2 ${textSecondary}`}>{subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${textSecondary}`}>{items.length} domain{items.length !== 1 ? "s" : ""}</span>
          <span className={`transition-transform ${expanded.has(key) ? "rotate-180" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
      </button>
      {expanded.has(key) && items.length > 0 && (
        <div className={`border-t ${border}`}>
          {items.map(renderDomainRow)}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {renderAccordion(
        "platform",
        "ChatRealty",
        "Platform master domains",
        "MASTER",
        isLight ? "bg-blue-100 text-blue-700" : "bg-blue-900/50 text-blue-300",
        platformDomains
      )}
      {Array.from(agentMap.entries()).map(([email, data]) => {
        const info = agents[email];
        const title = info?.name || email;
        const details = [
          email,
          info?.phone,
          info?.brokerageName,
          info?.licenseNumber ? `DRE# ${info.licenseNumber}` : null,
        ].filter(Boolean).join(" · ");
        return renderAccordion(
          email,
          title,
          details,
          "AGENT",
          isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-900/50 text-emerald-300",
          data.domains
        );
      })}
      {unmatchedAgent.length > 0 &&
        renderAccordion(
          "unassigned",
          "Unassigned",
          "Domains not linked to any agent",
          "?",
          isLight ? "bg-gray-100 text-gray-600" : "bg-gray-700 text-gray-400",
          unmatchedAgent
        )
      }
    </div>
  );
}

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
  const [registryDomains, setRegistryDomains] = useState<RegistryDomain[]>([]);
  const [registryCounts, setRegistryCounts] = useState<Record<string, number>>({});
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});

  const pendingDomains = allDomains.filter(
    (d) => d.status === "pending_approval"
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingsRes, vercelRes, registryRes] = await Promise.all([
        fetch("/api/admin/domains"),
        fetch("/api/domains/list").catch(() => null),
        fetch("/api/domains/registry").catch(() => null),
      ]);
      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setAllDomains(data.domains || []);
        setCounts(data.counts || {});
        setAgents(data.agents || {});
      }
      if (vercelRes?.ok) {
        const data = await vercelRes.json();
        setVercelDomains(data.domains || []);
      }
      if (registryRes?.ok) {
        const data = await registryRes.json();
        setRegistryDomains(data.domains || []);
        setRegistryCounts(data.counts || {});
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

  const [nsModal, setNsModal] = useState<{
    domain: string;
    nameservers: string[];
    registrar?: string;
    message: string;
  } | null>(null);

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
        // Show nameserver instructions modal if Cloudflare was provisioned
        if (data.nameserverInstructions) {
          setNsModal(data.nameserverInstructions);
        }
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

  const handleCheckNameservers = async (registryId?: string) => {
    try {
      const res = await fetch("/api/domains/registry/check-nameservers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registryId ? { registryId } : { all: true }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error || "Check failed");
      }
    } catch {
      toast.error("Check failed");
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
          onClick={() => setActiveTab("registry")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "registry"
              ? "bg-blue-600 text-white"
              : `${textSecondary} ${isLight ? "hover:bg-gray-200" : "hover:bg-white/10"}`
          }`}
        >
          Registry
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "registry"
                ? "bg-white/20 text-white"
                : isLight
                  ? "bg-purple-100 text-purple-600"
                  : "bg-purple-900/50 text-purple-300"
            }`}
          >
            {registryDomains.length}
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
                          {agents[domain.agentEmail]?.name || domain.agentEmail}
                          {agents[domain.agentEmail]?.name && (
                            <span className="ml-1 text-xs">({domain.agentEmail})</span>
                          )}
                        </p>
                        {(agents[domain.agentEmail]?.phone || agents[domain.agentEmail]?.brokerageName) && (
                          <p className="text-xs">
                            {[
                              agents[domain.agentEmail]?.phone,
                              agents[domain.agentEmail]?.brokerageName,
                              agents[domain.agentEmail]?.licenseNumber ? `DRE# ${agents[domain.agentEmail].licenseNumber}` : null,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        )}
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
                        <div>
                          <span className={`text-sm ${textPrimary}`}>{agents[domain.agentEmail]?.name || domain.agentEmail}</span>
                          {agents[domain.agentEmail]?.name && (
                            <p className="text-xs">{domain.agentEmail}</p>
                          )}
                          {agents[domain.agentEmail]?.phone && (
                            <p className="text-xs">{agents[domain.agentEmail].phone}</p>
                          )}
                        </div>
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

      {/* Registry Tab */}
      {activeTab === "registry" && (
        <div>
          {/* Registry type counts */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {(["platform", "agent_subdomain", "agent_custom", "community"] as const).map((t) => (
              <div key={t} className={`${cardBg} border ${border} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${textPrimary}`}>{registryCounts[t] || 0}</p>
                <p className={`text-xs ${textSecondary} capitalize`}>{t.replace("_", " ")}</p>
              </div>
            ))}
          </div>

          {registryDomains.length === 0 ? (
            <div className={`${cardBg} border ${border} rounded-xl p-12 text-center`}>
              <Database size={40} className={`mx-auto mb-3 ${textSecondary}`} />
              <p className={`font-medium ${textPrimary}`}>No registry records</p>
              <p className={`text-sm mt-1 ${textSecondary}`}>
                Run the seed to populate from Vercel domains.
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/domains/registry/seed", { method: "POST" });
                    const data = await res.json();
                    if (res.ok) {
                      toast.success(`Seed complete: ${data.results.platformSeeded} platform, ${data.results.agentSubdomainsSeeded} subdomains, ${data.results.domainMappingsMigrated} mappings migrated`);
                      fetchData();
                    } else {
                      toast.error(data.error || "Seed failed");
                    }
                  } catch {
                    toast.error("Seed failed");
                  }
                }}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Seed from Vercel + DomainMappings
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/domains/registry/cloudflare-provision", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ all: true }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      toast.success(`Cloudflare: ${data.succeeded}/${data.total} domains provisioned`);
                      fetchData();
                    } else {
                      toast.error(data.error || "Cloudflare provisioning failed");
                    }
                  } catch {
                    toast.error("Cloudflare provisioning failed");
                  }
                }}
                className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Provision All on Cloudflare
              </button>
            </div>
          ) : (
            <>
            {/* Cloudflare provision button for unregistered domains */}
            {registryDomains.some((d) => !d.cloudflare.registered && d.type !== "agent_subdomain") && (
              <div className={`${cardBg} border ${border} rounded-xl p-4 mb-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Cloud size={18} className="text-orange-500" />
                  <span className={`text-sm ${textPrimary}`}>
                    {registryDomains.filter((d) => !d.cloudflare.registered && d.type !== "agent_subdomain").length} domain(s) not yet on Cloudflare
                  </span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/domains/registry/cloudflare-provision", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ all: true }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        toast.success(`Cloudflare: ${data.succeeded}/${data.total} domains provisioned`);
                        fetchData();
                      } else {
                        toast.error(data.error || "Provisioning failed");
                      }
                    } catch {
                      toast.error("Provisioning failed");
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Provision All on Cloudflare
                </button>
              </div>
            )}
            {/* Pending nameserver updates banner */}
            {registryDomains.some((d) => d.cloudflare.registered && !d.cloudflare.nameserversUpdated && d.cloudflare.status !== "active" && d.type !== "agent_subdomain") && (
              <div className={`${cardBg} border ${border} rounded-xl p-4 mb-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <span className={`text-sm ${textPrimary}`}>
                    {registryDomains.filter((d) => d.cloudflare.registered && !d.cloudflare.nameserversUpdated && d.cloudflare.status !== "active" && d.type !== "agent_subdomain").length} domain(s) awaiting nameserver update
                  </span>
                </div>
                <button
                  onClick={() => handleCheckNameservers()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Check All Nameservers
                </button>
              </div>
            )}
            <div className={`${cardBg} border ${border} rounded-xl overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${border} ${isLight ? "bg-gray-50" : "bg-white/5"}`}>
                      <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Domain</th>
                      <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Type</th>
                      <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Owner</th>
                      <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Target</th>
                      <th className={`text-center px-4 py-3 font-medium ${textSecondary}`}>Vercel</th>
                      <th className={`text-center px-4 py-3 font-medium ${textSecondary}`}>Cloudflare</th>
                      <th className={`text-center px-4 py-3 font-medium ${textSecondary}`}>GSC</th>
                      <th className={`text-center px-4 py-3 font-medium ${textSecondary}`}>GA4</th>
                      <th className={`text-center px-4 py-3 font-medium ${textSecondary}`}>NS</th>
                      <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registryDomains.map((rd) => {
                      const typeColors: Record<string, string> = {
                        platform: isLight ? "bg-blue-50 text-blue-700" : "bg-blue-900/40 text-blue-300",
                        agent_subdomain: isLight ? "bg-emerald-50 text-emerald-700" : "bg-emerald-900/40 text-emerald-300",
                        agent_custom: isLight ? "bg-amber-50 text-amber-700" : "bg-amber-900/40 text-amber-300",
                        community: isLight ? "bg-purple-50 text-purple-700" : "bg-purple-900/40 text-purple-300",
                      };
                      const statusColors: Record<string, string> = {
                        active: "bg-green-100 text-green-700",
                        pending: "bg-amber-100 text-amber-700",
                        suspended: "bg-gray-200 text-gray-600",
                        decommissioned: "bg-red-100 text-red-700",
                      };
                      return (
                        <tr key={rd._id} className={`border-b last:border-b-0 ${border} ${isLight ? "hover:bg-gray-50" : "hover:bg-white/[0.02]"} transition-colors`}>
                          <td className={`px-4 py-3 font-medium ${textPrimary}`}>
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-blue-500 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{rd.domain}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeColors[rd.type] || ""}`}>
                              {rd.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className={`px-4 py-3 ${textSecondary} text-xs`}>
                            {rd.ownerEmail || rd.ownerType}
                          </td>
                          <td className={`px-4 py-3 ${textSecondary} text-xs`}>
                            <span className="truncate max-w-[150px] block">{rd.target.path}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {rd.vercel.registered ? (
                              rd.vercel.verified ? (
                                <CheckCircle size={16} className="mx-auto text-green-500" />
                              ) : (
                                <Clock size={16} className="mx-auto text-amber-500" />
                              )
                            ) : (
                              <XCircle size={16} className="mx-auto text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {rd.cloudflare.registered ? (
                              rd.cloudflare.status === "active" ? (
                                <Cloud size={16} className="mx-auto text-orange-500" />
                              ) : (
                                <Clock size={16} className="mx-auto text-amber-500" />
                              )
                            ) : (
                              <XCircle size={16} className="mx-auto text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {rd.gsc.registered ? (
                              rd.gsc.verified ? (
                                <CheckCircle size={16} className="mx-auto text-green-500" />
                              ) : (
                                <Clock size={16} className="mx-auto text-amber-500" />
                              )
                            ) : (
                              <XCircle size={16} className="mx-auto text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {rd.analytics.gaEnabled ? (
                              <Shield size={16} className="mx-auto text-green-500" />
                            ) : (
                              <XCircle size={16} className="mx-auto text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!rd.cloudflare.registered || rd.type === "agent_subdomain" ? (
                              <span className={`text-[10px] ${textSecondary}`}>—</span>
                            ) : rd.cloudflare.nameserversUpdated || rd.cloudflare.status === "active" ? (
                              <span title="Nameservers active"><CheckCircle size={16} className="mx-auto text-green-500" /></span>
                            ) : (
                              <button
                                onClick={() => handleCheckNameservers(rd._id)}
                                className="group relative"
                                title={`Pending NS update${rd.cloudflare.nameservers?.length ? `: ${rd.cloudflare.nameservers.join(", ")}` : ""}`}
                              >
                                <AlertTriangle size={16} className="mx-auto text-amber-500 group-hover:text-amber-600" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[rd.status] || ""}`}>
                              {rd.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* Vercel Project Domains Tab — grouped by owner */}
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
            <VercelDomainsGrouped
              domains={vercelDomains}
              agentDomains={allDomains}
              agents={agents}
              isLight={isLight}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              border={border}
              cardBg={cardBg}
            />
          )}
        </div>
      )}

      {/* Nameserver Instructions Modal */}
      {nsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-lg rounded-xl p-6 ${
              isLight ? "bg-white" : "bg-gray-900"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className={`text-lg font-semibold ${textPrimary}`}>
                Nameserver Update Required
              </h3>
            </div>
            <p className={`text-sm mb-4 ${textSecondary}`}>
              The domain has been provisioned on Cloudflare, but the nameservers at
              {nsModal.registrar ? ` ${nsModal.registrar}` : " the registrar"} need to be updated
              for DNS to flow through Cloudflare.
            </p>
            <div
              className={`rounded-lg p-4 mb-4 font-mono text-sm ${
                isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800 border border-gray-700"
              }`}
            >
              <p className={`text-xs font-sans font-medium mb-2 ${textSecondary}`}>
                Set nameservers to:
              </p>
              {nsModal.nameservers.map((ns) => (
                <div key={ns} className={`py-1 ${textPrimary}`}>
                  {ns}
                </div>
              ))}
            </div>
            <p className={`text-xs mb-4 ${textSecondary}`}>
              Cloudflare zone will activate once nameservers propagate (usually 15min–24hrs).
              You can check the status from the Registry tab.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setNsModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Got it
              </button>
            </div>
          </div>
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
