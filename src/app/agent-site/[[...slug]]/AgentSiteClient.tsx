"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface AgentSiteClientProps {
  agent: {
    name: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    brokerageName?: string;
  };
  profile?: {
    headshot?: string;
    heroPhoto?: string;
    headline?: string;
    tagline?: string;
    cellPhone?: string;
    officePhone?: string;
    brandColors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
  };
  hasActiveSubscription: boolean;
  isAdmin?: boolean;
  agentEmail?: string;
}

export default function AgentSiteClient({
  agent,
  profile,
  hasActiveSubscription,
  isAdmin,
  agentEmail,
}: AgentSiteClientProps) {
  const { textPrimary, textSecondary, textMuted, cardBg, border, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const primaryColor = profile?.brandColors?.primary || "#1e3a5f";
  const contactPhone = profile?.cellPhone || profile?.officePhone || agent.phone;

  // Admins bypass the subscription gate — they always see the full page
  const showFullPage = hasActiveSubscription || isAdmin;

  // ----- Coming Soon (no subscription, not admin) ----- //
  if (!showFullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-bold ${
              isLight
                ? "bg-gray-200 text-gray-500"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {agent.name?.charAt(0) || "?"}
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{agent.name}</h1>
          {agent.brokerageName && (
            <p className={textSecondary}>{agent.brokerageName}</p>
          )}
          <div
            className={`${cardBg} rounded-xl shadow-sm border ${border} p-6 space-y-3`}
          >
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              Coming Soon
            </h2>
            <p className={`${textSecondary} text-sm leading-relaxed`}>
              {agent.name}&apos;s real estate site is under construction. Check
              back soon for listings, market insights, and more.
            </p>
          </div>
          <p className={`text-xs ${textMuted}`}>
            Powered by{" "}
            <a
              href="https://chatrealty.io"
              className={`underline ${
                isLight ? "hover:text-gray-600" : "hover:text-gray-300"
              }`}
            >
              ChatRealty
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Check if profile is mostly empty (needs setup)
  const needsSetup =
    !profile?.headshot && !profile?.heroPhoto && !profile?.headline;

  // ----- Active subscription — branded page ----- //
  return (
    <div className="min-h-screen">
      {/* Admin banner */}
      {isAdmin && (
        <div className="bg-amber-500 text-black px-4 py-2 text-sm font-medium flex items-center justify-between z-50 relative">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>
              Admin view — {agent.name}{agentEmail ? ` (${agentEmail})` : ""}
              {!hasActiveSubscription && " — No active subscription"}
            </span>
          </div>
          <a
            href="/admin"
            className="px-3 py-1 bg-black/20 hover:bg-black/30 rounded text-xs font-semibold transition-colors"
          >
            Back to Admin
          </a>
        </div>
      )}

      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center text-white"
        style={{
          minHeight: needsSetup ? "60vh" : "70vh",
          background: profile?.heroPhoto
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${profile.heroPhoto}) center/cover no-repeat`
            : `linear-gradient(135deg, ${primaryColor} 0%, ${isLight ? "#374151" : "#111827"} 100%)`,
        }}
      >
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto space-y-6">
          {profile?.headshot ? (
            <img
              src={profile.headshot}
              alt={agent.name || "Agent headshot"}
              className="w-32 h-32 rounded-full mx-auto border-4 border-white/80 object-cover shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 rounded-full mx-auto border-4 border-white/30 bg-white/10 flex items-center justify-center text-5xl font-bold text-white/60">
              {agent.name?.charAt(0) || "?"}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-md">
            {agent.name}
          </h1>

          {agent.brokerageName && (
            <p className="text-lg opacity-90">{agent.brokerageName}</p>
          )}

          {agent.licenseNumber && (
            <p className="text-sm opacity-70">DRE #{agent.licenseNumber}</p>
          )}

          {profile?.headline ? (
            <h2 className="text-2xl md:text-3xl font-light mt-2">
              {profile.headline}
            </h2>
          ) : needsSetup ? (
            <p className="text-lg opacity-60 italic">
              Complete your agent profile to customize this page
            </p>
          ) : null}

          {profile?.tagline && (
            <p className="text-lg opacity-80 max-w-xl mx-auto">
              {profile.tagline}
            </p>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {contactPhone && (
              <a
                href={`tel:${contactPhone.replace(/\D/g, "")}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                style={{ color: primaryColor }}
              >
                <PhoneIcon />
                {contactPhone}
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full border-2 border-white/80 font-semibold hover:bg-white/10 transition-colors"
              >
                <EmailIcon />
                Email Me
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Setup prompt */}
      {needsSetup && (
        <section className="py-12 px-4">
          <div className="max-w-lg mx-auto text-center space-y-4">
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                isLight ? "bg-blue-100" : "bg-blue-900/40"
              }`}
            >
              <svg
                className={`w-8 h-8 ${isLight ? "text-blue-600" : "text-blue-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className={`text-xl font-semibold ${textPrimary}`}>
              Customize Your Site
            </h2>
            <p className={textSecondary}>
              Upload your headshot, add a hero photo, write a headline, and set
              your brand colors to make this page your own.
            </p>
            <p className={`text-sm ${textMuted}`}>
              Go to Agent Dashboard &rarr; Settings &rarr; Branding to get
              started.
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        className={`py-8 text-center text-sm border-t ${
          isLight
            ? "text-gray-400 border-gray-200"
            : "text-gray-500 border-gray-800"
        }`}
      >
        <p>
          &copy; {new Date().getFullYear()} {agent.name}. All rights reserved.
        </p>
        <p className="mt-1">
          Powered by{" "}
          <a
            href="https://chatrealty.io"
            className={`underline ${
              isLight ? "hover:text-gray-600" : "hover:text-gray-300"
            }`}
          >
            ChatRealty
          </a>
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
