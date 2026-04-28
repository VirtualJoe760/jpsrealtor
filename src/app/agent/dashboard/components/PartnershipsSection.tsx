"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/contexts/ThemeContext";
import PartnershipCard from "@/app/components/partner/PartnershipCard";
import type { Partnership as PartnershipType } from "@/app/components/partner/PartnershipCard";
import {
  Handshake,
  UserPlus,
  Clock,
  CheckCircle2,
  Building2,
  Phone,
  Globe,
  Mail,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PartnerApplication {
  _id: string;
  name: string;
  email: string;
  image?: string;
  phone?: string;
  createdAt: string;
  servicePartnerProfile: {
    type: string;
    companyName: string;
    companyLogo?: string;
    website?: string;
    phone?: string;
    bio?: string;
    licenseNumber?: string;
    licenseState?: string;
    nmlsId?: string;
    certifications?: Array<{ name: string; issuedBy: string; year: string }>;
    serviceAreas?: Array<{ name: string; type: string }>;
  };
}

type TabFilter = "applications" | "pending" | "active" | "all";

export default function PartnershipsSection() {
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [partnerships, setPartnerships] = useState<PartnershipType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("applications");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, partnershipsRes] = await Promise.all([
        fetch("/api/agent/partner-applications"),
        fetch("/api/partnerships"),
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.partners || []);
      }

      if (partnershipsRes.ok) {
        const pData = await partnershipsRes.json();
        const mapped: PartnershipType[] = (pData.partnerships || []).map(
          (p: any) => ({
            _id: p._id,
            agentName: p.agentId?.name || "Unknown Agent",
            agentPhoto:
              p.agentId?.image || p.agentId?.agentProfile?.headshot || "",
            partnerName: p.servicePartnerId?.name || "Unknown Partner",
            partnerPhoto: p.servicePartnerId?.image || "",
            status: p.status,
            costSplit: {
              agent: p.terms?.agentPercentage ?? 50,
              partner: p.terms?.partnerPercentage ?? 50,
            },
            jmaStatus: p.respaCompliance?.jointMarketingAgreement
              ? "signed"
              : "unsigned",
            createdAt: p.createdAt,
          })
        );
        setPartnerships(mapped);
      }
    } catch (error) {
      console.error("Error fetching partnerships data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreatePartnership = async (partnerId: string) => {
    setActionLoading(partnerId);
    try {
      const res = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });

      if (res.ok) {
        await fetchData();
        setActiveTab("pending");
      } else {
        const data = await res.json();
        if (res.status === 409) {
          alert("A partnership already exists with this partner.");
        } else {
          alert(data.error || "Failed to create partnership");
        }
      }
    } catch (error) {
      console.error("Error creating partnership:", error);
      alert("Failed to create partnership");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/partnerships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error("Error accepting partnership:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this partnership request?"))
      return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/partnerships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error("Error rejecting partnership:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingPartnerships = partnerships.filter((p) => p.status === "pending");
  const activePartnerships = partnerships.filter((p) => p.status === "active");

  const formatPartnerType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "applications", label: "New Requests", count: applications.length },
    { key: "pending", label: "Pending", count: pendingPartnerships.length },
    { key: "active", label: "Active", count: activePartnerships.length },
    { key: "all", label: "All", count: partnerships.length },
  ];

  if (isLoading) {
    return (
      <div
        className={`rounded-xl p-6 ${
          isLight ? "bg-white/30 shadow-lg" : "bg-neutral-900/30 shadow-lg shadow-blue-500/20"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Handshake className={`w-6 h-6 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
          <h2 className={`text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            Partnerships
          </h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 sm:p-6 ${
        isLight ? "bg-white/30 shadow-lg" : "bg-neutral-900/30 shadow-lg shadow-blue-500/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Handshake className={`w-6 h-6 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
        <h2 className={`text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
          Partnerships
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : isLight
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : isLight
                    ? "bg-gray-200 text-gray-600"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className={`text-center py-10 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/30"}`}>
              <UserPlus className={`w-10 h-10 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-gray-600"}`} />
              <p className={`text-sm font-medium ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                No partner applications yet
              </p>
              <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                When service partners apply, they will appear here
              </p>
            </div>
          ) : (
            applications.map((app) => {
              const isExpanded = expandedApp === app._id;
              const profile = app.servicePartnerProfile;

              return (
                <div
                  key={app._id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isLight
                      ? "bg-white border-gray-200 hover:shadow-md"
                      : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                  }`}
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer"
                    onClick={() => setExpandedApp(isExpanded ? null : app._id)}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${
                        isLight ? "bg-blue-50" : "bg-blue-900/30"
                      }`}
                    >
                      {app.image ? (
                        <img src={app.image} alt={app.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className={`text-base font-semibold ${isLight ? "text-blue-400" : "text-blue-300"}`}>
                          {app.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-semibold text-sm ${isLight ? "text-gray-900" : "text-white"}`}>
                          {app.name || "Unnamed"}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {formatPartnerType(profile.type)}
                        </span>
                      </div>
                      <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                        {profile.companyName} &middot; Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreatePartnership(app._id);
                        }}
                        disabled={actionLoading === app._id}
                        className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          actionLoading === app._id ? "opacity-50 cursor-not-allowed" : ""
                        } bg-green-600 hover:bg-green-700 text-white`}
                      >
                        {actionLoading === app._id ? "..." : "Partner Up"}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                      ) : (
                        <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className={`px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t ${isLight ? "border-gray-100" : "border-gray-700"}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <Mail className={`w-4 h-4 flex-shrink-0 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                          <a href={`mailto:${app.email}`} className="text-sm text-blue-600 hover:underline truncate">
                            {app.email}
                          </a>
                        </div>
                        {(profile.phone || app.phone) && (
                          <div className="flex items-center gap-2">
                            <Phone className={`w-4 h-4 flex-shrink-0 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                            <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                              {profile.phone || app.phone}
                            </span>
                          </div>
                        )}
                        {profile.website && (
                          <div className="flex items-center gap-2">
                            <Globe className={`w-4 h-4 flex-shrink-0 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                            <a
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate"
                            >
                              {profile.website}
                            </a>
                          </div>
                        )}
                        {profile.licenseNumber && (
                          <div className="flex items-center gap-2">
                            <Shield className={`w-4 h-4 flex-shrink-0 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                            <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                              License: {profile.licenseNumber}
                              {profile.licenseState && ` (${profile.licenseState})`}
                            </span>
                          </div>
                        )}
                        {profile.nmlsId && (
                          <div className="flex items-center gap-2">
                            <Building2 className={`w-4 h-4 flex-shrink-0 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                            <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                              NMLS: {profile.nmlsId}
                            </span>
                          </div>
                        )}
                      </div>

                      {profile.bio && (
                        <p className={`text-sm mt-3 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                          {profile.bio}
                        </p>
                      )}

                      {profile.serviceAreas && profile.serviceAreas.length > 0 && (
                        <div className="mt-3">
                          <p className={`text-xs font-medium mb-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            Service Areas
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {profile.serviceAreas.map((area, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-xs ${
                                  isLight ? "bg-gray-100 text-gray-600" : "bg-gray-700 text-gray-300"
                                }`}
                              >
                                {area.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profile.certifications && profile.certifications.length > 0 && (
                        <div className="mt-3">
                          <p className={`text-xs font-medium mb-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            Certifications
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {profile.certifications.map((cert, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-xs ${
                                  isLight ? "bg-green-50 text-green-700" : "bg-green-900/20 text-green-300"
                                }`}
                              >
                                {cert.name}
                                {cert.year && ` (${cert.year})`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === "pending" && (
        <div className="space-y-3">
          {pendingPartnerships.length === 0 ? (
            <div className={`text-center py-10 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/30"}`}>
              <Clock className={`w-10 h-10 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-gray-600"}`} />
              <p className={`text-sm font-medium ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                No pending partnership requests
              </p>
            </div>
          ) : (
            pendingPartnerships.map((p) => (
              <PartnershipCard
                key={p._id}
                partnership={p}
                viewAs="agent"
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))
          )}
        </div>
      )}

      {/* Active Tab */}
      {activeTab === "active" && (
        <div className="space-y-3">
          {activePartnerships.length === 0 ? (
            <div className={`text-center py-10 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/30"}`}>
              <CheckCircle2 className={`w-10 h-10 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-gray-600"}`} />
              <p className={`text-sm font-medium ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                No active partnerships yet
              </p>
            </div>
          ) : (
            activePartnerships.map((p) => (
              <PartnershipCard key={p._id} partnership={p} viewAs="agent" />
            ))
          )}
        </div>
      )}

      {/* All Tab */}
      {activeTab === "all" && (
        <div className="space-y-3">
          {partnerships.length === 0 ? (
            <div className={`text-center py-10 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/30"}`}>
              <Handshake className={`w-10 h-10 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-gray-600"}`} />
              <p className={`text-sm font-medium ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                No partnerships yet
              </p>
            </div>
          ) : (
            partnerships.map((p) => (
              <PartnershipCard
                key={p._id}
                partnership={p}
                viewAs="agent"
                onAccept={p.status === "pending" ? handleAccept : undefined}
                onReject={p.status === "pending" ? handleReject : undefined}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
