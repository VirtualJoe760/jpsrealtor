"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, Building2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

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

type PartnerType = (typeof PARTNER_TYPES)[number];

interface ApplicationForm {
  partnerType: PartnerType | "";
  companyName: string;
  phone: string;
  website: string;
  licenseNumber: string;
  licenseState: string;
  nmlsId: string;
  bio: string;
  legalDisclaimer: string;
}

export default function PartnerApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [form, setForm] = useState<ApplicationForm>({
    partnerType: "",
    companyName: "",
    phone: "",
    website: "",
    licenseNumber: "",
    licenseState: "",
    nmlsId: "",
    bio: "",
    legalDisclaimer: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleChange = (
    field: keyof ApplicationForm,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!form.partnerType) {
      setError("Please select a partner type.");
      return;
    }
    if (!form.companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    // License fields are optional — not all partner types require licensing

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/service-partner/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.partnerType.toLowerCase().replace(/\s+/g, "_"),
          companyName: form.companyName,
          phone: form.phone,
          website: form.website,
          licenseNumber: form.licenseNumber,
          licenseState: form.licenseState,
          nmlsId: form.nmlsId,
          bio: form.bio,
          legalDisclaimer: form.legalDisclaimer,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Application failed");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <SpaticalBackground showGradient={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className={`text-xl ${isLight ? "text-gray-900" : "text-white"}`}>
            Loading...
          </div>
        </div>
      </SpaticalBackground>
    );
  }

  if (!session) return null;

  // Input class helper
  const inputClass = `w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
      : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen px-4 pt-6 pb-12">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="mb-6 pt-16 md:pt-6">
            <Link
              href="/dashboard/settings"
              className={`inline-flex items-center transition-colors ${
                isLight
                  ? "text-gray-500 hover:text-gray-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Settings
            </Link>
          </div>

          {/* Success State */}
          {submitted ? (
            <div
              className={`backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center ${
                isLight
                  ? "bg-white/80 border border-gray-200"
                  : "bg-gray-900/50 border border-gray-800"
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
              <CheckCircle
                className={`w-16 h-16 mx-auto mb-4 ${
                  isLight ? "text-green-500" : "text-emerald-400"
                }`}
              />
              <h2
                className={`text-2xl font-bold mb-3 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Application Submitted!
              </h2>
              <p
                className={`mb-6 ${
                  isLight ? "text-gray-600" : "text-gray-400"
                }`}
              >
                Thank you for applying to become a ChatRealty Service Partner.
                Here is what happens next:
              </p>
              <div
                className={`rounded-lg p-6 text-left space-y-3 ${
                  isLight
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-blue-900/20 border border-blue-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isLight
                        ? "bg-blue-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    1
                  </span>
                  <p
                    className={`text-sm ${
                      isLight ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    Our team will review your application within 1-2 business days.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isLight
                        ? "bg-blue-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    2
                  </span>
                  <p
                    className={`text-sm ${
                      isLight ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    We will verify your license and credentials.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isLight
                        ? "bg-blue-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    3
                  </span>
                  <p
                    className={`text-sm ${
                      isLight ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    Once verified, your Partner Profile will be unlocked. You&apos;ll be able to customize your profile, upload your company logo, and start connecting with agents for co-marketing partnerships.
                  </p>
                </div>
              </div>
              <div className={`mt-6 p-4 rounded-lg border text-sm ${
                isLight ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-amber-900/20 border-amber-700 text-amber-300"
              }`}>
                A confirmation email has been sent to your inbox. You&apos;ll receive another email once your application has been reviewed and approved. Your Partner Profile dashboard will become available after verification.
              </div>
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-6 py-3 mt-6 font-semibold rounded-lg transition-all duration-200 ${
                  isLight
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                }`}
              >
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <>
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
                    Service Partner Application
                  </h1>
                </div>
                <p className={isLight ? "text-gray-600" : "text-gray-400"}>
                  Apply to join the ChatRealty Service Partner network. Complete
                  the form below to get started.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className={`mb-6 p-4 rounded-lg border ${
                    isLight
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-red-500/10 border-red-500/50 text-red-400"
                  }`}
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className={`backdrop-blur-sm rounded-2xl shadow-xl p-6 space-y-6 ${
                  isLight
                    ? "bg-white/80 border border-gray-200"
                    : "bg-gray-900/50 border border-gray-800"
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
                {/* Partner Type */}
                <div>
                  <label className={labelClass}>
                    Partner Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.partnerType}
                    onChange={(e) =>
                      handleChange("partnerType", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select your profession</option>
                    {PARTNER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(e) =>
                        handleChange("companyName", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
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
                    value={form.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className={inputClass}
                    placeholder="https://yourcompany.com"
                  />
                </div>

                {/* License Number & State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      License Number
                    </label>
                    <input
                      type="text"
                      value={form.licenseNumber}
                      onChange={(e) =>
                        handleChange("licenseNumber", e.target.value)
                      }
                      className={inputClass}
                      placeholder="License #"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      License State
                    </label>
                    <input
                      type="text"
                      value={form.licenseState}
                      onChange={(e) =>
                        handleChange("licenseState", e.target.value)
                      }
                      className={inputClass}
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                </div>

                {/* NMLS ID - conditional for Mortgage Broker */}
                {form.partnerType === "Mortgage Broker" && (
                  <div>
                    <label className={labelClass}>NMLS ID</label>
                    <input
                      type="text"
                      value={form.nmlsId}
                      onChange={(e) => handleChange("nmlsId", e.target.value)}
                      className={inputClass}
                      placeholder="NMLS #"
                    />
                  </div>
                )}

                {/* Bio */}
                <div>
                  <label className={labelClass}>Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    rows={3}
                    className={inputClass}
                    placeholder="Brief description of your services and experience..."
                  />
                </div>

                {/* Legal Disclaimer */}
                <div>
                  <label className={labelClass}>Legal Disclaimer</label>
                  <textarea
                    value={form.legalDisclaimer}
                    onChange={(e) =>
                      handleChange("legalDisclaimer", e.target.value)
                    }
                    rows={2}
                    className={inputClass}
                    placeholder="Any required legal disclosures for marketing materials..."
                  />
                  <p
                    className={`text-xs mt-1 ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    This will appear on co-marketing materials.
                  </p>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-8 py-3 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLight
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                        : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </SpaticalBackground>
  );
}
