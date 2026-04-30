"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Search,
  Trash2,
  ExternalLink,
  Coins,
  ShieldCheck,
  XCircle,
  ChevronDown,
  Send,
  Info,
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface DomainRecord {
  _id: string;
  domain: string;
  status: string;
  mappingType: string;
  targetPath: string;
  subdivisionName?: string;
  cityId?: string;
  subdivisionSlug?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface DomainCheckResult {
  domain: string;
  available: boolean;
  price: number | null;
  period: number | null;
}

interface CityOption {
  name: string;
  slug: string;
}

interface SubdivisionOption {
  name: string;
  slug: string;
}

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  pending_approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-800 border-amber-200", darkColor: "bg-amber-900/30 text-amber-400 border-amber-800/50" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-800 border-blue-200", darkColor: "bg-blue-900/30 text-blue-400 border-blue-800/50" },
  pending_dns: { label: "Pending DNS", color: "bg-amber-100 text-amber-800 border-amber-200", darkColor: "bg-amber-900/30 text-amber-400 border-amber-800/50" },
  pending_verification: { label: "Verifying", color: "bg-amber-100 text-amber-800 border-amber-200", darkColor: "bg-amber-900/30 text-amber-400 border-amber-800/50" },
  active: { label: "Active", color: "bg-green-100 text-green-800 border-green-200", darkColor: "bg-green-900/30 text-green-400 border-green-800/50" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", darkColor: "bg-red-900/30 text-red-400 border-red-800/50" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 border-red-200", darkColor: "bg-red-900/30 text-red-400 border-red-800/50" },
  suspended: { label: "Suspended", color: "bg-gray-100 text-gray-800 border-gray-200", darkColor: "bg-gray-800/50 text-gray-400 border-gray-700" },
};

