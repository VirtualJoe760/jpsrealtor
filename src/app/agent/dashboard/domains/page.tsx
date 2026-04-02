// src/app/agent/dashboard/domains/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import AgentNav from "@/app/components/AgentNav";
import {
  Globe, Plus, Trash2, RefreshCw, ExternalLink, CheckCircle,
  Clock, AlertTriangle, ShoppingCart, X, Search, ChevronLeft,
} from "lucide-react";
import { toast } from "react-toastify";
import Link from "next/link";

interface DomainMapping {
  _id: string;
  domain: string;
  subdivisionName: string;
  targetPath: string;
  status: string;
  sslStatus: string;
  dnsConfigured: boolean;
  dnsVerifiedAt?: string;
  purchasedViaVercel: boolean;
  createdAt: string;
}

interface Subdivision {
  _id: string;
  name: string;
  slug: string;
  city: string;
}

export default function DomainsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  // Add form state
  const [newDomain, setNewDomain] = useState("");
  const [selectedSubdivision, setSelectedSubdivision] = useState<Subdivision | null>(null);
  const [subdivisionSearch, setSubdivisionSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Subdivision[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // DNS instructions (shown after adding a domain)
  const [dnsInstructions, setDnsInstructions] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchDomains();
  }, [session]);

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/agent/domains");
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchSubdivisions = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/subdivisions?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.subdivisions || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => searchSubdivisions(subdivisionSearch), 300);
    return () => clearTimeout(timeout);
  }, [subdivisionSearch]);

  const handleAddDomain = async () => {
    if (!newDomain || !selectedSubdivision) {
      toast.error("Please enter a domain and select a community");
      return;
    }

    setAdding(true);
    try {
      // Build cityId from subdivision city
      const cityId = selectedSubdivision.city
        .toLowerCase()
        .replace(/\s+/g, "-");

      const res = await fetch("/api/agent/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: newDomain,
          subdivisionSlug: selectedSubdivision.slug,
          cityId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add domain");
        return;
      }

      toast.success(`Domain ${newDomain} registered!`);
      setDnsInstructions(data.dnsInstructions);
      setNewDomain("");
      setSelectedSubdivision(null);
      setSubdivisionSearch("");
      fetchDomains();
    } catch (error) {
      toast.error("Failed to add domain");
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    setVerifying(domainId);
    try {
      const res = await fetch("/api/agent/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });

      const data = await res.json();

      if (data.mapping?.status === "active") {
        toast.success("Domain is active and verified!");
      } else {
        toast.info(data.message || "DNS not yet configured");
        if (data.dnsInstructions) setDnsInstructions(data.dnsInstructions);
      }

      fetchDomains();
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (domainId: string, domainName: string) => {
    if (!confirm(`Remove ${domainName}? This will unlink the custom domain.`)) return;

    try {
      const res = await fetch(`/api/agent/domains/${domainId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`Domain ${domainName} removed`);
        fetchDomains();
      } else {
        toast.error("Failed to remove domain");
      }
    } catch (error) {
      toast.error("Failed to remove domain");
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        );
      case "pending_approval":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" /> Pending Approval
          </span>
        );
      case "pending_dns":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" /> Configure DNS
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" /> Rejected
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight ? "bg-gray-50" : "bg-gray-950"}`}>
      <AgentNav />
      <div className="max-w-5xl mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/agent/dashboard"
              className={`p-2 rounded-lg transition-colors ${
                isLight ? "hover:bg-gray-200" : "hover:bg-gray-800"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                Custom Domains
              </h1>
              <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                Point custom domains to your community pages for better SEO and branding
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "Cancel" : "Add Domain"}
          </button>
        </div>

        {/* SEO Tip */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isLight ? "bg-blue-50 border-blue-200" : "bg-blue-950/30 border-blue-800"
        }`}>
          <p className={`text-sm ${isLight ? "text-blue-800" : "text-blue-300"}`}>
            <strong>SEO Tip:</strong> Custom domains like <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">indianwellsccrealestate.com</code> help
            you rank for community-specific searches. Each domain gets its own SEO authority, making it easier to capture
            buyers searching for homes in that specific neighborhood.
          </p>
        </div>

        {/* Add Domain Form */}
        {showAddForm && (
          <div className={`mb-8 p-6 rounded-xl border ${
            isLight ? "bg-white border-gray-200 shadow-sm" : "bg-gray-900 border-gray-800"
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
              Add a Custom Domain
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Domain input */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  Domain Name
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="indianwellsccrealestate.com"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isLight
                      ? "bg-white border-gray-300 text-gray-900"
                      : "bg-gray-800 border-gray-700 text-white"
                  }`}
                />
                <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                  Enter without http:// or www
                </p>
              </div>

              {/* Subdivision search */}
              <div className="relative">
                <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  Target Community
                </label>
                {selectedSubdivision ? (
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    isLight ? "bg-green-50 border-green-300" : "bg-green-900/20 border-green-700"
                  }`}>
                    <span className={`text-sm font-medium ${isLight ? "text-green-800" : "text-green-300"}`}>
                      {selectedSubdivision.name}
                    </span>
                    <button onClick={() => { setSelectedSubdivision(null); setSubdivisionSearch(""); }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                      <input
                        type="text"
                        value={subdivisionSearch}
                        onChange={(e) => setSubdivisionSearch(e.target.value)}
                        placeholder="Search communities..."
                        className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                          isLight
                            ? "bg-white border-gray-300 text-gray-900"
                            : "bg-gray-800 border-gray-700 text-white"
                        }`}
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className={`absolute z-20 w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${
                        isLight ? "bg-white border-gray-200" : "bg-gray-800 border-gray-700"
                      }`}>
                        {searchResults.map((sub) => (
                          <button
                            key={sub._id}
                            onClick={() => {
                              setSelectedSubdivision(sub);
                              setSubdivisionSearch("");
                              setSearchResults([]);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              isLight ? "hover:bg-gray-100" : "hover:bg-gray-700"
                            }`}
                          >
                            <span className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{sub.name}</span>
                            <span className={`ml-2 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>{sub.city}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Buy domain option */}
            <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${
              isLight ? "bg-gray-50" : "bg-gray-800/50"
            }`}>
              <ShoppingCart className={`w-5 h-5 ${isLight ? "text-gray-500" : "text-gray-400"}`} />
              <div className="flex-1">
                <p className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  Don't have a domain yet?
                </p>
                <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                  Purchase one directly through Vercel's domain registrar
                </p>
              </div>
              <a
                href={newDomain ? `https://vercel.com/domains/${newDomain}` : "https://vercel.com/domains"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                Buy Domain <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={handleAddDomain}
              disabled={adding || !newDomain || !selectedSubdivision}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {adding ? "Adding..." : "Register Domain"}
            </button>
          </div>
        )}

        {/* DNS Instructions Panel */}
        {dnsInstructions && (
          <div className={`mb-8 p-6 rounded-xl border ${
            isLight ? "bg-amber-50 border-amber-200" : "bg-amber-950/20 border-amber-800"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isLight ? "text-amber-900" : "text-amber-300"}`}>
                DNS Configuration Required
              </h3>
              <button onClick={() => setDnsInstructions(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`text-sm mb-4 ${isLight ? "text-amber-800" : "text-amber-400"}`}>
              Add the following DNS record{dnsInstructions.records?.length > 1 ? "s" : ""} at your domain registrar:
            </p>

            <div className="space-y-2 mb-4">
              {dnsInstructions.records?.map((record: any, i: number) => (
                <div
                  key={i}
                  className={`grid grid-cols-3 gap-3 p-3 rounded-lg font-mono text-sm ${
                    isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-gray-700"
                  }`}
                >
                  <div>
                    <span className={`text-xs font-sans ${isLight ? "text-gray-500" : "text-gray-500"}`}>Type</span>
                    <p className={`font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{record.type}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-sans ${isLight ? "text-gray-500" : "text-gray-500"}`}>Name</span>
                    <p className={isLight ? "text-gray-900" : "text-white"}>{record.name}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-sans ${isLight ? "text-gray-500" : "text-gray-500"}`}>Value</span>
                    <p className={isLight ? "text-gray-900" : "text-white"}>{record.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`text-xs space-y-1 ${isLight ? "text-amber-700" : "text-amber-500"}`}>
              {dnsInstructions.notes?.map((note: string, i: number) => (
                <p key={i}>• {note}</p>
              ))}
            </div>
          </div>
        )}

        {/* Domain List */}
        {domains.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border ${
            isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"
          }`}>
            <Globe className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-gray-300" : "text-gray-600"}`} />
            <p className={`text-lg font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              No custom domains yet
            </p>
            <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-gray-500"}`}>
              Add a custom domain to boost your SEO for specific communities
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Add Your First Domain
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <div
                key={domain._id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  isLight
                    ? "bg-white border-gray-200 hover:border-gray-300"
                    : "bg-gray-900 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Globe className={`w-4 h-4 flex-shrink-0 ${
                      domain.status === "active" ? "text-green-500" : isLight ? "text-gray-400" : "text-gray-500"
                    }`} />
                    <span className={`font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                      {domain.domain}
                    </span>
                    {statusBadge(domain.status)}
                  </div>
                  <p className={`text-xs ml-7 ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                    → {domain.subdivisionName}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {domain.status === "active" && (
                    <a
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded-lg transition-colors ${
                        isLight ? "hover:bg-gray-100" : "hover:bg-gray-800"
                      }`}
                      title="Visit domain"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleVerify(domain._id)}
                    disabled={verifying === domain._id}
                    className={`p-2 rounded-lg transition-colors ${
                      isLight ? "hover:bg-gray-100" : "hover:bg-gray-800"
                    }`}
                    title="Verify DNS"
                  >
                    <RefreshCw className={`w-4 h-4 ${verifying === domain._id ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(domain._id, domain.domain)}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                    title="Remove domain"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
