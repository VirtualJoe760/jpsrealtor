// src/app/dashboard/settings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { User, Upload, Loader2, Target, Shield, Bell, Lock, Eye, EyeOff, X, Plus, Check, ChevronDown, CreditCard, Handshake } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";

// ── Sub-Components ─────────────────────────────────────────────────────────

function PillSelector({ options, value, onChange, isLight }: {
  options: string[]; value: string; onChange: (v: string) => void; isLight: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            value === opt
              ? isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
              : isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}>{opt}</button>
      ))}
    </div>
  );
}

function NumberPillSelector({ options, value, onChange, isLight }: {
  options: (number | string)[]; value: number | string; onChange: (v: number | string) => void; isLight: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-w-[44px] ${
            String(value) === String(opt)
              ? isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
              : isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}>{opt}</button>
      ))}
    </div>
  );
}

function CheckboxGroup({ options, selected, onChange, isLight }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; isLight: boolean;
}) {
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {options.map((opt) => (
        <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
          selected.includes(opt)
            ? isLight ? "bg-blue-50 border border-blue-300 text-blue-700" : "bg-emerald-900/30 border border-emerald-600 text-emerald-300"
            : isLight ? "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100" : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
        }`}>
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="sr-only" />
          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
            selected.includes(opt) ? (isLight ? "bg-blue-600" : "bg-emerald-600") : (isLight ? "border-2 border-gray-300" : "border-2 border-gray-600")
          }`}>{selected.includes(opt) && <Check className="w-3 h-3 text-white" />}</div>
          {opt}
        </label>
      ))}
    </div>
  );
}

