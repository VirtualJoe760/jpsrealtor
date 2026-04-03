// src/app/campaign/[slug]/CampaignPageClient.tsx
"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

interface CampaignPage {
  title: string;
  excerpt: string;
  content: string;
  image: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  keywords: string[];
  date: string;
  standalone: boolean;
  heroType: "photo" | "video";
  youtubeUrl: string;
  videoAutoplay: boolean;
  formEnabled: boolean;
  formHeading: string;
  formFields: FormField[];
  formRecipients: string;
  formButtonText: string;
}

interface AgentProfile {
  name: string;
  email: string;
  phone: string;
  agentProfile?: {
    headshot?: string;
    profilePhoto?: string;
    brokerageName?: string;
    licenseNumber?: string;
    teamLogo?: string;
  };
}

export default function CampaignPageClient({ page }: { page: CampaignPage }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("/api/agent/public")
      .then((res) => res.json())
      .then((data) => setAgentProfile(data.profile))
      .catch(() => {});
  }, []);

  // Apply agent font
  useEffect(() => {
    if (agentProfile?.agentProfile) {
      const font = (agentProfile.agentProfile as any).fontFamily;
      if (font) {
        document.body.style.fontFamily = `'${font}', sans-serif`;
      }
    }
  }, [agentProfile]);

  return (
    <div className={`min-h-screen ${isLight ? "bg-white" : "bg-gray-950"}`}>
      {/* Video Hero */}
      {page.heroType === "video" && page.youtubeUrl && (
        <div className="relative w-full">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={page.youtubeUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/") + `?autoplay=${page.videoAutoplay ? "1" : "0"}&mute=${page.videoAutoplay ? "1" : "0"}&loop=1&controls=1&showinfo=0&rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={page.title}
            />
          </div>
          <div className={`px-8 py-8 ${isLight ? "bg-white" : "bg-gray-950"}`}>
            <div className="max-w-4xl mx-auto">
              <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
                {page.title}
              </h1>
              {page.excerpt && (
                <p className={`text-lg ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  {page.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Hero */}
      {page.heroType !== "video" && page.image && (
        <div className="relative w-full h-[50vh] min-h-[400px]">
          <Image
            src={page.image}
            alt={page.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {page.title}
              </h1>
              {page.excerpt && (
                <p className="text-lg md:text-xl text-white/90 max-w-2xl">
                  {page.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No hero fallback */}
      {page.heroType !== "video" && !page.image && (
        <div className={`pt-20 pb-12 px-8 ${isLight ? "bg-gray-50" : "bg-gray-900"}`}>
          <div className="max-w-4xl mx-auto">
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
              {page.title}
            </h1>
            {page.excerpt && (
              <p className={`text-lg ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                {page.excerpt}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        <article
          className={`prose prose-lg max-w-none ${
            isLight
              ? "prose-gray"
              : "prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-emerald-400"
          }`}
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>

      {/* Lead Capture Form */}
      {page.formEnabled && page.formFields.length > 0 && !formSubmitted && (
        <div className={`border-t ${isLight ? "border-gray-200" : "border-gray-800"}`}>
          <div className="max-w-2xl mx-auto px-6 md:px-8 py-16">
            <h2 className={`text-3xl font-bold text-center mb-8 ${isLight ? "text-gray-900" : "text-white"}`}>
              {page.formHeading}
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setFormSubmitting(true);
                setFormError("");

                const fields = page.formFields.map((f) => ({
                  id: f.id,
                  label: f.label,
                  type: f.type,
                  value: formValues[f.id] || "",
                }));

                // Validate required fields
                const missing = page.formFields.filter(
                  (f) => f.required && !formValues[f.id]?.trim()
                );
                if (missing.length > 0) {
                  setFormError(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
                  setFormSubmitting(false);
                  return;
                }

                try {
                  const res = await fetch("/api/campaign/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      campaignSlug: window.location.pathname.split("/").pop(),
                      campaignTitle: page.title,
                      fields,
                      recipients: page.formRecipients
                        ? page.formRecipients.split(",").map((e: string) => e.trim())
                        : [],
                      agentEmail: agentProfile?.email,
                    }),
                  });

                  const data = await res.json();

                  if (data.success) {
                    setFormSubmitted(true);
                  } else {
                    setFormError(data.error || "Something went wrong");
                  }
                } catch {
                  setFormError("Failed to submit. Please try again.");
                } finally {
                  setFormSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              {page.formFields.map((field) => (
                <div key={field.id}>
                  {field.type === "checkbox" ? (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formValues[field.id] === "true"}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [field.id]: e.target.checked ? "true" : "false" }))
                        }
                        required={field.required}
                        className={`mt-1 w-5 h-5 rounded ${isLight ? "accent-blue-600" : "accent-emerald-500"}`}
                      />
                      <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </label>
                  ) : (
                    <>
                  <label className={`block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={formValues[field.id] || ""}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      required={field.required}
                      rows={4}
                      className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                        isLight
                          ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                          : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500 focus:border-emerald-500"
                      }`}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formValues[field.id] || ""}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      required={field.required}
                      className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                        isLight
                          ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                          : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500 focus:border-emerald-500"
                      }`}
                    />
                  )}
                    </>
                  )}
                </div>
              ))}

              {formError && (
                <p className="text-red-500 text-sm">{formError}</p>
              )}

              <button
                type="submit"
                disabled={formSubmitting}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {formSubmitting ? "Submitting..." : page.formButtonText}
              </button>

              <p className={`text-xs text-center ${isLight ? "text-gray-400" : "text-gray-600"}`}>
                By submitting, you agree to our terms of service and privacy policy.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Form Success State */}
      {formSubmitted && (
        <div className={`border-t ${isLight ? "border-gray-200" : "border-gray-800"}`}>
          <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
              isLight ? "bg-green-100" : "bg-green-900/30"
            }`}>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
              Thank You!
            </h2>
            <p className={`text-lg ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Your information has been submitted. Check your email to verify your account.
            </p>
          </div>
        </div>
      )}

      {/* Agent CTA Footer — hidden on standalone pages */}
      {agentProfile && !page.standalone && (
        <div className={`border-t ${isLight ? "border-gray-200 bg-gray-50" : "border-gray-800 bg-gray-900"}`}>
          <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Agent Photo */}
              {(agentProfile.agentProfile?.headshot || agentProfile.agentProfile?.profilePhoto) && (
                <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={agentProfile.agentProfile.headshot || agentProfile.agentProfile.profilePhoto || ""}
                    alt={agentProfile.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Agent Info */}
              <div className="flex-1 text-center md:text-left">
                <p className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {agentProfile.name}
                </p>
                {agentProfile.agentProfile?.brokerageName && (
                  <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                    {agentProfile.agentProfile.brokerageName}
                  </p>
                )}
                {agentProfile.agentProfile?.licenseNumber && (
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                    DRE# {agentProfile.agentProfile.licenseNumber}
                  </p>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                {agentProfile.phone && (
                  <a
                    href={`tel:${agentProfile.phone}`}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      isLight
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    Call Now
                  </a>
                )}
                <Link
                  href="/chap"
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isLight
                      ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
                >
                  Chat with AI
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Powered by ChatRealty — only on standalone pages */}
      {page.standalone && (
        <div className={`text-center py-4 ${isLight ? "text-gray-400" : "text-gray-600"}`}>
          <p className="text-xs">
            Powered by <span className="font-medium">ChatRealty</span>
          </p>
        </div>
      )}
    </div>
  );
}
