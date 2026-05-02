"use client";

import { motion } from "framer-motion";
import { Post } from "@/types/post";
import Image from "next/image";
import { ReactNode, useState, useEffect } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { trackLead, trackViewContent } from "@/lib/meta-pixel";
import { trackGenerateLead } from "@/lib/google-ads";

interface LandingPageClientProps {
  post: Post;
  mdxContent: ReactNode;
}

export default function LandingPageClient({ post, mdxContent }: LandingPageClientProps) {
  const { currentTheme, setTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Apply theme override from CMS config on mount
  useEffect(() => {
    if (post.themeOverride && post.themeOverride !== currentTheme) {
      setTheme(post.themeOverride as "lightgradient" | "blackspace");
    }
    // Track landing page view
    trackViewContent({
      listingKey: post.slugId || "landing-page",
      address: post.title || "Landing Page",
      city: "landing_page",
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Agent email for form submission
  const [agentEmail, setAgentEmail] = useState("");

  useEffect(() => {
    if (post.formEnabled) {
      fetch("/api/agent/public")
        .then((res) => res.json())
        .then((data) => setAgentEmail(data.profile?.email || ""))
        .catch(() => {});
    }
  }, [post.formEnabled]);

  // Form state
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const formFields = post.formFields || [];
  const showForm = post.formEnabled && formFields.length > 0;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 pt-16 md:pt-0"
        >
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl ${
            isLight ? "text-gray-900" : "text-white"
          }`}>
            {post.title || "Untitled"}
          </h1>

          {post.description && (
            <p className={`text-lg max-w-2xl ${
              isLight ? "text-gray-600" : "text-gray-400"
            }`}>
              {post.description}
            </p>
          )}
        </motion.div>

        {/* Hero Image with Background Overlay */}
        {post.image && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`mb-12 rounded-2xl overflow-hidden border relative ${
              isLight ? "border-gray-300" : "border-gray-800"
            }`}
          >
            <div className="relative w-full aspect-[16/9]">
              <Image
                src={post.image}
                alt={post.altText || post.title || "Landing page hero"}
                fill
                className="object-cover"
                priority
              />
              {/* Subtle gradient overlay */}
              <div
                className={`absolute inset-0 ${
                  isLight
                    ? "bg-gradient-to-t from-white/40 to-transparent"
                    : "bg-gradient-to-t from-black/50 to-transparent"
                }`}
              />
            </div>
          </motion.div>
        )}

        {/* Fallback spacing when no image */}
        {!post.image && <div className="mb-8" />}

        {/* Article Content */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className={`rounded-2xl p-6 md:p-12 mb-12 ${
            isLight
              ? "bg-white/80 backdrop-blur-sm border border-gray-300 shadow-md"
              : "bg-gray-900/50 backdrop-blur-sm border border-gray-800"
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : {}}
        >
          <div className={`max-w-none ${
            isLight
              ? `prose prose-lg
                 prose-headings:text-gray-900
                 prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6
                 prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8
                 prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
                 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-700 hover:prose-a:underline
                 prose-strong:text-gray-900 prose-strong:font-semibold
                 prose-ul:text-gray-700 prose-ul:my-6
                 prose-ol:text-gray-700 prose-ol:my-6
                 prose-li:my-2
                 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
                 prose-code:text-blue-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                 prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-300 prose-pre:rounded-xl
                 prose-img:rounded-xl prose-img:border prose-img:border-gray-300
                 prose-hr:border-gray-300 prose-hr:my-8`
              : `prose prose-invert prose-lg
                 prose-headings:text-white
                 prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6
                 prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8
                 prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
                 prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 hover:prose-a:underline
                 prose-strong:text-white prose-strong:font-semibold
                 prose-ul:text-gray-300 prose-ul:my-6
                 prose-ol:text-gray-300 prose-ol:my-6
                 prose-li:my-2
                 prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400
                 prose-code:text-emerald-400 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-xl
                 prose-img:rounded-xl prose-img:border prose-img:border-gray-700
                 prose-hr:border-gray-700 prose-hr:my-8`
          }`}>
            {mdxContent}
          </div>
        </motion.article>

        {/* Lead Capture Form */}
        {showForm && !formSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className={`rounded-2xl p-6 md:p-12 mb-12 border ${
              isLight
                ? "bg-white/80 backdrop-blur-sm border-gray-300 shadow-md"
                : "bg-gray-900/50 backdrop-blur-sm border-gray-800"
            }`}
          >
            <h2 className={`text-3xl font-bold text-center mb-8 ${
              isLight ? "text-gray-900" : "text-white"
            }`}>
              {post.formHeading || "Get Started"}
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setFormSubmitting(true);
                setFormError("");

                const fields = formFields.map((f) => ({
                  id: f.id,
                  label: f.label,
                  type: f.type,
                  value: formValues[f.id] || "",
                }));

                const missing = formFields.filter(
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
                      campaignSlug: post.slugId,
                      campaignTitle: post.title,
                      fields,
                      recipients: post.formRecipients
                        ? post.formRecipients.split(",").map((e: string) => e.trim())
                        : [],
                      agentEmail,
                    }),
                  });

                  const data = await res.json();
                  if (data.success) {
                    setFormSubmitted(true);
                    trackLead({ contactType: `campaign_${post.slugId}` });
                    trackGenerateLead({ source: `campaign_${post.slugId}` });
                  } else {
                    setFormError(data.error || "Something went wrong");
                  }
                } catch {
                  setFormError("Failed to submit. Please try again.");
                } finally {
                  setFormSubmitting(false);
                }
              }}
              className="max-w-lg mx-auto space-y-4"
            >
              {formFields.map((field) => {
                const inputCls = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500 focus:border-emerald-500"
                }`;
                const labelCls = `block text-sm font-medium mb-1 ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`;
                const reqMark = field.required ? <span className="text-red-500 ml-1">*</span> : null;

                return (
                  <div key={field.id}>
                    {/* Yes / No toggle */}
                    {field.type === "yesno" && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <div className="flex gap-3 mt-1">
                          {["Yes", "No"].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setFormValues((prev) => ({ ...prev, [field.id]: val }))}
                              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                                formValues[field.id] === val
                                  ? isLight
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-emerald-500 bg-emerald-950/30 text-emerald-400"
                                  : isLight
                                    ? "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Radio buttons */}
                    {field.type === "radio" && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <div className="flex flex-col gap-2 mt-1">
                          {(field.options || []).map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                value={opt}
                                checked={formValues[field.id] === opt}
                                onChange={() => setFormValues((prev) => ({ ...prev, [field.id]: opt }))}
                                required={field.required}
                                className={`w-4 h-4 ${isLight ? "accent-blue-600" : "accent-emerald-500"}`}
                              />
                              <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Checkbox with options (multi-select) or single toggle */}
                    {field.type === "checkbox" && (
                      <>
                        {field.options && field.options.length > 0 ? (
                          <>
                            <label className={labelCls}>{field.label}{reqMark}</label>
                            <div className="flex flex-col gap-2 mt-1">
                              {field.options.map((opt) => {
                                const selected = (formValues[field.id] || "").split("||");
                                const isChecked = selected.includes(opt);
                                return (
                                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        const next = isChecked
                                          ? selected.filter((v) => v !== opt)
                                          : [...selected, opt];
                                        setFormValues((prev) => ({
                                          ...prev,
                                          [field.id]: next.filter(Boolean).join("||"),
                                        }));
                                      }}
                                      className={`w-4 h-4 rounded ${isLight ? "accent-blue-600" : "accent-emerald-500"}`}
                                    />
                                    <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        ) : (
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
                              {field.label}{reqMark}
                            </span>
                          </label>
                        )}
                      </>
                    )}

                    {/* Dropdown / Select */}
                    {field.type === "select" && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <select
                          value={formValues[field.id] || ""}
                          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          required={field.required}
                          className={inputCls}
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </>
                    )}

                    {/* Textarea */}
                    {field.type === "textarea" && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <textarea
                          value={formValues[field.id] || ""}
                          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          required={field.required}
                          rows={4}
                          className={inputCls}
                        />
                      </>
                    )}

                    {/* Standard inputs: text, email, tel, number */}
                    {!["checkbox", "radio", "select", "textarea", "yesno"].includes(field.type) && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <input
                          type={field.type}
                          value={formValues[field.id] || ""}
                          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          required={field.required}
                          className={inputCls}
                        />
                      </>
                    )}
                  </div>
                );
              })}

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
                {formSubmitting ? "Submitting..." : (post.formButtonText || "Submit")}
              </button>

              <p className={`text-xs text-center ${isLight ? "text-gray-400" : "text-gray-600"}`}>
                By submitting, you agree to our{" "}
                <a href="https://chatrealty.io/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">terms of service</a>
                {" "}and{" "}
                <a href="https://chatrealty.io/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">privacy policy</a>.
              </p>
            </form>
          </motion.div>
        )}

        {/* Form Success State */}
        {formSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`rounded-2xl p-6 md:p-12 mb-12 border text-center ${
              isLight
                ? "bg-white/80 backdrop-blur-sm border-gray-300 shadow-md"
                : "bg-gray-900/50 backdrop-blur-sm border-gray-800"
            }`}
          >
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
          </motion.div>
        )}

        {/* Disclaimer — shown between form and footer */}
        {post.formDisclaimer && (
          <div className={`text-[9px] leading-snug text-center px-4 mb-8 ${isLight ? "text-gray-400" : "text-gray-600"}`}>
            {post.formDisclaimer}
          </div>
        )}
      </div>

    </div>
  );
}
