"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Search, Check, X, Loader2, ShoppingCart, AlertCircle } from "lucide-react";

interface DomainCheckResult {
  domain: string;
  available: boolean;
  price: number | null;
  period: number | null;
}

interface DomainSearchCardProps {
  isLight: boolean;
  onPurchaseComplete: (domain: string) => void;
}

const TLD_SUGGESTIONS = [".com", ".io", ".realtor", ".homes", ".realty"];

export default function DomainSearchCard({
  isLight,
  onPurchaseComplete,
}: DomainSearchCardProps) {
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DomainCheckResult | null>(null);
  const [error, setError] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const checkDomain = useCallback(
    async (domain: string) => {
      if (!domain || domain.length < 3) {
        setResult(null);
        return;
      }

      // Ensure it has a TLD
      const hasTld = /\.[a-z]{2,}$/.test(domain);
      if (!hasTld) return;

      setChecking(true);
      setError("");
      setResult(null);

      try {
        const res = await fetch("/api/domains/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: domain.toLowerCase().trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to check domain");
        }

        const data = await res.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Failed to check availability");
      } finally {
        setChecking(false);
      }
    },
    []
  );

  const handleInputChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9.-]/g, "");
    setQuery(sanitized);
    setResult(null);
    setError("");
    setPurchaseSuccess(null);
    setShowConfirm(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      checkDomain(sanitized);
    }, 300);
  };

  const handleTldClick = (tld: string) => {
    const base = query.replace(/\.[a-z]*$/, "");
    if (!base) return;
    const full = base + tld;
    setQuery(full);
    setResult(null);
    setError("");
    setPurchaseSuccess(null);
    setShowConfirm(false);
    checkDomain(full);
  };

  const handlePurchase = async () => {
    if (!result?.domain) return;

    setPurchasing(true);
    setError("");

    try {
      const res = await fetch("/api/domains/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: result.domain }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to purchase domain");
      }

      const data = await res.json();
      if (data.success) {
        setPurchaseSuccess(data.domain);
        setShowConfirm(false);
        onPurchaseComplete(data.domain);
      }
    } catch (err: any) {
      setError(err.message || "Purchase failed");
      setShowConfirm(false);
    } finally {
      setPurchasing(false);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isLight ? "text-gray-400" : "text-gray-500"
          }`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search for a domain name..."
          className={`${inputClass} pl-10`}
        />
        {checking && (
          <Loader2
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${
              isLight ? "text-blue-500" : "text-emerald-400"
            }`}
          />
        )}
      </div>

      {/* TLD suggestions */}
      <div className="flex flex-wrap gap-2">
        {TLD_SUGGESTIONS.map((tld) => (
          <button
            key={tld}
            onClick={() => handleTldClick(tld)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              query.endsWith(tld)
                ? isLight
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-emerald-900/30 text-emerald-400 border border-emerald-700/50"
                : isLight
                ? "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
            }`}
          >
            {tld}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            isLight
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-red-900/20 text-red-400 border border-red-700/50"
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Purchase success */}
      {purchaseSuccess && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg text-sm ${
            isLight
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-green-900/20 text-green-400 border border-green-700/50"
          }`}
        >
          <Check className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {purchaseSuccess} has been purchased and connected!
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              Your domain is now linked to your site. DNS propagation may take a few minutes.
            </p>
          </div>
        </div>
      )}

      {/* Availability result */}
      {result && !purchaseSuccess && (
        <div
          className={`p-4 rounded-lg border ${
            result.available
              ? isLight
                ? "bg-green-50 border-green-200"
                : "bg-green-900/10 border-green-700/50"
              : isLight
              ? "bg-gray-50 border-gray-200"
              : "bg-gray-800/50 border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.available ? (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isLight ? "bg-green-100" : "bg-green-900/30"
                  }`}
                >
                  <Check
                    className={`w-4 h-4 ${
                      isLight ? "text-green-600" : "text-green-400"
                    }`}
                  />
                </div>
              ) : (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isLight ? "bg-red-100" : "bg-red-900/30"
                  }`}
                >
                  <X
                    className={`w-4 h-4 ${
                      isLight ? "text-red-600" : "text-red-400"
                    }`}
                  />
                </div>
              )}
              <div>
                <p
                  className={`text-sm font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {result.domain}
                </p>
                <p
                  className={`text-xs ${
                    result.available
                      ? isLight
                        ? "text-green-600"
                        : "text-green-400"
                      : isLight
                      ? "text-red-600"
                      : "text-red-400"
                  }`}
                >
                  {result.available ? "Available" : "Taken"}
                </p>
              </div>
            </div>

            {result.available && (
              <div className="flex items-center gap-3">
                {result.price !== null && (
                  <span
                    className={`text-sm font-semibold ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    ${result.price}
                    {result.period ? `/${result.period === 1 ? "yr" : `${result.period}yr`}` : "/yr"}
                  </span>
                )}
                <button
                  onClick={() => setShowConfirm(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Purchase
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation modal (inline) */}
      {showConfirm && result?.available && (
        <div
          className={`p-4 rounded-lg border ${
            isLight
              ? "bg-amber-50 border-amber-200"
              : "bg-amber-900/10 border-amber-700/50"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              isLight ? "text-amber-800" : "text-amber-300"
            }`}
          >
            Confirm purchase of{" "}
            <span className="font-bold">{result.domain}</span>
            {result.price !== null && (
              <span>
                {" "}
                for ${result.price}
                {result.period ? `/${result.period === 1 ? "yr" : `${result.period}yr`}` : "/yr"}
              </span>
            )}
            ?
          </p>
          <p
            className={`text-xs mt-1 ${
              isLight ? "text-amber-600" : "text-amber-400/70"
            }`}
          >
            This will purchase the domain through Vercel and connect it to your
            site automatically.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                isLight
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Purchasing...
                </>
              ) : (
                "Confirm Purchase"
              )}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={purchasing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLight
                  ? "text-gray-600 hover:bg-gray-100"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
