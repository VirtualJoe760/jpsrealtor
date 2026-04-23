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

// ── Constants ──────────────────────────────────────────────────────────────

const COACHELLA_CITIES = ["Palm Desert", "La Quinta", "Indian Wells", "Indio", "Cathedral City", "Rancho Mirage", "Palm Springs", "Desert Hot Springs", "Coachella", "Thousand Palms"];
const PROPERTY_TYPES = ["Single Family", "Condo/Townhouse", "Land", "Multi-Family", "Mobile Home"];
const MUST_HAVES = ["Pool", "Garage", "Gated Community", "Golf Course", "Mountain Views", "Single Story", "Updated Kitchen", "Solar", "Casita/Guest House"];
const DEAL_BREAKERS = ["HOA", "Land Lease", "Major Repairs Needed", "Busy Street", "No Garage"];

type SectionId = "general" | "goals" | "security" | "notifications" | "join";

const SECTIONS: { id: SectionId; title: string; icon: typeof User }[] = [
  { id: "general", title: "General", icon: User },
  { id: "goals", title: "Real Estate Goals", icon: Target },
  { id: "security", title: "Security", icon: Shield },
  { id: "notifications", title: "Notifications", icon: Bell },
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

  // Agent & Service Partner
  const [isAgent, setIsAgent] = useState(false);
  const [agentInfo, setAgentInfo] = useState({ name: "", agentId: "", team: "", licenseNumber: "", brokerageName: "" });
  const [isServicePartner, setIsServicePartner] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState({ companyName: "", partnerType: "", status: "" });

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
        const isRE = auth.roles?.includes("realEstateAgent") || false;
        setIsAgent(isRE);
        if (isRE) setAgentInfo({ name: auth.name || "", agentId: auth._id || "", team: auth.teamName || "ChatRealty", licenseNumber: auth.licenseNumber || "", brokerageName: auth.brokerageName || "" });
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

  if (status === "loading" || isLoading) return (
    <SpaticalBackground showGradient={true}><div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div></SpaticalBackground>
  );

  const saveBtnClass = `px-6 py-2.5 rounded-lg text-sm font-medium ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50`;

  return (
    <SpaticalBackground showGradient={true}>
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
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}</p>
                {twoFactorEnabled && <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Method: {twoFactorMethod === "sms" ? "SMS" : "Email"}</p>}
              </div>
              <ToggleSwitch enabled={twoFactorEnabled} onChange={toggle2FA} isLight={isLight} />
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
    </SpaticalBackground>
  );
}
