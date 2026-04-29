"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Coins,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface ConnectedDomain {
  name: string;
  apexName: string;
  verified: boolean;
  verification: Array<{ type: string; domain: string; value: string; reason: string }>;
  createdAt: number;
}

interface DomainCheckResult {
  domain: string;
  available: boolean;
  price: number | null;
  period: number | null;
}

export default function DomainSeoStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;
  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;
  const cardClass = `rounded-xl border p-5 ${
    isLight ? "bg-white border-gray-200" : "bg-gray-800/50 border-gray-700"
  }`;

  const ap = formData.agentProfile || {};
  const metaDescription = ap.metaDescription || "";
  const metaKeywords: string[] = ap.metaKeywords || [];

  // Domain state — derived from user model, not Vercel global list
  const [domains, setDomains] = useState<ConnectedDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [connectDomain, setConnectDomain] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<DomainCheckResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState("");

  // Credits
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // Keywords
  const [keywordsText, setKeywordsText] = useState<string>(metaKeywords.join(", "));

  // Build user's domain list from their profile + verify status from Vercel
  const fetchDomains = useCallback(async () => {
    try {
      // Get the user's domains from their profile
      const userDomains: string[] = [];
      if (ap.customDomain) userDomains.push(ap.customDomain);
      if (ap.subdomain) userDomains.push(`${ap.subdomain}.jpsrealtor.com`);

      if (userDomains.length === 0) {
        setDomains([]);
        setDomainsLoading(false);
        return;
      }

      // Fetch Vercel project domains to get verification status
      const res = await fetch("/api/domains/list");
      if (res.ok) {
        const data = await res.json();
        const allVercelDomains: ConnectedDomain[] = data.domains || [];

        // Only show domains that belong to this user
        const userConnected = userDomains.map((name) => {
          const vercelMatch = allVercelDomains.find(
            (d) => d.name === name || d.apexName === name
          );
          return {
            name,
            apexName: vercelMatch?.apexName || name,
            verified: vercelMatch?.verified ?? false,
            verification: vercelMatch?.verification || [],
            createdAt: vercelMatch?.createdAt || Date.now(),
          };
        });
        setDomains(userConnected);
      } else {
        // If Vercel API fails, still show user domains without status
        setDomains(userDomains.map((name) => ({
          name, apexName: name, verified: false, verification: [], createdAt: Date.now(),
        })));
      }
    } catch {}
    finally { setDomainsLoading(false); }
  }, [ap.customDomain, ap.subdomain]);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/points?limit=0");
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchDomains();
    fetchCredits();
  }, [fetchDomains, fetchCredits]);

  const handleConnect = async () => {
    if (!connectDomain) return;
    const normalized = connectDomain.toLowerCase().trim();
    setConnectLoading(true);
    setConnectError("");
    setConnectSuccess("");
    try {
      // Add to Vercel project
      const res = await fetch("/api/agent/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: normalized }),
      });
      if (res.ok) {
        // Save to user's agentProfile.customDomain
        updateField("agentProfile.customDomain", normalized);
        await onSave({ agentProfile: { customDomain: normalized } });
        setConnectSuccess(`${normalized} connected! Configure DNS to complete setup.`);
        setConnectDomain("");
        await fetchDomains();
      } else {
        const data = await res.json();
        setConnectError(data.error || "Failed to connect domain");
      }
    } catch { setConnectError("Failed to connect domain"); }
    finally { setConnectLoading(false); }
  };

  const handleRemove = async (domainName: string) => {
    if (!confirm(`Remove ${domainName} from your project?`)) return;
    setRemoveLoading(domainName);
    try {
      await fetch(`/api/agent/domains/${encodeURIComponent(domainName)}`, { method: "DELETE" });
      // Clear from user profile if it matches customDomain
      if (domainName === ap.customDomain) {
        updateField("agentProfile.customDomain", "");
        await onSave({ agentProfile: { customDomain: "" } });
      }
      await fetchDomains();
    } catch {}
    finally { setRemoveLoading(null); }
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
    } catch { setPurchaseResult("Search failed"); }
    finally { setSearchLoading(false); }
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
        body: JSON.stringify({ points: priceInCredits, channel: "direct_mail", description: `Domain purchase: ${searchResult.domain}` }),
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
        // Save to user profile
        updateField("agentProfile.customDomain", searchResult.domain);
        await onSave({ agentProfile: { customDomain: searchResult.domain } });
        setPurchaseResult(`${searchResult.domain} purchased and connected!`);
        setSearchResult(null);
        setSearchQuery("");
        await fetchDomains();
        await fetchCredits();
      } else {
        setPurchaseResult((await purchaseRes.json()).error || "Purchase failed");
      }
    } catch { setPurchaseResult("Purchase failed"); }
    finally { setPurchaseLoading(false); }
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsText(value);
    updateField("agentProfile.metaKeywords", value.split(",").map((s) => s.trim()).filter(Boolean));
  };

  const handleSave = () => {
    onSave({
      agentProfile: {
        subdomain: ap.subdomain,
        customDomain: ap.customDomain,
        metaTitle: ap.metaTitle,
        metaDescription: ap.metaDescription,
        metaKeywords: ap.metaKeywords || [],
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Connected Domains */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
          <h3 className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Connected Domains</h3>
        </div>

        {domainsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : domains.length === 0 ? (
          <p className={`text-sm py-4 ${isLight ? "text-gray-500" : "text-gray-400"}`}>No domains connected yet.</p>
        ) : (
          <div className="space-y-2">
            {domains.map((d) => (
              <div key={d.name} className={`flex items-center justify-between p-3 rounded-lg border ${isLight ? "border-gray-100 bg-gray-50" : "border-gray-700 bg-gray-800/30"}`}>
                <div className="flex items-center gap-3">
                  {d.verified ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-amber-500" />}
                  <div>
                    <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{d.name}</p>
                    <p className={`text-xs ${d.verified ? "text-green-600" : "text-amber-500"}`}>
                      {d.verified ? "Verified & Active" : "Pending DNS verification"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a href={`https://${d.name}`} target="_blank" rel="noopener noreferrer"
                    className={`p-1.5 rounded transition-colors ${isLight ? "hover:bg-gray-200 text-gray-500" : "hover:bg-gray-700 text-gray-400"}`}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button onClick={() => handleRemove(d.name)} disabled={removeLoading === d.name}
                    className={`p-1.5 rounded transition-colors ${isLight ? "hover:bg-red-50 text-red-500" : "hover:bg-red-900/20 text-red-400"}`}>
                    {removeLoading === d.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connect existing domain */}
        <div className={`mt-4 pt-4 border-t ${isLight ? "border-gray-200" : "border-gray-700"}`}>
          <label className={labelClass}>Connect a Domain You Own</label>
          <div className="flex gap-2">
            <input type="text" value={connectDomain}
              onChange={(e) => { setConnectDomain(e.target.value); setConnectError(""); setConnectSuccess(""); }}
              placeholder="yourdomain.com" className={`${inputClass} flex-1`} />
            <button onClick={handleConnect} disabled={connectLoading || !connectDomain}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap transition-colors ${connectLoading || !connectDomain ? "opacity-50" : ""} ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              {connectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 inline mr-1" />Connect</>}
            </button>
          </div>
          {connectError && <p className="text-sm text-red-500 mt-1">{connectError}</p>}
          {connectSuccess && <p className="text-sm text-green-600 mt-1">{connectSuccess}</p>}
          <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Point your DNS CNAME to <code className="font-mono text-xs">cname.vercel-dns.com</code>
          </p>
        </div>
      </div>

      {/* Search & Buy */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Search className={`w-5 h-5 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
          <h3 className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Search & Buy a Domain</h3>
        </div>
        <div className="flex gap-2 mb-3">
          <input type="text" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchResult(null); setPurchaseResult(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for a domain name..." className={`${inputClass} flex-1`} />
          <button onClick={handleSearch} disabled={searchLoading || !searchQuery}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap ${searchLoading || !searchQuery ? "opacity-50" : ""} bg-purple-600 hover:bg-purple-700`}>
            {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
          </button>
        </div>
        {searchResult && (
          <div className={`p-4 rounded-lg border ${searchResult.available ? isLight ? "bg-green-50 border-green-200" : "bg-green-900/10 border-green-800/30" : isLight ? "bg-red-50 border-red-200" : "bg-red-900/10 border-red-800/30"}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {searchResult.available ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                <div>
                  <p className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{searchResult.domain}</p>
                  <p className={`text-sm ${searchResult.available ? "text-green-600" : "text-red-500"}`}>
                    {searchResult.available ? `Available — $${searchResult.price}/yr` : "Not available"}
                  </p>
                </div>
              </div>
              {searchResult.available && searchResult.price && (
                <button onClick={handlePurchase} disabled={purchaseLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${purchaseLoading ? "opacity-50" : ""} bg-green-600 hover:bg-green-700`}>
                  {purchaseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Coins className="w-4 h-4" />Buy ({Math.ceil(searchResult.price / 0.125).toLocaleString()} credits)</>}
                </button>
              )}
            </div>
          </div>
        )}
        {purchaseResult && <p className={`text-sm mt-2 ${purchaseResult.includes("purchased") ? "text-green-600" : "text-red-500"}`}>{purchaseResult}</p>}
        {creditBalance !== null && <p className={`text-xs mt-2 ${isLight ? "text-gray-400" : "text-gray-500"}`}>Your balance: {creditBalance.toLocaleString()} credits</p>}
      </div>

      {/* Subdomain & SEO */}
      <div className={cardClass}>
        <h3 className={`text-lg font-semibold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>Subdomain & SEO</h3>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Subdomain</label>
            <div className="flex items-center gap-0">
              <input type="text" value={ap.subdomain || ""}
                onChange={(e) => updateField("agentProfile.subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="yourname"
                className={`flex-1 px-4 py-3 rounded-l-lg border-y border-l text-sm focus:outline-none focus:ring-2 ${isLight ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500" : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"}`} />
              <span className={`px-4 py-3 rounded-r-lg border text-sm font-medium ${isLight ? "bg-gray-100 border-gray-300 text-gray-500" : "bg-gray-700 border-gray-700 text-gray-400"}`}>.jpsrealtor.com</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Meta Title <span className={`font-normal ${isLight ? "text-gray-400" : "text-gray-500"}`}>(max 60 characters)</span></label>
            <input type="text" maxLength={60} value={ap.metaTitle || ""}
              onChange={(e) => updateField("agentProfile.metaTitle", e.target.value)}
              placeholder="Your Name | Real Estate Agent in City, State" className={inputClass} />
            <p className={`text-xs mt-1 text-right ${isLight ? "text-gray-400" : "text-gray-500"}`}>{(ap.metaTitle || "").length}/60</p>
          </div>
          <div>
            <label className={labelClass}>Meta Description <span className={`font-normal ${isLight ? "text-gray-400" : "text-gray-500"}`}>(max 160 characters)</span></label>
            <textarea rows={3} maxLength={160} value={metaDescription}
              onChange={(e) => updateField("agentProfile.metaDescription", e.target.value)}
              placeholder="A concise summary of your real estate services..." className={inputClass} />
            <p className={`text-xs mt-1 text-right ${metaDescription.length > 150 ? "text-amber-500" : isLight ? "text-gray-400" : "text-gray-500"}`}>{metaDescription.length}/160</p>
          </div>
          <div>
            <label className={labelClass}>Meta Keywords <span className={`font-normal ${isLight ? "text-gray-400" : "text-gray-500"}`}>(comma-separated)</span></label>
            <input type="text" value={keywordsText}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              placeholder="real estate, homes for sale, luxury properties, city name" className={inputClass} />
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
