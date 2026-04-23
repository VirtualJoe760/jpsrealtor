"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Award,
  MapPin,
  Scale,
  Handshake,
  ChevronDown,
  Plus,
  X,
  Loader2,
  Upload,
  Save,
} from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";
import PartnershipCard, {
  type Partnership,
} from "@/app/components/partner/PartnershipCard";

const PARTNER_TYPES = [
  "Mortgage Broker",
  "Title Officer",
  "Escrow Officer",
  "RE Attorney",
  "Property Manager",
  "General Contractor",
  "Home Inspector",
  "Insurance Agent",
] as const;

const CV_CITIES = [
  "Palm Springs",
  "Palm Desert",
  "La Quinta",
  "Rancho Mirage",
  "Indian Wells",
  "Indio",
  "Coachella",
  "Cathedral City",
  "Desert Hot Springs",
  "Thousand Palms",
  "Bermuda Dunes",
  "Thermal",
];

interface Certification {
  name: string;
  issuedBy: string;
  year: string;
}

interface PartnerProfile {
  partnerType: string;
  companyName: string;
  phone: string;
  website: string;
  bio: string;
  companyLogo: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  nmlsId: string;
  certifications: Certification[];
  serviceAreas: string[];
  specializations: string[];
  legalDisclaimer: string;
  insuranceInfo: string;
  status: string;
}

