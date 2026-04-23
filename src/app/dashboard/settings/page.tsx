// src/app/dashboard/settings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { User, Lock, Upload, Loader2, Bell, Target, Shield, Eye, EyeOff, X, Plus, Check } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";

// ── Inline Sub-Components ──────────────────────────────────────────────────

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
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };
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
            selected.includes(opt)
              ? isLight ? "bg-blue-600" : "bg-emerald-600"
              : isLight ? "border-2 border-gray-300" : "border-2 border-gray-600"
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
  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInput("");
  };
  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));
  const availablePresets = presets?.filter((p) => !tags.includes(p)) || [];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
            isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/40 text-emerald-300"
          }`}>{tag}<button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button></span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(input); } }}
          placeholder={placeholder || "Type and press Enter"}
          className={`flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
            isLight ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500" : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
          }`} />
        {input && <button type="button" onClick={() => addTag(input)}
          className={`px-3 py-2 rounded-lg text-sm ${isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}`}><Plus className="w-4 h-4" /></button>}
      </div>
      {availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {availablePresets.map((p) => (
            <button key={p} type="button" onClick={() => addTag(p)}
              className={`px-2 py-1 rounded text-xs ${isLight ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>+ {p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ enabled, onChange, isLight }: {
  enabled: boolean; onChange: (v: boolean) => void; isLight: boolean;
}) {
  return (
    <button type="button" onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? (isLight ? "bg-blue-600" : "bg-emerald-600") : (isLight ? "bg-gray-300" : "bg-gray-600")
      }`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────

const COACHELLA_CITIES = ["Palm Desert", "La Quinta", "Indian Wells", "Indio", "Cathedral City", "Rancho Mirage", "Palm Springs", "Desert Hot Springs", "Coachella", "Thousand Palms"];
const PROPERTY_TYPES = ["Single Family", "Condo/Townhouse", "Land", "Multi-Family", "Mobile Home"];
const MUST_HAVES = ["Pool", "Garage", "Gated Community", "Golf Course", "Mountain Views", "Single Story", "Updated Kitchen", "Solar", "Casita/Guest House"];
const DEAL_BREAKERS = ["HOA", "Land Lease", "Major Repairs Needed", "Busy Street", "No Garage"];

// ── Main Component ─────────────────────────────────────────────────────────

type TabType = "profile" | "goals" | "security" | "notifications" | "agent";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: "", phone: "", birthday: "", currentAddress: "", homeownerStatus: "", image: "",
  });

  // Real Estate Goals state
  const [goals, setGoals] = useState({
    intent: "", timeline: "", budgetMin: 0, budgetMax: 0,
    propertyTypes: [] as string[], bedrooms: 0, bathrooms: 0, minSqft: 0,
    preferredCities: [] as string[], preferredNeighborhoods: [] as string[],
    mustHaves: [] as string[], dealBreakers: [] as string[],
  });
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"email" | "sms">("email");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailNewListings: true, emailPriceDrops: true, emailMarketUpdates: true,
    smsNotifications: false, pushNotifications: true,
  });

  // Agent state
  const [isAgent, setIsAgent] = useState(false);
  const [agentInfo, setAgentInfo] = useState({ name: "", agentId: "", team: "", licenseNumber: "", brokerageName: "" });

  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500" : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;
  const labelClass = `block text-sm font-medium mb-1.5 ${isLight ? "text-gray-700" : "text-gray-300"}`;
  const cardClass = `rounded-xl border p-6 ${isLight ? "bg-white/80 border-gray-200" : "bg-gray-800/60 border-gray-700"}`;
  const headingClass = `text-xl font-semibold mb-1 ${isLight ? "text-gray-900" : "text-white"}`;
  const subClass = `text-sm mb-6 ${isLight ? "text-gray-500" : "text-gray-400"}`;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    else if (status === "authenticated") fetchData();
  }, [status, router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [authRes, profileRes] = await Promise.all([
        fetch("/api/auth/user"), fetch("/api/user/profile"),
      ]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setTwoFactorEnabled(auth.twoFactorEnabled || false);
        setTwoFactorMethod(auth.twoFactorMethod || "email");
        const isRE = auth.roles?.includes("realEstateAgent") || false;
        setIsAgent(isRE);
        if (isRE) setAgentInfo({ name: auth.name || "", agentId: auth._id || "", team: auth.teamName || "ChatRealty", licenseNumber: auth.licenseNumber || "", brokerageName: auth.brokerageName || "" });
      }
      if (profileRes.ok) {
        const { profile: p } = await profileRes.json();
        setProfile({
          name: p.name || "", phone: p.phone || "",
          birthday: p.birthday ? new Date(p.birthday).toISOString().split("T")[0] : "",
          currentAddress: p.currentAddress || "", homeownerStatus: p.homeownerStatus || "", image: p.image || "",
        });
        if (p.realEstatePreferences) {
          const r = p.realEstatePreferences;
          setGoals({
            intent: r.intent || "", timeline: r.timeline || "",
            budgetMin: r.budgetMin || 0, budgetMax: r.budgetMax || 0,
            propertyTypes: r.propertyTypes || [], bedrooms: r.bedrooms || 0, bathrooms: r.bathrooms || 0,
            minSqft: r.minSqft || 0, preferredCities: r.preferredCities || [],
            preferredNeighborhoods: r.preferredNeighborhoods || [],
            mustHaves: r.mustHaves || [], dealBreakers: r.dealBreakers || [],
          });
        }
        if (p.notificationPreferences) setNotifications(p.notificationPreferences);
        setAdditionalNotes(p.realEstateGoals || "");
      }
    } catch (err) { console.error("Error fetching data:", err); }
    finally { setIsLoading(false); }
  };

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (res.ok) { showMsg("success", "Profile saved!"); if (profile.name !== session?.user?.name) await update({ name: profile.name }); }
      else showMsg("error", "Failed to save profile");
    } catch { showMsg("error", "An error occurred"); }
    finally { setIsSaving(false); }
  };

  const handleGoalsSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realEstatePreferences: goals, realEstateGoals: additionalNotes }) });
      if (res.ok) showMsg("success", "Goals saved! Your AI assistant will use these preferences.");
      else showMsg("error", "Failed to save goals");
    } catch { showMsg("error", "An error occurred"); }
    finally { setIsSaving(false); }
  };

  const handleNotificationsSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: notifications }) });
      if (res.ok) showMsg("success", "Notification preferences saved!");
      else showMsg("error", "Failed to save preferences");
    } catch { showMsg("error", "An error occurred"); }
    finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { showMsg("error", "Passwords don't match"); return; }
    if (newPassword.length < 8) { showMsg("error", "Password must be at least 8 characters"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (res.ok) { showMsg("success", "Password updated!"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
      else showMsg("error", data.error || "Failed to change password");
    } catch { showMsg("error", "An error occurred"); }
    finally { setIsSaving(false); }
  };

  const handleToggle2FA = async () => {
    const endpoint = twoFactorEnabled ? "/api/auth/2fa/disable" : "/api/auth/2fa/enable";
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorEmail: session?.user?.email }) });
      if (res.ok) { setTwoFactorEnabled(!twoFactorEnabled); showMsg("success", twoFactorEnabled ? "2FA disabled" : "2FA enabled"); }
      else showMsg("error", "Failed to update 2FA");
    } catch { showMsg("error", "An error occurred"); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showMsg("error", "Please select a valid image"); return; }
    if (file.size > 5 * 1024 * 1024) { showMsg("error", "Image must be under 5MB"); return; }
    setIsUploadingImage(true);
    try {
      const urls = await uploadToCloudinary([file], "profile-photos");
      if (urls.length > 0) {
        const newImage = urls[0];
        setProfile((p) => ({ ...p, image: newImage }));
        await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: newImage }) });
        showMsg("success", "Photo uploaded!");
      }
    } catch { showMsg("error", "Upload failed"); }
    finally { setIsUploadingImage(false); }
  };

  if (status === "loading" || isLoading) return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    </SpaticalBackground>
  );

  const tabs: { id: TabType; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "goals", label: "Real Estate Goals", icon: Target },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "agent", label: "Become an Agent", icon: Lock },
  ];

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen py-8 px-4 max-w-4xl mx-auto">
        <Link href="/dashboard" className={`inline-flex items-center gap-1 text-sm mb-6 ${isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"}`}>
          ← Back to Dashboard
        </Link>

        <h1 className={`text-3xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Settings</h1>
        <p className={`text-sm mb-8 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Manage your profile and account preferences</p>

        {/* Message */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success" ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300"
          }`}>{message.text}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto mb-8 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? isLight ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                    : isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-800"
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Profile Tab ─────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className={cardClass}>
            <h2 className={headingClass}>Profile</h2>
            <p className={subClass}>Your basic account information</p>

            {/* Photo */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {profile.image ? (
                  <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-2xl font-bold ${isLight ? "bg-gray-200 text-gray-500" : "bg-gray-700 text-gray-400"}`}>
                    {profile.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${
                isLight ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-600 text-gray-300 hover:bg-gray-700"
              }`}>
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploadingImage ? "Uploading..." : "Upload Photo"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Full Name</label><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Phone Number</label><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Birthday</label><input type="date" value={profile.birthday} onChange={(e) => setProfile({ ...profile, birthday: e.target.value })} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Homeowner Status</label>
                <select value={profile.homeownerStatus} onChange={(e) => setProfile({ ...profile, homeownerStatus: e.target.value })} className={inputClass}>
                  <option value="">Select status</option>
                  <option value="own">I own my home</option>
                  <option value="rent">I rent</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="mt-4"><label className={labelClass}>Current Address</label><input value={profile.currentAddress} onChange={(e) => setProfile({ ...profile, currentAddress: e.target.value })} placeholder="123 Main St, City, State, ZIP" className={inputClass} /></div>

            <div className="flex justify-end mt-6">
              <button onClick={handleProfileSave} disabled={isSaving}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {/* ── Real Estate Goals Tab ───────────────────────────────────── */}
        {activeTab === "goals" && (
          <div className={cardClass}>
            <h2 className={headingClass}>My Real Estate Goals</h2>
            <p className={subClass}>Tell us what you&apos;re looking for — our AI assistant will use this to give you personalized recommendations</p>

            <div className="space-y-6">
              {/* Intent */}
              <div><label className={labelClass}>What are you looking to do?</label>
                <PillSelector options={["Buying", "Selling", "Both", "Just Browsing"]} value={goals.intent} onChange={(v) => setGoals({ ...goals, intent: v })} isLight={isLight} /></div>

              {/* Timeline */}
              <div><label className={labelClass}>Timeline</label>
                <PillSelector options={["ASAP", "1-3 Months", "3-6 Months", "6-12 Months", "12+ Months", "Not Sure"]} value={goals.timeline} onChange={(v) => setGoals({ ...goals, timeline: v })} isLight={isLight} /></div>

              {/* Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Budget Min ($)</label><input type="number" value={goals.budgetMin || ""} onChange={(e) => setGoals({ ...goals, budgetMin: Number(e.target.value) })} placeholder="200000" className={inputClass} /></div>
                <div><label className={labelClass}>Budget Max ($)</label><input type="number" value={goals.budgetMax || ""} onChange={(e) => setGoals({ ...goals, budgetMax: Number(e.target.value) })} placeholder="600000" className={inputClass} /></div>
              </div>

              {/* Property Types */}
              <div><label className={labelClass}>Property Types</label>
                <CheckboxGroup options={PROPERTY_TYPES} selected={goals.propertyTypes} onChange={(v) => setGoals({ ...goals, propertyTypes: v })} isLight={isLight} /></div>

              {/* Beds & Baths */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Bedrooms</label>
                  <NumberPillSelector options={[1, 2, 3, 4, "5+"]} value={goals.bedrooms} onChange={(v) => setGoals({ ...goals, bedrooms: typeof v === "number" ? v : 5 })} isLight={isLight} /></div>
                <div><label className={labelClass}>Bathrooms</label>
                  <NumberPillSelector options={[1, 2, 3, "4+"]} value={goals.bathrooms} onChange={(v) => setGoals({ ...goals, bathrooms: typeof v === "number" ? v : 4 })} isLight={isLight} /></div>
              </div>

              {/* Sq Ft */}
              <div><label className={labelClass}>Minimum Square Footage</label>
                <input type="number" value={goals.minSqft || ""} onChange={(e) => setGoals({ ...goals, minSqft: Number(e.target.value) })} placeholder="1200" className={`${inputClass} max-w-xs`} /></div>

              {/* Cities */}
              <div><label className={labelClass}>Preferred Cities</label>
                <TagInput tags={goals.preferredCities} onChange={(v) => setGoals({ ...goals, preferredCities: v })} presets={COACHELLA_CITIES} placeholder="Add a city" isLight={isLight} /></div>

              {/* Neighborhoods */}
              <div><label className={labelClass}>Preferred Neighborhoods / Subdivisions</label>
                <TagInput tags={goals.preferredNeighborhoods} onChange={(v) => setGoals({ ...goals, preferredNeighborhoods: v })} placeholder="e.g. Sun City, PGA West, Indian Ridge" isLight={isLight} /></div>

              {/* Must-Haves */}
              <div><label className={labelClass}>Must-Haves</label>
                <CheckboxGroup options={MUST_HAVES} selected={goals.mustHaves} onChange={(v) => setGoals({ ...goals, mustHaves: v })} isLight={isLight} /></div>

              {/* Deal-Breakers */}
              <div><label className={labelClass}>Deal-Breakers</label>
                <CheckboxGroup options={DEAL_BREAKERS} selected={goals.dealBreakers} onChange={(v) => setGoals({ ...goals, dealBreakers: v })} isLight={isLight} /></div>

              {/* Notes */}
              <div><label className={labelClass}>Additional Notes</label>
                <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} placeholder="Anything else our AI should know about what you're looking for..."
                  className={inputClass} /></div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleGoalsSave} disabled={isSaving}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Goals"}
              </button>
            </div>
          </div>
        )}

        {/* ── Security Tab ────────────────────────────────────────────── */}
        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className={cardClass}>
              <h2 className={headingClass}>Change Password</h2>
              <p className={subClass}>Update your account password</p>
              <div className="space-y-4 max-w-md">
                {[
                  { label: "Current Password", value: currentPassword, set: setCurrentPassword, key: "current" as const },
                  { label: "New Password", value: newPassword, set: setNewPassword, key: "new" as const },
                  { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, key: "confirm" as const },
                ].map(({ label, value, set, key }) => (
                  <div key={key}>
                    <label className={labelClass}>{label}</label>
                    <div className="relative">
                      <input type={showPasswords[key] ? "text" : "password"} value={value} onChange={(e) => set(e.target.value)} className={inputClass} />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, [key]: !p[key] }))}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                        {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={handleChangePassword} disabled={isSaving || !newPassword}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50`}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </button>
              </div>
            </div>

            {/* 2FA */}
            <div className={cardClass}>
              <h2 className={headingClass}>Two-Factor Authentication</h2>
              <p className={subClass}>Add an extra layer of security to your account</p>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                    {twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}
                  </p>
                  {twoFactorEnabled && <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Method: {twoFactorMethod === "sms" ? "SMS" : "Email"}</p>}
                </div>
                <ToggleSwitch enabled={twoFactorEnabled} onChange={handleToggle2FA} isLight={isLight} />
              </div>
            </div>
          </div>
        )}

        {/* ── Notifications Tab ───────────────────────────────────────── */}
        {activeTab === "notifications" && (
          <div className={cardClass}>
            <h2 className={headingClass}>Notifications</h2>
            <p className={subClass}>Choose how you want to be notified</p>
            <div className="space-y-5">
              {[
                { key: "emailNewListings" as const, label: "New listing alerts", desc: "Get notified when new properties match your criteria" },
                { key: "emailPriceDrops" as const, label: "Price drop notifications", desc: "Know when prices drop on listings you've viewed" },
                { key: "emailMarketUpdates" as const, label: "Market updates & newsletters", desc: "Monthly market insights and real estate tips" },
                { key: "smsNotifications" as const, label: "SMS notifications", desc: "Receive text messages for urgent updates" },
                { key: "pushNotifications" as const, label: "Push notifications", desc: "Browser notifications for real-time alerts" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{label}</p>
                    <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>{desc}</p>
                    {key === "smsNotifications" && notifications.smsNotifications && (
                      <p className={`text-xs mt-1 ${isLight ? "text-amber-600" : "text-amber-400"}`}>
                        By enabling SMS, you consent to receiving text messages. Msg & data rates may apply. Reply STOP to opt out.
                      </p>
                    )}
                  </div>
                  <ToggleSwitch enabled={notifications[key]} onChange={(v) => setNotifications({ ...notifications, [key]: v })} isLight={isLight} />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={handleNotificationsSave} disabled={isSaving}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Preferences"}
              </button>
            </div>
          </div>
        )}

        {/* ── Become an Agent Tab ─────────────────────────────────────── */}
        {activeTab === "agent" && (
          <div className={cardClass}>
            {isAgent ? (
              <>
                <h2 className={headingClass}>Agent Profile</h2>
                <p className={subClass}>You&apos;re a registered agent on our platform</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Name</span><p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{agentInfo.name}</p></div>
                  <div><span className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Team</span><p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{agentInfo.team}</p></div>
                  <div><span className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>License #</span><p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{agentInfo.licenseNumber || "—"}</p></div>
                  <div><span className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Brokerage</span><p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{agentInfo.brokerageName || "—"}</p></div>
                </div>
                <div className="mt-4">
                  <Link href="/agent/settings" className={`text-sm ${isLight ? "text-blue-600 hover:text-blue-700" : "text-emerald-400 hover:text-emerald-300"}`}>
                    Go to Agent Settings →
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className={headingClass}>Why Join ChatRealty?</h2>
                <p className={subClass}>Grow your real estate business with our AI-powered platform</p>
                <ul className={`space-y-3 mb-6 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  {[
                    "Get your own custom domain and branded landing page",
                    "AI-powered lead generation and client matching",
                    "Multi-channel marketing tools (Google Ads, Meta, direct mail, voicemail)",
                    "Full CRM with contact management and lead scoring",
                    "Automated Google Business Profile posting and SEO",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? "text-blue-600" : "text-emerald-500"}`} />{item}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard/settings/join-us"
                  className={`inline-block px-6 py-2.5 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                  Apply Now
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </SpaticalBackground>
  );
}