function TagInput({ tags, onChange, presets, placeholder, isLight }: {
  tags: string[]; onChange: (v: string[]) => void; presets?: string[]; placeholder?: string; isLight: boolean;
}) {
  const [input, setInput] = useState("");
  const addTag = (tag: string) => { const t = tag.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(""); };
  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));
  const available = presets?.filter((p) => !tags.includes(p)) || [];
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/40 text-emerald-300"}`}>
            {tag}<button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(input); } }}
          placeholder={placeholder || "Type and press Enter"}
          className={`flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${isLight ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500" : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"}`} />
        {input && <button type="button" onClick={() => addTag(input)} className={`px-3 py-2 rounded-lg text-sm ${isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}`}><Plus className="w-4 h-4" /></button>}
      </div>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {available.map((p) => (
            <button key={p} type="button" onClick={() => addTag(p)} className={`px-2 py-1 rounded text-xs ${isLight ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>+ {p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ enabled, onChange, isLight }: { enabled: boolean; onChange: (v: boolean) => void; isLight: boolean }) {
  return (
    <button type="button" onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${enabled ? (isLight ? "bg-blue-600" : "bg-emerald-600") : (isLight ? "bg-gray-300" : "bg-gray-600")}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ── Accordion Section ──────────────────────────────────────────────────────

function Section({ id, title, icon: Icon, isOpen, onToggle, children, isLight, sectionRef }: {
  id: string; title: string; icon: typeof User; isOpen: boolean; onToggle: () => void;
  children: React.ReactNode; isLight: boolean; sectionRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={sectionRef} id={id} className={`rounded-xl border overflow-hidden transition-all ${isLight ? "bg-white/80 border-gray-200" : "bg-gray-800/60 border-gray-700"}`}>
      <button type="button" onClick={onToggle}
        className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${isLight ? "hover:bg-gray-50" : "hover:bg-gray-700/50"}`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-emerald-500"}`} />
          <span className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{title}</span>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isLight ? "text-gray-400" : "text-gray-500"}`} />
      </button>
      {isOpen && <div className="px-6 pb-6 pt-2">{children}</div>}
    </div>
  );
}

// ── Subscription Section ─────────────────────────────────────────────────

function SubscriptionSection({ isLight }: { isLight: boolean }) {
  const [tier, setTier] = useState("free");
  const [subStatus, setSubStatus] = useState("active");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetch("/api/user/subscription")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setTier(data.tier || "free");
          setSubStatus(data.status || "active");
          setExpiresAt(data.expiresAt || null);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/user/subscription", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setIsUpgrading(false);
    } catch { setIsUpgrading(false); }
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelFeedback, setCancelFeedback] = useState("");

  const CANCEL_REASONS = [
    "Too expensive",
    "Not using it enough",
    "Missing features I need",
    "Found a better alternative",
    "Just browsing, not actively searching",
    "Technical issues",
    "Other",
  ];

  const handleCancel = async () => {
    if (!cancelReason) return;
    setIsCancelling(true);
    try {
      const res = await fetch("/api/user/subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, feedback: cancelFeedback }),
      });
      if (res.ok) { setSubStatus("cancelled"); }
    } catch {}
    finally {
      setIsCancelling(false);
      setShowCancelModal(false);
      setCancelReason("");
      setCancelFeedback("");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  const isPro = tier === "pro" && (subStatus === "active" || subStatus === "cancelled");
  const isCancelled = subStatus === "cancelled";
  const accent = isLight ? "text-blue-600" : "text-emerald-400";

  const FREE_FEATURES = ["10 AI chat queries per day", "Save up to 50 favorites", "3 saved searches", "Basic property filters"];
  const PRO_FEATURES = ["100 AI chat queries per day", "Unlimited saved listings", "Unlimited saved searches", "Price drop & listing alerts", "Advanced search filters", "Priority support"];

  return (
    <div>
      {/* Current Plan Banner */}
      <div className={`rounded-xl border p-4 mb-6 flex items-center justify-between ${
        isPro
          ? isLight ? "border-blue-300 bg-blue-50/50" : "border-blue-700 bg-blue-900/10"
          : isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50"
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              {isPro ? "Pro" : "Free"} Plan
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isCancelled
                ? isLight ? "bg-amber-100 text-amber-700" : "bg-amber-900/30 text-amber-400"
                : isPro
                ? isLight ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400"
                : isLight ? "bg-gray-100 text-gray-600" : "bg-gray-700 text-gray-400"
            }`}>
              {isCancelled ? "Cancelling" : isPro ? "Active" : "Free"}
            </span>
          </div>
          {isPro && (
            <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              {isCancelled
                ? `Access until ${expiresAt ? new Date(expiresAt).toLocaleDateString() : "end of billing period"}`
                : expiresAt
                ? `Renews ${new Date(expiresAt).toLocaleDateString()}`
                : "$9.99/month"
              }
            </p>
          )}
        </div>
        {isPro && !isCancelled && (
          <button onClick={() => setShowCancelModal(true)} disabled={isCancelling}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLight ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" : "bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-800/50"
            }`}>
            {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cancel Subscription"}
          </button>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Tier */}
        <div className={`rounded-xl border p-5 ${
          !isPro
            ? isLight ? "border-blue-300 bg-blue-50/50" : "border-emerald-700 bg-emerald-900/10"
            : isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Free</h3>
            {!isPro && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/30 text-emerald-400"}`}>
                Current
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>$0<span className={`text-sm font-normal ${isLight ? "text-gray-500" : "text-gray-400"}`}>/month</span></p>
          <ul className={`space-y-2 ${isPro && !isCancelled ? "mb-4" : ""}`}>
            {FREE_FEATURES.map((f) => (
              <li key={f} className={`flex items-center gap-2 text-sm ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                <Check className={`w-4 h-4 flex-shrink-0 ${accent}`} />{f}
              </li>
            ))}
          </ul>
          {isPro && !isCancelled && (
            <button onClick={() => setShowCancelModal(true)} disabled={isCancelling}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                isLight ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}>
              {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Downgrade to Free"}
            </button>
          )}
        </div>

        {/* Pro Tier */}
        <div className={`rounded-xl border p-5 ${
          isPro
            ? isLight ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-400" : "border-emerald-700 bg-emerald-900/10 ring-1 ring-emerald-600"
            : isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Pro</h3>
            {isPro && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/30 text-emerald-400"}`}>
                Current
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>$9.99<span className={`text-sm font-normal ${isLight ? "text-gray-500" : "text-gray-400"}`}>/month</span></p>
          <ul className="space-y-2 mb-4">
            {PRO_FEATURES.map((f) => (
              <li key={f} className={`flex items-center gap-2 text-sm ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                <Check className={`w-4 h-4 flex-shrink-0 ${accent}`} />{f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <button onClick={handleUpgrade} disabled={isUpgrading}
              className={`w-full py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}>
              {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowCancelModal(false); setCancelReason(""); setCancelFeedback(""); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
              isLight ? "bg-white" : "bg-gray-800 border border-gray-700"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-5">
              <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
                isLight ? "bg-red-50" : "bg-red-900/20"
              }`}>
                <X className={`w-7 h-7 ${isLight ? "text-red-500" : "text-red-400"}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                We're sorry to see you go
              </h3>
              <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Help us improve by letting us know why you're cancelling.
              </p>
            </div>

            {/* Reason Selection */}
            <div className="mb-4">
              <p className={`text-sm font-medium mb-3 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                What's the main reason?
              </p>
              <div className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                      cancelReason === reason
                        ? isLight ? "bg-red-50 border border-red-300" : "bg-red-900/20 border border-red-700"
                        : isLight ? "bg-gray-50 border border-gray-200 hover:bg-gray-100" : "bg-gray-700/50 border border-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      cancelReason === reason
                        ? isLight ? "border-red-500" : "border-red-400"
                        : isLight ? "border-gray-300" : "border-gray-500"
                    }`}>
                      {cancelReason === reason && (
                        <div className={`w-2 h-2 rounded-full ${isLight ? "bg-red-500" : "bg-red-400"}`} />
                      )}
                    </div>
                    <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Feedback */}
            <div className="mb-5">
              <p className={`text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                Anything else you'd like us to know? <span className={isLight ? "text-gray-400" : "text-gray-500"}>(optional)</span>
              </p>
              <textarea
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                placeholder="Your feedback helps us improve..."
                rows={3}
                className={`w-full px-3 py-2 rounded-lg text-sm border resize-none ${
                  isLight
                    ? "border-gray-300 bg-white text-gray-900 placeholder-gray-400"
                    : "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
                } focus:outline-none focus:ring-2 ${isLight ? "focus:ring-blue-500" : "focus:ring-blue-500"}`}
              />
            </div>

            {/* Warning */}
            <div className={`rounded-lg p-3 mb-5 ${isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-900/10 border border-amber-800/30"}`}>
              <p className={`text-sm ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                You'll keep Pro access until the end of your billing period, then revert to Free.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(""); setCancelFeedback(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Keep Pro
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling || !cancelReason}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  !cancelReason
                    ? "opacity-50 cursor-not-allowed bg-red-400"
                    : isLight ? "bg-red-600 hover:bg-red-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────

const COACHELLA_CITIES = ["Palm Desert", "La Quinta", "Indian Wells", "Indio", "Cathedral City", "Rancho Mirage", "Palm Springs", "Desert Hot Springs", "Coachella", "Thousand Palms"];
const PROPERTY_TYPES = ["Single Family", "Condo/Townhouse", "Land", "Multi-Family", "Mobile Home"];
const MUST_HAVES = ["Pool", "Garage", "Gated Community", "Golf Course", "Mountain Views", "Single Story", "Updated Kitchen", "Solar", "Casita/Guest House"];
const DEAL_BREAKERS = ["HOA", "Land Lease", "Major Repairs Needed", "Busy Street", "No Garage"];

type SectionId = "general" | "goals" | "security" | "notifications" | "subscription" | "join";

const SECTIONS: { id: SectionId; title: string; icon: typeof User }[] = [
  { id: "general", title: "General", icon: User },
  { id: "goals", title: "Real Estate Goals", icon: Target },
  { id: "security", title: "Security", icon: Shield },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "subscription", title: "Subscription", icon: CreditCard },
  { id: "join", title: "Join Our Network", icon: Handshake },
];

// ── Main Component ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(["general"]));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Profile
  const [profile, setProfile] = useState({ name: "", phone: "", birthday: "", currentAddress: "", homeownerStatus: "", image: "" });

  // Goals
  const [goals, setGoals] = useState({
    intent: "", timeline: "", budgetMin: 0, budgetMax: 0,
    propertyTypes: [] as string[], bedrooms: 0, bathrooms: 0, minSqft: 0,
    preferredCities: [] as string[], preferredNeighborhoods: [] as string[],
    mustHaves: [] as string[], dealBreakers: [] as string[],
  });
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Security
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"email" | "sms">("email");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Notifications
  const [notifications, setNotifications] = useState({
    emailNewListings: true, emailPriceDrops: true, emailMarketUpdates: true,
    smsNotifications: false, pushNotifications: true,
  });

  // Email change
  const [userEmail, setUserEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeMsg, setEmailChangeMsg] = useState("");

  // 2FA expanded
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [phoneVerifyStep, setPhoneVerifyStep] = useState<"phone" | "code">("phone");
  const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Agent & Service Partner
  const [isAgent, setIsAgent] = useState(false);
  const [agentInfo, setAgentInfo] = useState({ name: "", agentId: "", team: "", licenseNumber: "", brokerageName: "" });
  const [isServicePartner, setIsServicePartner] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState({ companyName: "", partnerType: "", status: "" });

  // Agent approval modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${isLight ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500" : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"}`;
  const labelClass = `block text-sm font-medium mb-1.5 ${isLight ? "text-gray-700" : "text-gray-300"}`;

  const toggleSection = (id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { next.add(id); setTimeout(() => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }
      return next;
    });
  };

  const scrollToSection = (id: SectionId) => {
    setOpenSections((prev) => new Set(prev).add(id));
    setTimeout(() => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    else if (status === "authenticated") fetchData();
  }, [status, router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [authRes, profileRes] = await Promise.all([fetch("/api/auth/user"), fetch("/api/user/profile")]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setTwoFactorEnabled(auth.twoFactorEnabled || false);
        setTwoFactorMethod(auth.twoFactorMethod || "email");
        setUserEmail(auth.email || session?.user?.email || "");
        const isRE = auth.roles?.includes("realEstateAgent") || false;
        setIsAgent(isRE);
        if (isRE) {
          setAgentInfo({ name: auth.name || "", agentId: auth._id || "", team: auth.teamName || "ChatRealty", licenseNumber: auth.licenseNumber || "", brokerageName: auth.brokerageName || "" });
          // Show approval modal if agent hasn't seen it yet
          const dismissKey = `agent_approved_seen_${auth._id}`;
          if (!localStorage.getItem(dismissKey)) {
            setShowApprovalModal(true);
          }
        }
        const isSP = auth.roles?.includes("serviceProvider") || false;
        setIsServicePartner(isSP);
        if (isSP) {
          try {
            const spRes = await fetch("/api/service-partner/profile");
            if (spRes.ok) { const sp = await spRes.json(); setPartnerInfo({ companyName: sp.profile?.companyName || "", partnerType: sp.profile?.type || "", status: "active" }); }
          } catch {}
        }
      }
      if (profileRes.ok) {
        const { profile: p } = await profileRes.json();
        setProfile({ name: p.name || "", phone: p.phone || "", birthday: p.birthday ? new Date(p.birthday).toISOString().split("T")[0] : "", currentAddress: p.currentAddress || "", homeownerStatus: p.homeownerStatus || "", image: p.image || "" });
        if (p.realEstatePreferences) {
          const r = p.realEstatePreferences;
          setGoals({ intent: r.intent || "", timeline: r.timeline || "", budgetMin: r.budgetMin || 0, budgetMax: r.budgetMax || 0, propertyTypes: r.propertyTypes || [], bedrooms: r.bedrooms || 0, bathrooms: r.bathrooms || 0, minSqft: r.minSqft || 0, preferredCities: r.preferredCities || [], preferredNeighborhoods: r.preferredNeighborhoods || [], mustHaves: r.mustHaves || [], dealBreakers: r.dealBreakers || [] });
        }
        if (p.notificationPreferences) setNotifications(p.notificationPreferences);
        setAdditionalNotes(p.realEstateGoals || "");
      }
    } catch (err) { console.error("Error:", err); }
    finally { setIsLoading(false); }
  };

  const showMsg = (type: "success" | "error", text: string) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000); };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (res.ok) { showMsg("success", "Profile saved!"); if (profile.name !== session?.user?.name) await update({ name: profile.name }); }
      else showMsg("error", "Failed to save");
    } catch { showMsg("error", "An error occurred"); } finally { setIsSaving(false); }
  };

  const saveGoals = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ realEstatePreferences: goals, realEstateGoals: additionalNotes }) });
      if (res.ok) showMsg("success", "Goals saved! Your AI assistant will use these.");
      else showMsg("error", "Failed to save");
    } catch { showMsg("error", "An error occurred"); } finally { setIsSaving(false); }
  };

  const saveNotifications = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationPreferences: notifications }) });
      if (res.ok) showMsg("success", "Preferences saved!");
      else showMsg("error", "Failed to save");
    } catch { showMsg("error", "An error occurred"); } finally { setIsSaving(false); }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { showMsg("error", "Passwords don't match"); return; }
    if (newPassword.length < 8) { showMsg("error", "Password must be at least 8 characters"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (res.ok) { showMsg("success", "Password updated!"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
      else showMsg("error", data.error || "Failed");
    } catch { showMsg("error", "An error occurred"); } finally { setIsSaving(false); }
  };

  const toggle2FA = async () => {
    try {
      const res = await fetch(twoFactorEnabled ? "/api/auth/2fa/disable" : "/api/auth/2fa/enable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ twoFactorEmail: session?.user?.email }) });
      if (res.ok) { setTwoFactorEnabled(!twoFactorEnabled); showMsg("success", twoFactorEnabled ? "2FA disabled" : "2FA enabled"); }
      else showMsg("error", "Failed to update 2FA");
    } catch { showMsg("error", "An error occurred"); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { showMsg("error", "Invalid image (max 5MB)"); return; }
    setIsUploadingImage(true);
    try {
      const urls = await uploadToCloudinary([file], "profile-photos");
      if (urls.length > 0) {
        setProfile((p) => ({ ...p, image: urls[0] }));
        await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: urls[0] }) });
        showMsg("success", "Photo uploaded!");
      }
    } catch { showMsg("error", "Upload failed"); } finally { setIsUploadingImage(false); }
  };

  const handleEmailChange = async () => {
    if (!newEmail || !newEmail.includes("@")) { setEmailChangeMsg("Enter a valid email"); return; }
    setEmailChangeLoading(true);
    setEmailChangeMsg("");
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailChangeMsg("Verification email sent! Check your new inbox.");
        setNewEmail("");
        setShowEmailChange(false);
      } else {
        setEmailChangeMsg(data.error || "Failed to change email");
      }
    } catch { setEmailChangeMsg("An error occurred"); }
    finally { setEmailChangeLoading(false); }
  };

  const handleSwitchTo2FASMS = async () => {
    setShowPhoneVerify(true);
    setPhoneVerifyStep("phone");
  };

  const handleSendPhoneCode = async () => {
    if (!verifyPhone || verifyPhone.length < 10) { showMsg("error", "Enter a valid phone number"); return; }
    setPhoneVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: verifyPhone }),
      });
      if (res.ok) {
        setPhoneVerifyStep("code");
        showMsg("success", "Verification code sent!");
      } else {
        const data = await res.json();
        showMsg("error", data.error || "Failed to send code");
      }
    } catch { showMsg("error", "Failed to send code"); }
    finally { setPhoneVerifyLoading(false); }
  };

  const handleConfirmPhoneCode = async () => {
    if (!verifyCode || verifyCode.length !== 6) { showMsg("error", "Enter the 6-digit code"); return; }
    setPhoneVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: verifyPhone, code: verifyCode }),
      });
      if (res.ok) {
        setTwoFactorMethod("sms");
        setShowPhoneVerify(false);
        setVerifyPhone("");
        setVerifyCode("");
        showMsg("success", "Phone verified! 2FA switched to SMS.");
      } else {
        const data = await res.json();
        showMsg("error", data.error || "Invalid code");
      }
    } catch { showMsg("error", "Verification failed"); }
    finally { setPhoneVerifyLoading(false); }
  };

  const handleSwitchToEmail2FA = async () => {
    try {
      const res = await fetch("/api/auth/2fa/switch-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "email" }),
      });
      if (res.ok) {
        setTwoFactorMethod("email");
        setShowPhoneVerify(false);
        showMsg("success", "2FA switched to Email");
      } else {
        showMsg("error", "Failed to switch method");
      }
    } catch { showMsg("error", "Failed to switch method"); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        window.location.href = "/auth/signin?deleted=true";
      } else {
        const data = await res.json();
        showMsg("error", data.error || "Failed to delete account");
      }
    } catch { showMsg("error", "Failed to delete account"); }
    finally { setDeleteLoading(false); setShowDeleteModal(false); setDeletePassword(""); }
  };

  // Handle email change query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailChange = params.get("email_change");
    if (emailChange === "success") showMsg("success", "Email updated successfully! Please sign in with your new email.");
    else if (emailChange === "expired") showMsg("error", "Email change link expired. Try again.");
    else if (emailChange === "taken") showMsg("error", "That email is already in use.");
    else if (emailChange === "error") showMsg("error", "Email change failed. Try again.");
    if (emailChange) window.history.replaceState({}, "", "/dashboard/settings");
  }, []);

  if (status === "loading" || isLoading) return (
    <SpaticalBackground showGradient={true}><div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div></SpaticalBackground>
  );

  const saveBtnClass = `px-6 py-2.5 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50`;

  const dismissApprovalModal = () => {
    setShowApprovalModal(false);
    if (agentInfo.agentId) {
      localStorage.setItem(`agent_approved_seen_${agentInfo.agentId}`, "true");
    }
  };

  return (
    <SpaticalBackground showGradient={true}>
      {/* Agent Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isLight ? "bg-white" : "bg-gray-900"}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white/20 backdrop-blur mb-4">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Welcome to the Team!</h2>
              <p className="text-white/80 text-sm">Your agent application has been approved</p>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className={`text-sm mb-5 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                Congratulations{agentInfo.name ? `, ${agentInfo.name.split(" ")[0]}` : ""}! You now have access to the full agent dashboard with campaigns, CRM, analytics, and your own branded subdomain.
              </p>

              <div className={`rounded-xl p-4 mb-5 space-y-2.5 ${isLight ? "bg-blue-50 border border-blue-100" : "bg-blue-900/20 border border-blue-800/30"}`}>
                <p className={`text-sm font-medium ${isLight ? "text-blue-800" : "text-blue-300"}`}>Next steps:</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? "bg-blue-200 text-blue-700" : "bg-blue-800 text-blue-300"}`}>1</span>
                    <p className={`text-sm ${isLight ? "text-blue-700" : "text-blue-200"}`}>Check your email for onboarding instructions</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? "bg-blue-200 text-blue-700" : "bg-blue-800 text-blue-300"}`}>2</span>
                    <p className={`text-sm ${isLight ? "text-blue-700" : "text-blue-200"}`}>Complete your agent profile and branding</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? "bg-blue-200 text-blue-700" : "bg-blue-800 text-blue-300"}`}>3</span>
                    <p className={`text-sm ${isLight ? "text-blue-700" : "text-blue-200"}`}>Choose a subscription plan to activate your subdomain</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { dismissApprovalModal(); router.push("/agent/dashboard"); }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold transition-all"
                >
                  Go to Agent Dashboard
                </button>
                <button
                  onClick={dismissApprovalModal}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen py-8 px-4 max-w-4xl mx-auto">
        <Link href="/dashboard" className={`inline-flex items-center gap-1 text-sm mb-6 ${isLight ? "text-blue-600" : "text-emerald-400"}`}>← Back to Dashboard</Link>

        <h1 className={`text-3xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Settings</h1>
        <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Manage your profile and account preferences</p>

        {/* Mini Nav */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SECTIONS.map(({ id, title, icon: Icon }) => (
            <button key={id} onClick={() => scrollToSection(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                openSections.has(id)
                  ? isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/40 text-emerald-300"
                  : isLight ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}>
              <Icon className="w-3.5 h-3.5" />{title}
            </button>
          ))}
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "success" ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300"}`}>{message.text}</div>
        )}

        <div className="space-y-4">

          {/* ── General ──────────────────────────────────────────────── */}
          <Section id="general" title="General" icon={User} isOpen={openSections.has("general")} onToggle={() => toggleSection("general")} isLight={isLight} sectionRef={(el) => { sectionRefs.current.general = el; }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {profile.image ? <img src={profile.image} alt="Profile" className="w-full h-full object-cover" /> : (
                  <div className={`w-full h-full flex items-center justify-center text-2xl font-bold ${isLight ? "bg-gray-200 text-gray-500" : "bg-gray-700 text-gray-400"}`}>{profile.name?.charAt(0)?.toUpperCase() || "?"}</div>
                )}
              </div>
              <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-600 text-gray-300 hover:bg-gray-700"}`}>
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploadingImage ? "Uploading..." : "Upload Photo"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
              </label>
            </div>
            {/* Email */}
            <div className="mb-4">
              <label className={labelClass}>Email</label>
              <div className="flex gap-2 items-center">
                <input value={userEmail} readOnly className={`${inputClass} flex-1 opacity-70 cursor-default`} />
                <button onClick={() => setShowEmailChange(!showEmailChange)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                  Change
                </button>
              </div>
              {showEmailChange && (
                <div className="mt-2 flex gap-2">
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" className={`${inputClass} flex-1`} />
                  <button onClick={handleEmailChange} disabled={emailChangeLoading}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium text-white whitespace-nowrap ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                    {emailChangeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Verification"}
                  </button>
                </div>
              )}
              {emailChangeMsg && <p className={`text-sm mt-1 ${emailChangeMsg.includes("sent") ? "text-green-600" : "text-red-500"}`}>{emailChangeMsg}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Full Name</label><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Phone</label><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Birthday</label><input type="date" value={profile.birthday} onChange={(e) => setProfile({ ...profile, birthday: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Homeowner Status</label>
                <select value={profile.homeownerStatus} onChange={(e) => setProfile({ ...profile, homeownerStatus: e.target.value })} className={inputClass}>
                  <option value="">Select</option><option value="own">Own</option><option value="rent">Rent</option><option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="mt-4"><label className={labelClass}>Current Address</label><input value={profile.currentAddress} onChange={(e) => setProfile({ ...profile, currentAddress: e.target.value })} placeholder="123 Main St, City, State, ZIP" className={inputClass} /></div>
            <div className="flex justify-end mt-6"><button onClick={saveProfile} disabled={isSaving} className={saveBtnClass}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</button></div>
          </Section>

          {/* ── Real Estate Goals ─────────────────────────────────────── */}
          <Section id="goals" title="Real Estate Goals" icon={Target} isOpen={openSections.has("goals")} onToggle={() => toggleSection("goals")} isLight={isLight} sectionRef={(el) => { sectionRefs.current.goals = el; }}>
            <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Our AI assistant uses this to give you personalized recommendations</p>
            <div className="space-y-6">
              <div><label className={labelClass}>What are you looking to do?</label><PillSelector options={["Buying", "Selling", "Both", "Just Browsing"]} value={goals.intent} onChange={(v) => setGoals({ ...goals, intent: v })} isLight={isLight} /></div>
              <div><label className={labelClass}>Timeline</label><PillSelector options={["ASAP", "1-3 Months", "3-6 Months", "6-12 Months", "12+ Months", "Not Sure"]} value={goals.timeline} onChange={(v) => setGoals({ ...goals, timeline: v })} isLight={isLight} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Budget Min ($)</label><input type="number" value={goals.budgetMin || ""} onChange={(e) => setGoals({ ...goals, budgetMin: Number(e.target.value) })} placeholder="200000" className={inputClass} /></div>
                <div><label className={labelClass}>Budget Max ($)</label><input type="number" value={goals.budgetMax || ""} onChange={(e) => setGoals({ ...goals, budgetMax: Number(e.target.value) })} placeholder="600000" className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Property Types</label><CheckboxGroup options={PROPERTY_TYPES} selected={goals.propertyTypes} onChange={(v) => setGoals({ ...goals, propertyTypes: v })} isLight={isLight} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Bedrooms</label><NumberPillSelector options={[1, 2, 3, 4, "5+"]} value={goals.bedrooms} onChange={(v) => setGoals({ ...goals, bedrooms: typeof v === "number" ? v : 5 })} isLight={isLight} /></div>
                <div><label className={labelClass}>Bathrooms</label><NumberPillSelector options={[1, 2, 3, "4+"]} value={goals.bathrooms} onChange={(v) => setGoals({ ...goals, bathrooms: typeof v === "number" ? v : 4 })} isLight={isLight} /></div>
              </div>
              <div><label className={labelClass}>Min Square Footage</label><input type="number" value={goals.minSqft || ""} onChange={(e) => setGoals({ ...goals, minSqft: Number(e.target.value) })} placeholder="1200" className={`${inputClass} max-w-xs`} /></div>
              <div><label className={labelClass}>Preferred Cities</label><TagInput tags={goals.preferredCities} onChange={(v) => setGoals({ ...goals, preferredCities: v })} presets={COACHELLA_CITIES} placeholder="Add a city" isLight={isLight} /></div>
              <div><label className={labelClass}>Preferred Neighborhoods</label><TagInput tags={goals.preferredNeighborhoods} onChange={(v) => setGoals({ ...goals, preferredNeighborhoods: v })} placeholder="e.g. Sun City, PGA West" isLight={isLight} /></div>
              <div><label className={labelClass}>Must-Haves</label><CheckboxGroup options={MUST_HAVES} selected={goals.mustHaves} onChange={(v) => setGoals({ ...goals, mustHaves: v })} isLight={isLight} /></div>
              <div><label className={labelClass}>Deal-Breakers</label><CheckboxGroup options={DEAL_BREAKERS} selected={goals.dealBreakers} onChange={(v) => setGoals({ ...goals, dealBreakers: v })} isLight={isLight} /></div>
              <div><label className={labelClass}>Additional Notes</label><textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} placeholder="Anything else our AI should know..." className={inputClass} /></div>
            </div>
            <div className="flex justify-end mt-6"><button onClick={saveGoals} disabled={isSaving} className={saveBtnClass}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Goals"}</button></div>
          </Section>

          {/* ── Security ──────────────────────────────────────────────── */}
          <Section id="security" title="Security" icon={Shield} isOpen={openSections.has("security")} onToggle={() => toggleSection("security")} isLight={isLight} sectionRef={(el) => { sectionRefs.current.security = el; }}>
            {/* Password */}
            <h3 className={`text-base font-semibold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>Change Password</h3>
            <div className="space-y-3 max-w-md mb-8">
              {([["Current Password", currentPassword, setCurrentPassword, "current"] as const, ["New Password", newPassword, setNewPassword, "new"] as const, ["Confirm Password", confirmPassword, setConfirmPassword, "confirm"] as const]).map(([label, value, set, key]) => (
                <div key={key}><label className={labelClass}>{label}</label>
                  <div className="relative">
                    <input type={showPasswords[key] ? "text" : "password"} value={value} onChange={(e) => set(e.target.value)} className={inputClass} />
                    <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, [key]: !p[key] }))} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                      {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={changePassword} disabled={isSaving || !newPassword} className={saveBtnClass}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}</button>
            </div>

            {/* 2FA */}
            <h3 className={`text-base font-semibold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>Two-Factor Authentication</h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}</p>
                {twoFactorEnabled && <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Method: {twoFactorMethod === "sms" ? "SMS" : "Email"}</p>}
              </div>
              <ToggleSwitch enabled={twoFactorEnabled} onChange={toggle2FA} isLight={isLight} />
            </div>

            {twoFactorEnabled && (
              <div className={`rounded-lg p-4 ${isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-700/50 border border-gray-600"}`}>
                <p className={`text-sm font-medium mb-3 ${isLight ? "text-gray-700" : "text-gray-300"}`}>Verification Method</p>
                <div className="flex gap-2 mb-3">
                  <button onClick={handleSwitchToEmail2FA}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      twoFactorMethod === "email"
                        ? isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                        : isLight ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                    }`}>Email</button>
                  <button onClick={handleSwitchTo2FASMS}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      twoFactorMethod === "sms"
                        ? isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                        : isLight ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                    }`}>SMS</button>
                </div>

                {showPhoneVerify && (
                  <div className="space-y-3">
                    {phoneVerifyStep === "phone" ? (
                      <>
                        <div><label className={labelClass}>Phone Number</label>
                          <input value={verifyPhone} onChange={(e) => setVerifyPhone(e.target.value)} placeholder="(760) 555-1234" className={inputClass} />
                        </div>
                        <button onClick={handleSendPhoneCode} disabled={phoneVerifyLoading}
                          className={`w-full py-2 rounded-lg text-sm font-medium text-white ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                          {phoneVerifyLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Send Verification Code"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div><label className={labelClass}>Enter 6-digit code sent to {verifyPhone}</label>
                          <input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" maxLength={6} className={inputClass} />
                        </div>
                        <button onClick={handleConfirmPhoneCode} disabled={phoneVerifyLoading}
                          className={`w-full py-2 rounded-lg text-sm font-medium text-white ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                          {phoneVerifyLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Verify & Enable SMS"}
                        </button>
                        <button onClick={() => { setPhoneVerifyStep("phone"); setVerifyCode(""); }}
                          className={`w-full py-2 rounded-lg text-sm font-medium ${isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-600"}`}>
                          Back
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Delete Account */}
            <div className={`mt-8 pt-6 border-t ${isLight ? "border-gray-200" : "border-gray-700"}`}>
              <h3 className={`text-base font-semibold mb-2 ${isLight ? "text-red-600" : "text-red-400"}`}>Delete Account</h3>
              <p className={`text-sm mb-3 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button onClick={() => setShowDeleteModal(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isLight ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" : "bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-800/50"
                }`}>
                Delete My Account
              </button>
            </div>
          </Section>

          {/* ── Notifications ─────────────────────────────────────────── */}
          <Section id="notifications" title="Notifications" icon={Bell} isOpen={openSections.has("notifications")} onToggle={() => toggleSection("notifications")} isLight={isLight} sectionRef={(el) => { sectionRefs.current.notifications = el; }}>
            <div className="space-y-5">
              {([
                ["emailNewListings" as const, "New listing alerts", "Get notified when new properties match your criteria"],
                ["emailPriceDrops" as const, "Price drop notifications", "Know when prices drop on listings you've viewed"],
                ["emailMarketUpdates" as const, "Market updates & newsletters", "Monthly market insights and real estate tips"],
                ["smsNotifications" as const, "SMS notifications", "Receive text messages for urgent updates"],
                ["pushNotifications" as const, "Push notifications", "Browser notifications for real-time alerts"],
              ] as const).map(([key, label, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{label}</p>
                    <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>{desc}</p>
                    {key === "smsNotifications" && notifications.smsNotifications && (
                      <p className={`text-xs mt-1 ${isLight ? "text-amber-600" : "text-amber-400"}`}>By enabling SMS, you consent to receiving text messages. Msg & data rates may apply. Reply STOP to opt out.</p>
                    )}
                  </div>
                  <ToggleSwitch enabled={notifications[key]} onChange={(v) => setNotifications({ ...notifications, [key]: v })} isLight={isLight} />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6"><button onClick={saveNotifications} disabled={isSaving} className={saveBtnClass}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Preferences"}</button></div>
          </Section>

          {/* ── Subscription ────────────────────────────────────────── */}
          <Section id="subscription" title="Subscription" icon={CreditCard} isOpen={openSections.has("subscription")} onToggle={() => toggleSection("subscription")} isLight={isLight} sectionRef={(el) => { sectionRefs.current.subscription = el; }}>
            <SubscriptionSection isLight={isLight} />
          </Section>

          {/* ── Join Our Network ──────────────────────────────────────── */}
          <Section id="join" title="Join Our Network" icon={Handshake} isOpen={openSections.has("join")} onToggle={() => toggleSection("join")} isLight={isLight} sectionRef={(el) => { sectionRefs.current.join = el; }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Become an Agent */}
              <div className={`rounded-xl border p-5 ${isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-emerald-500"}`} />
                  <h3 className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Real Estate Agent</h3>
                </div>
                {isAgent ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {[["Name", agentInfo.name], ["Brokerage", agentInfo.brokerageName || "—"]].map(([label, val]) => (
                        <div key={label}><span className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>{label}</span><p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{val}</p></div>
                      ))}
                    </div>
                    <Link href="/agent/settings" className={`inline-flex items-center gap-1 text-sm font-medium ${isLight ? "text-blue-600" : "text-emerald-400"}`}>Manage Agent Profile →</Link>
                  </>
                ) : (
                  <>
                    <p className={`text-sm mb-3 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Get your own domain, AI-powered CRM, and multi-channel marketing tools.</p>
                    <ul className={`space-y-1.5 mb-4 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                      {["Custom domain & landing page", "AI lead generation", "Google Ads & Meta campaigns", "CRM & contact management"].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs"><Check className={`w-3.5 h-3.5 ${isLight ? "text-blue-600" : "text-emerald-500"}`} />{item}</li>
                      ))}
                    </ul>
                    <Link href="/dashboard/settings/join-us" className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>Apply as Agent</Link>
                  </>
                )}
              </div>

              {/* Become a Service Partner */}
              <div className={`rounded-xl border p-5 ${isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Handshake className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-emerald-500"}`} />
                  <h3 className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Service Partner</h3>
                </div>
                {isServicePartner ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div><span className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Company</span><p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{partnerInfo.companyName || "—"}</p></div>
                      <div><span className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Type</span><p className={`text-sm font-medium capitalize ${isLight ? "text-gray-900" : "text-white"}`}>{partnerInfo.partnerType?.replace(/_/g, " ") || "—"}</p></div>
                    </div>
                    <Link href="/partner/settings" className={`inline-flex items-center gap-1 text-sm font-medium ${isLight ? "text-blue-600" : "text-emerald-400"}`}>Manage Partner Settings →</Link>
                  </>
                ) : (
                  <>
                    <p className={`text-sm mb-3 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Partner with agents for RESPA-compliant co-marketing campaigns.</p>
                    <ul className={`space-y-1.5 mb-4 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                      {["Co-market with local agents", "Featured in partner directory", "RESPA-compliant JMAs", "Shared campaign costs"].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs"><Check className={`w-3.5 h-3.5 ${isLight ? "text-blue-600" : "text-emerald-500"}`} />{item}</li>
                      ))}
                    </ul>
                    <Link href="/partner/settings/apply" className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>Apply as Partner</Link>
                  </>
                )}
              </div>
            </div>
          </Section>

        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl ${isLight ? "bg-white" : "bg-gray-800 border border-gray-700"}`}
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${isLight ? "bg-red-50" : "bg-red-900/20"}`}>
                <X className={`w-7 h-7 ${isLight ? "text-red-500" : "text-red-400"}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>Delete Your Account?</h3>
              <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                This will permanently delete your account, all saved data, favorites, and cancel any active subscriptions. This cannot be undone.
              </p>
            </div>
            <div className="mb-4">
              <label className={labelClass}>Enter your password to confirm</label>
              <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password" className={inputClass} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteLoading || !deletePassword}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  !deletePassword ? "opacity-50 cursor-not-allowed bg-red-400" : "bg-red-600 hover:bg-red-700"
                }`}>
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SpaticalBackground>
  );
}