// Accordion section component
function Section({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  isLight,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  isLight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isLight
          ? "bg-white/80 border-gray-200"
          : "bg-gray-900/50 border-gray-800"
      }`}
      style={
        isLight
          ? {
              backdropFilter: "blur(10px) saturate(150%)",
              WebkitBackdropFilter: "blur(10px) saturate(150%)",
            }
          : undefined
      }
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-5 transition-colors ${
          isLight ? "hover:bg-gray-50" : "hover:bg-gray-800/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            className={`w-5 h-5 ${
              isLight ? "text-blue-600" : "text-emerald-400"
            }`}
          />
          <span
            className={`text-lg font-semibold ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            {title}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          } ${isLight ? "text-gray-400" : "text-gray-500"}`}
        />
      </button>
      {isOpen && (
        <div
          className={`p-5 pt-0 border-t ${
            isLight ? "border-gray-100" : "border-gray-800"
          }`}
        >
          <div className="pt-5">{children}</div>
        </div>
      )}
    </div>
  );
}

export default function PartnerSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [profile, setProfile] = useState<PartnerProfile>({
    partnerType: "",
    companyName: "",
    phone: "",
    website: "",
    bio: "",
    companyLogo: "",
    licenseNumber: "",
    licenseState: "",
    licenseExpiry: "",
    nmlsId: "",
    certifications: [],
    serviceAreas: [],
    specializations: [],
    legalDisclaimer: "",
    insuranceInfo: "",
    status: "",
  });

  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    company: true,
    licensing: false,
    areas: false,
    legal: false,
    partnerships: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Tag input states
  const [areaInput, setAreaInput] = useState("");
  const [specInput, setSpecInput] = useState("");

  // Certification add form
  const [newCert, setNewCert] = useState<Certification>({
    name: "",
    issuedBy: "",
    year: "",
  });

  // Partnership details expansion
  const [expandedPartnership, setExpandedPartnership] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profileRes, partnershipsRes] = await Promise.all([
        fetch("/api/service-partner/profile"),
        fetch("/api/partnerships"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile((prev) => ({ ...prev, ...data.profile }));
      }

      if (partnershipsRes.ok) {
        const data = await partnershipsRes.json();
        setPartnerships(data.partnerships || []);
      }
    } catch (err) {
      console.error("Error fetching partner data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSection = async (sectionKey: string, data: Partial<PartnerProfile>) => {
    setSavingSection(sectionKey);
    setMessage(null);
    try {
      const res = await fetch("/api/service-partner/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save");
      }

      setMessage({ type: "success", text: "Saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to save. Please try again.",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Logo must be under 5MB." });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const urls = await uploadToCloudinary([file], "partner-logos");
      if (urls[0]) {
        setProfile((prev) => ({ ...prev, companyLogo: urls[0] }));
        await saveSection("company", { companyLogo: urls[0] } as any);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to upload logo." });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const addTag = (
    field: "serviceAreas" | "specializations",
    value: string,
    setInput: (v: string) => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (profile[field].includes(trimmed)) return;
    setProfile((prev) => ({
      ...prev,
      [field]: [...prev[field], trimmed],
    }));
    setInput("");
  };

  const removeTag = (field: "serviceAreas" | "specializations", idx: number) => {
    setProfile((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== idx),
    }));
  };

  const addCertification = () => {
    if (!newCert.name.trim()) return;
    setProfile((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { ...newCert }],
    }));
    setNewCert({ name: "", issuedBy: "", year: "" });
  };

  const removeCertification = (idx: number) => {
    setProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== idx),
    }));
  };

  const handlePartnershipAction = async (
    id: string,
    action: "accept" | "reject"
  ) => {
    try {
      const res = await fetch(`/api/partnerships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "accept" ? "active" : "terminated",
        }),
      });
      if (res.ok) {
        setPartnerships((prev) =>
          prev.map((p) =>
            p._id === id
              ? {
                  ...p,
                  status: action === "accept" ? "active" : "terminated",
                }
              : p
          )
        );
        setMessage({
          type: "success",
          text: `Partnership ${action === "accept" ? "accepted" : "rejected"}.`,
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to update partnership.",
      });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <SpaticalBackground showGradient={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p
              className={`mt-4 ${
                isLight ? "text-gray-600" : "text-gray-400"
              }`}
            >
              Loading partner settings...
            </p>
          </div>
        </div>
      </SpaticalBackground>
    );
  }

  if (!session) return null;

  // Shared input class
  const inputClass = `w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
      : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  const SaveButton = ({
    section,
    onClick,
  }: {
    section: string;
    onClick: () => void;
  }) => (
    <div className="flex justify-end pt-4">
      <button
        onClick={onClick}
        disabled={savingSection === section}
        className={`px-6 py-2.5 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
          isLight
            ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
        }`}
      >
        {savingSection === section ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save
          </>
        )}
      </button>
    </div>
  );

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen px-4 pt-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-6 pt-16 md:pt-6">
            <Link
              href="/dashboard"
              className={`inline-flex items-center transition-colors ${
                isLight
                  ? "text-gray-500 hover:text-gray-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Building2
                className={`w-8 h-8 ${
                  isLight ? "text-blue-600" : "text-emerald-400"
                }`}
              />
              <h1
                className={`text-3xl font-bold ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Partner Settings
              </h1>
            </div>
            <p className={isLight ? "text-gray-600" : "text-gray-400"}>
              Manage your service partner profile and partnerships
            </p>
            {profile.status && (
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${
                  profile.status === "active"
                    ? isLight
                      ? "bg-green-100 border-green-300 text-green-700"
                      : "bg-green-500/20 border-green-500/50 text-green-300"
                    : profile.status === "pending"
                    ? isLight
                      ? "bg-amber-100 border-amber-300 text-amber-700"
                      : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : isLight
                    ? "bg-gray-100 border-gray-300 text-gray-500"
                    : "bg-gray-700/50 border-gray-600 text-gray-400"
                }`}
              >
                Status: {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
              </span>
            )}
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                message.type === "success"
                  ? isLight
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                  : isLight
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-red-500/10 border-red-500/50 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Accordion Sections */}
          <div className="space-y-4">
            {/* Company Info */}
            <Section
              title="Company Info"
              icon={Building2}
              isOpen={openSections.company}
              onToggle={() => toggleSection("company")}
              isLight={isLight}
            >
              <div className="space-y-4">
                {/* Partner Type */}
                <div>
                  <label className={labelClass}>Partner Type</label>
                  <select
                    value={profile.partnerType}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        partnerType: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Select type</option>
                    {PARTNER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input
                      type="text"
                      value={profile.companyName}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className={labelClass}>Website</label>
                  <input
                    type="url"
                    value={profile.website}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="https://yourcompany.com"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className={labelClass}>Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    rows={3}
                    className={inputClass}
                    placeholder="Tell clients about your services..."
                  />
                </div>

                {/* Company Logo */}
                <div>
                  <label className={labelClass}>Company Logo</label>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${
                        isLight
                          ? "border-gray-300 bg-gray-50"
                          : "border-gray-700 bg-gray-800/50"
                      }`}
                    >
                      {isUploadingLogo ? (
                        <Loader2
                          className={`w-6 h-6 animate-spin ${
                            isLight ? "text-blue-500" : "text-emerald-500"
                          }`}
                        />
                      ) : profile.companyLogo ? (
                        <img
                          src={profile.companyLogo}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Upload
                          className={`w-6 h-6 ${
                            isLight ? "text-gray-400" : "text-gray-600"
                          }`}
                        />
                      )}
                    </div>
                    <label
                      className={`cursor-pointer px-4 py-2 rounded-lg transition-colors border inline-flex items-center text-sm ${
                        isLight
                          ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                          : "bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                      }`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={isUploadingLogo}
                      />
                    </label>
                  </div>
                </div>

                <SaveButton
                  section="company"
                  onClick={() =>
                    saveSection("company", {
                      partnerType: profile.partnerType,
                      companyName: profile.companyName,
                      phone: profile.phone,
                      website: profile.website,
                      bio: profile.bio,
                      companyLogo: profile.companyLogo,
                    })
                  }
                />
              </div>
            </Section>

            {/* Licensing & Certifications */}
            <Section
              title="Licensing & Certifications"
              icon={Award}
              isOpen={openSections.licensing}
              onToggle={() => toggleSection("licensing")}
              isLight={isLight}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>License Number</label>
                    <input
                      type="text"
                      value={profile.licenseNumber}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          licenseNumber: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="License #"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <input
                      type="text"
                      value={profile.licenseState}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          licenseState: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Expiry Date</label>
                    <input
                      type="date"
                      value={profile.licenseExpiry}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          licenseExpiry: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* NMLS ID - only for mortgage brokers */}
                {profile.partnerType === "Mortgage Broker" && (
                  <div>
                    <label className={labelClass}>NMLS ID</label>
                    <input
                      type="text"
                      value={profile.nmlsId}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          nmlsId: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="NMLS #"
                    />
                  </div>
                )}

                {/* Certifications */}
                <div>
                  <label className={labelClass}>Certifications</label>
                  {profile.certifications.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {profile.certifications.map((cert, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                            isLight
                              ? "bg-gray-50 border border-gray-200"
                              : "bg-gray-800/50 border border-gray-700"
                          }`}
                        >
                          <div>
                            <span
                              className={`font-medium text-sm ${
                                isLight ? "text-gray-900" : "text-white"
                              }`}
                            >
                              {cert.name}
                            </span>
                            <span
                              className={`text-xs ml-2 ${
                                isLight ? "text-gray-500" : "text-gray-400"
                              }`}
                            >
                              {cert.issuedBy}
                              {cert.year ? ` (${cert.year})` : ""}
                            </span>
                          </div>
                          <button
                            onClick={() => removeCertification(idx)}
                            className="text-red-400 hover:text-red-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add certification form */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={newCert.name}
                      onChange={(e) =>
                        setNewCert((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Certification name"
                    />
                    <input
                      type="text"
                      value={newCert.issuedBy}
                      onChange={(e) =>
                        setNewCert((prev) => ({
                          ...prev,
                          issuedBy: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Issued by"
                    />
                    <input
                      type="text"
                      value={newCert.year}
                      onChange={(e) =>
                        setNewCert((prev) => ({
                          ...prev,
                          year: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder="Year"
                      maxLength={4}
                    />
                    <button
                      onClick={addCertification}
                      disabled={!newCert.name.trim()}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-40 ${
                        isLight
                          ? "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                          : "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-700"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                <SaveButton
                  section="licensing"
                  onClick={() =>
                    saveSection("licensing", {
                      licenseNumber: profile.licenseNumber,
                      licenseState: profile.licenseState,
                      licenseExpiry: profile.licenseExpiry,
                      nmlsId: profile.nmlsId,
                      certifications: profile.certifications,
                    })
                  }
                />
              </div>
            </Section>

            {/* Service Areas */}
            <Section
              title="Service Areas"
              icon={MapPin}
              isOpen={openSections.areas}
              onToggle={() => toggleSection("areas")}
              isLight={isLight}
            >
              <div className="space-y-4">
                {/* Service Areas Tags */}
                <div>
                  <label className={labelClass}>Service Areas</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profile.serviceAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          isLight
                            ? "bg-blue-100 text-blue-700"
                            : "bg-blue-900/30 text-blue-300"
                        }`}
                      >
                        {area}
                        <button
                          onClick={() => removeTag("serviceAreas", idx)}
                          className="hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={areaInput}
                        onChange={(e) => setAreaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag("serviceAreas", areaInput, setAreaInput);
                          }
                        }}
                        className={inputClass}
                        placeholder="Type a city or press Enter to add"
                        list="cv-cities"
                      />
                      <datalist id="cv-cities">
                        {CV_CITIES.filter(
                          (c) => !profile.serviceAreas.includes(c)
                        ).map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <button
                      onClick={() =>
                        addTag("serviceAreas", areaInput, setAreaInput)
                      }
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        isLight
                          ? "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                          : "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-700"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Specializations Tags */}
                <div>
                  <label className={labelClass}>Specializations</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profile.specializations.map((spec, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          isLight
                            ? "bg-purple-100 text-purple-700"
                            : "bg-purple-900/30 text-purple-300"
                        }`}
                      >
                        {spec}
                        <button
                          onClick={() => removeTag("specializations", idx)}
                          className="hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={specInput}
                      onChange={(e) => setSpecInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag("specializations", specInput, setSpecInput);
                        }
                      }}
                      className={`flex-1 ${inputClass}`}
                      placeholder="e.g. First-time buyers, VA loans, Luxury homes"
                    />
                    <button
                      onClick={() =>
                        addTag("specializations", specInput, setSpecInput)
                      }
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        isLight
                          ? "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                          : "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-700"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <SaveButton
                  section="areas"
                  onClick={() =>
                    saveSection("areas", {
                      serviceAreas: profile.serviceAreas,
                      specializations: profile.specializations,
                    })
                  }
                />
              </div>
            </Section>

            {/* Legal & Compliance */}
            <Section
              title="Legal & Compliance"
              icon={Scale}
              isOpen={openSections.legal}
              onToggle={() => toggleSection("legal")}
              isLight={isLight}
            >
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Legal Disclaimer{" "}
                    <span
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      (required for marketing materials)
                    </span>
                  </label>
                  <textarea
                    value={profile.legalDisclaimer}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        legalDisclaimer: e.target.value,
                      }))
                    }
                    rows={4}
                    className={inputClass}
                    placeholder="Enter your required legal disclosures..."
                  />
                </div>

                {(profile.partnerType === "General Contractor" ||
                  profile.partnerType === "Home Inspector") && (
                  <div>
                    <label className={labelClass}>Insurance Info</label>
                    <textarea
                      value={profile.insuranceInfo}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          insuranceInfo: e.target.value,
                        }))
                      }
                      rows={3}
                      className={inputClass}
                      placeholder="Liability insurance details, policy numbers, coverage amounts..."
                    />
                  </div>
                )}

                <SaveButton
                  section="legal"
                  onClick={() =>
                    saveSection("legal", {
                      legalDisclaimer: profile.legalDisclaimer,
                      insuranceInfo: profile.insuranceInfo,
                    })
                  }
                />
              </div>
            </Section>

            {/* My Partnerships */}
            <Section
              title="My Partnerships"
              icon={Handshake}
              isOpen={openSections.partnerships}
              onToggle={() => toggleSection("partnerships")}
              isLight={isLight}
            >
              <div className="space-y-4">
                {partnerships.length === 0 ? (
                  <div
                    className={`text-center py-8 ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    <Handshake
                      className={`w-12 h-12 mx-auto mb-3 ${
                        isLight ? "text-gray-300" : "text-gray-600"
                      }`}
                    />
                    <p className="text-sm">
                      No partnerships yet. Once agents invite you to partner,
                      they will appear here.
                    </p>
                  </div>
                ) : (
                  partnerships.map((p) => (
                    <div key={p._id}>
                      <PartnershipCard
                        partnership={p}
                        viewAs="partner"
                        onAccept={
                          p.status === "pending"
                            ? (id) => handlePartnershipAction(id, "accept")
                            : undefined
                        }
                        onReject={
                          p.status === "pending"
                            ? (id) => handlePartnershipAction(id, "reject")
                            : undefined
                        }
                        onViewDetails={(id) =>
                          setExpandedPartnership(
                            expandedPartnership === id ? null : id
                          )
                        }
                      />
                      {/* Expanded details */}
                      {expandedPartnership === p._id && (
                        <div
                          className={`mt-2 ml-16 rounded-lg p-4 border ${
                            isLight
                              ? "bg-gray-50 border-gray-200"
                              : "bg-gray-800/30 border-gray-700"
                          }`}
                        >
                          <h5
                            className={`text-sm font-semibold mb-2 ${
                              isLight ? "text-gray-700" : "text-gray-300"
                            }`}
                          >
                            Partnership Details
                          </h5>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span
                                className={
                                  isLight ? "text-gray-500" : "text-gray-400"
                                }
                              >
                                Started:
                              </span>{" "}
                              <span
                                className={
                                  isLight ? "text-gray-900" : "text-white"
                                }
                              >
                                {new Date(p.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span
                                className={
                                  isLight ? "text-gray-500" : "text-gray-400"
                                }
                              >
                                JMA:
                              </span>{" "}
                              <span
                                className={
                                  isLight ? "text-gray-900" : "text-white"
                                }
                              >
                                {p.jmaStatus === "signed"
                                  ? "Signed"
                                  : "Not yet signed"}
                              </span>
                            </div>
                            <div>
                              <span
                                className={
                                  isLight ? "text-gray-500" : "text-gray-400"
                                }
                              >
                                Agent Split:
                              </span>{" "}
                              <span
                                className={
                                  isLight ? "text-gray-900" : "text-white"
                                }
                              >
                                {p.costSplit.agent}%
                              </span>
                            </div>
                            <div>
                              <span
                                className={
                                  isLight ? "text-gray-500" : "text-gray-400"
                                }
                              >
                                Partner Split:
                              </span>{" "}
                              <span
                                className={
                                  isLight ? "text-gray-900" : "text-white"
                                }
                              >
                                {p.costSplit.partner}%
                              </span>
                            </div>
                          </div>
                          <p
                            className={`text-xs mt-3 ${
                              isLight ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Billing history will be available once campaigns are
                            active.
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}
