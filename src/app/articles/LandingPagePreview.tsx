"use client";

import ReactMarkdown from "react-markdown";

interface LandingPagePreviewProps {
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  isLight: boolean;
  heroType: string;
  youtubeUrl: string;
  videoAutoplay: boolean;
  standalone: boolean;
  formEnabled: boolean;
  formHeading: string;
  formButtonText: string;
  formFields: any[];
}

export default function LandingPagePreview({
  title,
  excerpt,
  content,
  imageUrl,
  isLight,
  heroType,
  youtubeUrl,
  videoAutoplay,
  standalone,
  formEnabled,
  formHeading,
  formButtonText,
  formFields,
}: LandingPagePreviewProps) {
  const proseClasses = isLight
    ? "prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-a:text-blue-600 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-2 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:text-gray-600 prose-hr:border-gray-300"
    : "prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-white prose-a:text-emerald-400 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:my-2 prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:text-gray-400 prose-hr:border-gray-700";

  // Strip leading heading if it duplicates the title
  let cleanContent = content;
  if (content) {
    cleanContent = content.replace(/^#{1,3}\s*.+\n+/, (match) => {
      const headingText = match.replace(/^#{1,3}\s*/, "").trim();
      if (title && headingText.toLowerCase().includes(title.toLowerCase().substring(0, 20))) {
        return "";
      }
      return match;
    });
  }

  return (
    <div className={`min-h-screen ${isLight ? "bg-white" : "bg-gray-950"}`}>
      {/* Video Hero */}
      {heroType === "video" && youtubeUrl && (
        <div className="relative w-full">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={
                youtubeUrl
                  .replace("watch?v=", "embed/")
                  .replace("youtu.be/", "youtube.com/embed/") +
                `?autoplay=${videoAutoplay ? "1" : "0"}&mute=${videoAutoplay ? "1" : "0"}&controls=1&rel=0`
              }
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={title}
            />
          </div>
          <div className={`px-8 py-8 ${isLight ? "bg-white" : "bg-gray-950"}`}>
            <div className="max-w-4xl mx-auto">
              <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
                {title}
              </h1>
              {excerpt && (
                <p className={`text-lg ${isLight ? "text-gray-600" : "text-gray-400"}`}>{excerpt}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Hero */}
      {heroType !== "video" && imageUrl && (
        <div className="relative w-full h-[50vh] min-h-[400px]">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {title}
              </h1>
              {excerpt && (
                <p className="text-lg md:text-xl text-white/90 max-w-2xl">{excerpt}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No hero fallback */}
      {heroType !== "video" && !imageUrl && (
        <div className={`pt-16 pb-8 px-8 ${isLight ? "bg-gray-50" : "bg-gray-900"}`}>
          <div className="max-w-4xl mx-auto">
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
              {title}
            </h1>
            {excerpt && (
              <p className={`text-lg ${isLight ? "text-gray-600" : "text-gray-400"}`}>{excerpt}</p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        {cleanContent ? (
          <div className={proseClasses}>
            <ReactMarkdown>{cleanContent}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className={`text-lg ${isLight ? "text-gray-400" : "text-gray-500"}`}>
              Start writing to see your landing page preview...
            </p>
          </div>
        )}
      </div>

      {/* Form Preview */}
      {formEnabled && formFields.length > 0 && (
        <div className={`border-t ${isLight ? "border-gray-200" : "border-gray-800"}`}>
          <div className="max-w-2xl mx-auto px-6 md:px-8 py-16">
            <h2 className={`text-3xl font-bold text-center mb-8 ${isLight ? "text-gray-900" : "text-white"}`}>
              {formHeading}
            </h2>
            <div className="space-y-4">
              {formFields.map((field: any, idx: number) => {
                const inputCls = `w-full px-4 py-3 rounded-lg border text-sm ${
                  isLight ? "bg-gray-50 border-gray-300 text-gray-900" : "bg-gray-800 border-gray-700 text-white"
                }`;
                const labelCls = `block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`;
                const reqMark = field.required ? <span className="text-red-500 ml-1">*</span> : null;

                return (
                  <div key={idx}>
                    {/* Yes / No */}
                    {field.type === "yesno" && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <div className="flex gap-3 mt-1">
                          {["Yes", "No"].map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled
                              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 ${
                                isLight
                                  ? "border-gray-200 bg-white text-gray-600"
                                  : "border-gray-700 bg-gray-800 text-gray-400"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Radio */}
                    {field.type === "radio" && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <div className="flex flex-col gap-2 mt-1">
                          {(field.options || []).map((opt: string, oi: number) => (
                            <label key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                disabled
                                className={`w-4 h-4 ${isLight ? "accent-blue-600" : "accent-emerald-500"}`}
                              />
                              <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Checkbox with options or single toggle */}
                    {field.type === "checkbox" && (
                      <>
                        {field.options && field.options.length > 0 ? (
                          <>
                            <label className={labelCls}>{field.label}{reqMark}</label>
                            <div className="flex flex-col gap-2 mt-1">
                              {field.options.map((opt: string, oi: number) => (
                                <label key={oi} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    disabled
                                    className={`w-4 h-4 rounded ${isLight ? "accent-blue-600" : "accent-emerald-500"}`}
                                  />
                                  <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </>
                        ) : (
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              disabled
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
                        <select disabled className={inputCls}>
                          <option>Select...</option>
                          {(field.options || []).map((opt: string, oi: number) => (
                            <option key={oi}>{opt}</option>
                          ))}
                        </select>
                      </>
                    )}

                    {/* Textarea */}
                    {field.type === "textarea" && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <textarea rows={4} disabled className={inputCls} placeholder={field.label} />
                      </>
                    )}

                    {/* Standard inputs: text, email, tel, number */}
                    {!["checkbox", "radio", "select", "textarea", "yesno"].includes(field.type) && (
                      <>
                        <label className={labelCls}>{field.label}{reqMark}</label>
                        <input type={field.type} disabled className={inputCls} placeholder={field.label} />
                      </>
                    )}
                  </div>
                );
              })}
              <button
                disabled
                className={`w-full py-4 rounded-lg font-bold text-lg text-white ${
                  isLight ? "bg-blue-600" : "bg-emerald-600"
                }`}
              >
                {formButtonText}
              </button>
              <p className={`text-xs text-center ${isLight ? "text-gray-400" : "text-gray-600"}`}>
                Preview only — form submission disabled
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Standalone badge */}
      {standalone && (
        <div className={`text-center py-4 ${isLight ? "text-gray-400" : "text-gray-600"}`}>
          <p className="text-xs">
            Powered by <span className="font-medium">ChatRealty</span>
          </p>
        </div>
      )}
    </div>
  );
}