export default function DomainSeoStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const tc = useThemeClasses();

  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;
  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;
  const cardClass = `rounded-xl border p-5 ${tc.cardBg} ${tc.cardBorder}`;
  const selectClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 appearance-none ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const ap = formData.agentProfile || {};
  const metaDescription = ap.metaDescription || "";
  const metaKeywords: string[] = ap.metaKeywords || [];

  // ── Section 1: My Domains ──
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  // ── Section 2: Search & Buy ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<DomainCheckResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState("");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // ── Section 3: Point a Domain ──
  const [pointDomain, setPointDomain] = useState("");
  const [pointTargetType, setPointTargetType] = useState<"agent_landing" | "community_page">("agent_landing");
  const [pointCitySlug, setPointCitySlug] = useState("");
  const [pointSubdivisionSlug, setPointSubdivisionSlug] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [subdivisions, setSubdivisions] = useState<SubdivisionOption[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [pointLoading, setPointLoading] = useState(false);
  const [pointError, setPointError] = useState("");
  const [pointSuccess, setPointSuccess] = useState("");

  // ── Section 4: SEO ──
  const [keywordsText, setKeywordsText] = useState<string>(metaKeywords.join(", "));

  // ── Data fetching ──

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/domains");
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      }
    } catch {
      // silent
    } finally {
      setDomainsLoading(false);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/points?limit=0");
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance ?? 0);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      const res = await fetch("/api/neighborhoods/reference");
      if (res.ok) {
        const data = await res.json();
        // Flatten regions → counties → cities into a single list
        const allCities: CityOption[] = [];
        for (const region of data.regions || []) {
          for (const county of region.counties || []) {
            for (const city of county.cities || []) {
              allCities.push({ name: city.name, slug: city.slug });
            }
          }
        }
        allCities.sort((a, b) => a.name.localeCompare(b.name));
        setCities(allCities);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchDomains();
    fetchCredits();
    fetchCities();
  }, [fetchDomains, fetchCredits, fetchCities]);

  // Fetch subdivisions when city changes
  useEffect(() => {
    if (!pointCitySlug || pointTargetType !== "community_page") {
      setSubdivisions([]);
      setPointSubdivisionSlug("");
      return;
    }
    let cancelled = false;
    const load = async () => {
      setSubsLoading(true);
      try {
        const res = await fetch(`/api/neighborhoods/reference?city=${pointCitySlug}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setSubdivisions(data.subdivisions || []);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setSubsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [pointCitySlug, pointTargetType]);

  // ── Handlers ──

  const handleRemoveDomain = async (id: string, domainName: string) => {
    if (!confirm(`Remove ${domainName}? This cannot be undone.`)) return;
    setRemoveLoading(id);
    try {
      const res = await fetch(`/api/agent/domains/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDomains((prev) => prev.filter((d) => d._id !== id));
      }
    } catch {
      // silent
    } finally {
      setRemoveLoading(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearchLoading(true);
    setSearchResult(null);
    setPurchaseResult("");
    try {
      const res = await fetch("/api/domains/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: searchQuery.toLowerCase().trim() }),
      });
      if (res.ok) {
        setSearchResult(await res.json());
      } else {
        const data = await res.json();
        setPurchaseResult(data.error || "Search failed");
      }
    } catch {
      setPurchaseResult("Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!searchResult?.available || !searchResult.price) return;
    const priceInCredits = Math.ceil(searchResult.price / 0.125);
    if (creditBalance !== null && creditBalance < priceInCredits) {
      setPurchaseResult("Insufficient credits. Buy more from your subscription page.");
      return;
    }
    setPurchaseLoading(true);
    setPurchaseResult("");
    try {
      const spendRes = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: priceInCredits,
          channel: "direct_mail",
          description: `Domain purchase: ${searchResult.domain}`,
        }),
      });
      if (!spendRes.ok) {
        setPurchaseResult((await spendRes.json()).error || "Failed to deduct credits");
        return;
      }
      const purchaseRes = await fetch("/api/domains/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: searchResult.domain }),
      });
      if (purchaseRes.ok) {
        setPurchaseResult(`${searchResult.domain} purchased! Now point it to your page below.`);
        // Pre-fill the "Point a Domain" section
        setPointDomain(searchResult.domain);
        setSearchResult(null);
        setSearchQuery("");
        await fetchCredits();
      } else {
        setPurchaseResult((await purchaseRes.json()).error || "Purchase failed");
      }
    } catch {
      setPurchaseResult("Purchase failed");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handlePointDomain = async () => {
    if (!pointDomain) return;
    setPointLoading(true);
    setPointError("");
    setPointSuccess("");

    // Validate community_page requires city
    if (pointTargetType === "community_page" && !pointCitySlug) {
      setPointError("Please select a city.");
      setPointLoading(false);
      return;
    }

    try {
      const body: Record<string, string> = {
        domain: pointDomain.toLowerCase().trim(),
        targetType: pointTargetType,
      };

      if (pointTargetType === "agent_landing") {
        body.targetPath = "/";
        // For agent_landing, we still need cityId & subdivisionSlug to satisfy the API
        // We send empty strings and the API will handle it
      } else {
        body.cityId = pointCitySlug;
        if (pointSubdivisionSlug) {
          body.subdivisionSlug = pointSubdivisionSlug;
        }
      }

      const res = await fetch("/api/agent/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setPointSuccess("Submitted! Admin will review shortly.");
        setPointDomain("");
        setPointTargetType("agent_landing");
        setPointCitySlug("");
        setPointSubdivisionSlug("");
        await fetchDomains();
      } else {
        const data = await res.json();
        setPointError(data.error || "Failed to submit domain");
      }
    } catch {
      setPointError("Failed to submit domain");
    } finally {
      setPointLoading(false);
    }
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsText(value);
    updateField(
      "agentProfile.metaKeywords",
      value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  };

  const handleSaveSeo = () => {
    onSave({
      agentProfile: {
        subdomain: ap.subdomain,
        metaTitle: ap.metaTitle,
        metaDescription: ap.metaDescription,
        metaKeywords: ap.metaKeywords || [],
      },
    });
  };

  // Helper: get display name for a domain's target
  const getTargetLabel = (d: DomainRecord) => {
    if (d.mappingType === "agent_landing") return "My Homepage";
    if (d.subdivisionName) return `Community: ${d.subdivisionName}`;
    if (d.cityId) return `City: ${d.cityId}`;
    return d.targetPath || "Unknown";
  };

  // Helper: status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.suspended;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
          isLight ? cfg.color : cfg.darkColor
        }`}
      >
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ═══ Section 1: My Domains ═══ */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
          <h3 className={`text-lg font-semibold ${tc.textPrimary}`}>My Domains</h3>
        </div>

        {domainsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : domains.length === 0 ? (
          <p className={`text-sm py-4 ${tc.textMuted}`}>
            No domains yet. Search for one below or point an existing domain.
          </p>
        ) : (
          <div className="space-y-3">
            {domains.map((d) => (
              <div
                key={d._id}
                className={`p-4 rounded-lg border ${
                  isLight
                    ? "border-gray-100 bg-gray-50"
                    : "border-gray-700 bg-gray-800/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {d.status === "active" ? (
                      <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    ) : d.status === "rejected" || d.status === "failed" ? (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${tc.textPrimary} truncate`}>
                        {d.domain}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <StatusBadge status={d.status} />
                        <span className={`text-xs ${tc.textMuted}`}>
                          {getTargetLabel(d)}
                        </span>
                      </div>

                      {/* Rejection reason */}
                      {d.status === "rejected" && d.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1.5">
                          Reason: {d.rejectionReason}
                        </p>
                      )}

                      {/* DNS instructions for approved / pending_dns */}
                      {(d.status === "approved" || d.status === "pending_dns" || d.status === "pending_verification") && (
                        <div
                          className={`mt-2 p-2.5 rounded-md text-xs ${
                            isLight
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-blue-900/20 text-blue-300 border border-blue-800/40"
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium mb-0.5">DNS Setup Required</p>
                              <p>
                                Add a <code className="font-mono font-semibold">CNAME</code> record
                                pointing to{" "}
                                <code className="font-mono font-semibold">
                                  cname.vercel-dns.com
                                </code>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {d.status === "active" && (
                      <a
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-1.5 rounded transition-colors ${
                          isLight
                            ? "hover:bg-gray-200 text-gray-500"
                            : "hover:bg-gray-700 text-gray-400"
                        }`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleRemoveDomain(d._id, d.domain)}
                      disabled={removeLoading === d._id}
                      className={`p-1.5 rounded transition-colors ${
                        isLight
                          ? "hover:bg-red-50 text-red-500"
                          : "hover:bg-red-900/20 text-red-400"
                      }`}
                    >
                      {removeLoading === d._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Section 2: Search & Buy a Domain ═══ */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Search className={`w-5 h-5 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
          <h3 className={`text-lg font-semibold ${tc.textPrimary}`}>
            Search &amp; Buy a Domain
          </h3>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchResult(null);
              setPurchaseResult("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for a domain name..."
            className={`${inputClass} flex-1`}
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading || !searchQuery}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap ${
              searchLoading || !searchQuery ? "opacity-50" : ""
            } bg-purple-600 hover:bg-purple-700`}
          >
            {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
          </button>
        </div>

        {searchResult && (
          <div
            className={`p-4 rounded-lg border ${
              searchResult.available
                ? isLight
                  ? "bg-green-50 border-green-200"
                  : "bg-green-900/10 border-green-800/30"
                : isLight
                ? "bg-red-50 border-red-200"
                : "bg-red-900/10 border-red-800/30"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {searchResult.available ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className={`font-semibold ${tc.textPrimary}`}>
                    {searchResult.domain}
                  </p>
                  <p
                    className={`text-sm ${
                      searchResult.available ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {searchResult.available
                      ? `Available — $${searchResult.price}/yr`
                      : "Not available"}
                  </p>
                </div>
              </div>
              {searchResult.available && searchResult.price && (
                <button
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    purchaseLoading ? "opacity-50" : ""
                  } bg-green-600 hover:bg-green-700`}
                >
                  {purchaseLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      Buy with Credits (
                      {Math.ceil(searchResult.price / 0.125).toLocaleString()} credits)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {purchaseResult && (
          <p
            className={`text-sm mt-2 ${
              purchaseResult.includes("purchased") ? "text-green-600" : "text-red-500"
            }`}
          >
            {purchaseResult}
          </p>
        )}
        {creditBalance !== null && (
          <p className={`text-xs mt-2 ${tc.textMuted}`}>
            Your balance: {creditBalance.toLocaleString()} credits
          </p>
        )}
      </div>

      {/* ═══ Section 3: Point a Domain ═══ */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Send className={`w-5 h-5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
          <h3 className={`text-lg font-semibold ${tc.textPrimary}`}>Point a Domain</h3>
        </div>
        <p className={`text-sm mb-4 ${tc.textMuted}`}>
          Submit a domain you own (or just purchased) to be pointed to your agent page or a
          community page. An admin will review your request.
        </p>

        <div className="space-y-4">
          {/* Domain input */}
          <div>
            <label className={labelClass}>Domain Name</label>
            <input
              type="text"
              value={pointDomain}
              onChange={(e) => {
                setPointDomain(e.target.value);
                setPointError("");
                setPointSuccess("");
              }}
              placeholder="yourdomain.com"
              className={inputClass}
            />
          </div>

          {/* Target type */}
          <div>
            <label className={labelClass}>Target</label>
            <div className="relative">
              <select
                value={pointTargetType}
                onChange={(e) => {
                  setPointTargetType(e.target.value as "agent_landing" | "community_page");
                  setPointCitySlug("");
                  setPointSubdivisionSlug("");
                }}
                className={selectClass}
              >
                <option value="agent_landing">My Agent Homepage</option>
                <option value="community_page">City / Subdivision Page</option>
              </select>
              <ChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${tc.textMuted}`}
              />
            </div>
          </div>

          {/* City selector (for community_page) */}
          {pointTargetType === "community_page" && (
            <>
              <div>
                <label className={labelClass}>City</label>
                <div className="relative">
                  <select
                    value={pointCitySlug}
                    onChange={(e) => {
                      setPointCitySlug(e.target.value);
                      setPointSubdivisionSlug("");
                    }}
                    className={selectClass}
                  >
                    <option value="">Select a city...</option>
                    {cities.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${tc.textMuted}`}
                  />
                </div>
              </div>

              {/* Subdivision selector */}
              {pointCitySlug && (
                <div>
                  <label className={labelClass}>
                    Subdivision{" "}
                    <span className={`font-normal ${tc.textMuted}`}>(optional)</span>
                  </label>
                  <div className="relative">
                    {subsLoading ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className={`text-sm ${tc.textMuted}`}>Loading...</span>
                      </div>
                    ) : (
                      <>
                        <select
                          value={pointSubdivisionSlug}
                          onChange={(e) => setPointSubdivisionSlug(e.target.value)}
                          className={selectClass}
                        >
                          <option value="">City page (no subdivision)</option>
                          {subdivisions.map((s) => (
                            <option key={s.slug} value={s.slug}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${tc.textMuted}`}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit button */}
          <button
            onClick={handlePointDomain}
            disabled={pointLoading || !pointDomain}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isLight ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {pointLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit for Approval
          </button>

          {pointError && <p className="text-sm text-red-500">{pointError}</p>}
          {pointSuccess && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                isLight
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-green-900/20 text-green-400 border border-green-800/40"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {pointSuccess}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Section 4: Subdomain & SEO ═══ */}
      <div className={cardClass}>
        <h3 className={`text-lg font-semibold mb-4 ${tc.textPrimary}`}>Subdomain &amp; SEO</h3>
        <div className="space-y-5">
          {/* Subdomain — auto-generated from name, editable by agent */}
          <div>
            <label className={labelClass}>Your Subdomain</label>
            {ap.subdomain ? (
              <>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={ap.subdomain}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
                      updateField("agentProfile.subdomain", val);
                    }}
                    maxLength={30}
                    className={`flex-1 px-4 py-3 rounded-l-lg border-y border-l text-sm font-medium ${
                      isLight
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-gray-800/50 border-gray-700 text-white"
                    }`}
                  />
                  <span className={`px-4 py-3 rounded-r-lg border text-sm font-medium ${
                    isLight ? "bg-gray-100 border-gray-300 text-gray-500" : "bg-gray-700 border-gray-700 text-gray-400"
                  }`}>
                    .chatrealty.io
                  </span>
                </div>
                <p className={`text-xs mt-1 ${tc.textMuted}`}>
                  Lowercase letters and numbers only. Active once you subscribe to a plan.
                </p>
              </>
            ) : (
              <div className={`px-4 py-3 rounded-lg border text-sm ${
                isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-900/10 border-amber-800/30 text-amber-400"
              }`}>
                Your subdomain will be assigned when your agent account is approved.
              </div>
            )}
          </div>

          {/* Meta Title */}
          <div>
            <label className={labelClass}>
              Meta Title{" "}
              <span className={`font-normal ${tc.textMuted}`}>(max 60 characters)</span>
            </label>
            <input
              type="text"
              maxLength={60}
              value={ap.metaTitle || ""}
              onChange={(e) => updateField("agentProfile.metaTitle", e.target.value)}
              placeholder="Your Name | Real Estate Agent in City, State"
              className={inputClass}
            />
            <p className={`text-xs mt-1 text-right ${tc.textMuted}`}>
              {(ap.metaTitle || "").length}/60
            </p>
          </div>

          {/* Meta Description */}
          <div>
            <label className={labelClass}>
              Meta Description{" "}
              <span className={`font-normal ${tc.textMuted}`}>(max 160 characters)</span>
            </label>
            <textarea
              rows={3}
              maxLength={160}
              value={metaDescription}
              onChange={(e) => updateField("agentProfile.metaDescription", e.target.value)}
              placeholder="A concise summary of your real estate services..."
              className={inputClass}
            />
            <p
              className={`text-xs mt-1 text-right ${
                metaDescription.length > 150 ? "text-amber-500" : tc.textMuted
              }`}
            >
              {metaDescription.length}/160
            </p>
          </div>

          {/* Meta Keywords */}
          <div>
            <label className={labelClass}>
              Meta Keywords{" "}
              <span className={`font-normal ${tc.textMuted}`}>(comma-separated)</span>
            </label>
            <input
              type="text"
              value={keywordsText}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              placeholder="real estate, homes for sale, luxury properties, city name"
              className={inputClass}
            />
          </div>
        </div>

        {/* Save SEO */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveSeo}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
              isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
