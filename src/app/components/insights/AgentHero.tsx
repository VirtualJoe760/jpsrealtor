"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { MessageCircle, MapPin, Phone, LogIn, UserPlus, Search } from "lucide-react";

interface AgentHeroProps {
  agentProfile: any;
}

const AgentHero: React.FC<AgentHeroProps> = ({ agentProfile }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [imageLoaded, setImageLoaded] = useState(false);
  const [headshotLoaded, setHeadshotLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use heroImage as primary background, fallback chain for all possible photo fields
  const heroImage = agentProfile?.agentProfile?.heroImage ||
                    agentProfile?.agentProfile?.heroPhoto ||
                    agentProfile?.agentProfile?.insightsBannerImage ||
                    agentProfile?.agentProfile?.coverPhoto ||
                    agentProfile?.agentProfile?.galleryPhotos?.[0];

  // Use custom hero headline if available, otherwise use default
  const heroHeadline = agentProfile?.agentProfile?.heroHeadline ||
                       "Your next property,<br />intelligently matched.";

  // Show loading skeleton if no profile data yet
  if (!agentProfile) {
    return (
      <section className="relative w-full overflow-hidden pt-0 md:pt-16 pb-0 md:pb-16 px-0 md:px-4">
        <div className="w-full md:max-w-7xl md:mx-auto">
          <div
            className="relative overflow-hidden rounded-none md:rounded-2xl h-[100vh] md:h-[70vh] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 animate-pulse"
            style={{ minHeight: "500px", maxHeight: "none" }}
          >
            {/* Skeleton - Conditional Rendering for Mobile vs Desktop */}
            {isMobile ? (
              /* Mobile Skeleton */
              <div className="relative z-10 h-full flex flex-col">
                {/* Skeleton headline and buttons */}
                <div className="px-6 pt-10">
                  <div className="space-y-4 mb-4">
                    <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-3/4"></div>
                    <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-2/3"></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                    <div className="flex-1 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                </div>

                {/* Skeleton bottom: business card left */}
                <div className="mt-auto flex items-end pb-16 px-6">
                  <div className="flex flex-col gap-1">
                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-40"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
                    <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-700 my-0.5"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-28"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop Skeleton */
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex-1 flex flex-col justify-center w-full">
                  <div className="px-12 lg:px-16 xl:px-24 max-w-7xl w-full">
                    {/* Skeleton headline */}
                    <div className="space-y-4 mb-12">
                      <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded-lg w-3/4 max-w-2xl"></div>
                      <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded-lg w-2/3 max-w-xl"></div>
                    </div>

                    {/* Skeleton buttons */}
                    <div className="flex flex-row gap-5">
                      <div className="h-14 bg-gray-300 dark:bg-gray-700 rounded-xl w-32"></div>
                      <div className="h-14 bg-gray-300 dark:bg-gray-700 rounded-xl w-32"></div>
                      <div className="h-14 bg-gray-300 dark:bg-gray-700 rounded-xl w-32"></div>
                    </div>
                  </div>
                </div>

                {/* Skeleton business card - bottom left */}
                <div className="absolute bottom-0 left-0 right-0 pb-12 px-12 lg:px-16 xl:px-24 flex items-end">
                  <div className="flex flex-col gap-2 pb-8">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-36"></div>
                    <div className="w-20 h-0.5 bg-gray-300 dark:bg-gray-700 my-1"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-40"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  const handleCreateAccount = () => {
    router.push("/auth/signin");
  };

  const handleChat = () => {
    router.push("/chap");
  };

  const handleMapSearch = () => {
    router.push("/chap?view=map");
  };

  return (
    <section
      className="relative w-full overflow-hidden pt-0 md:pt-16 pb-0 md:pb-16 px-0 md:px-4"
    >
      {/* Container matching other sections */}
      <div className="w-full md:max-w-7xl md:mx-auto">
        <div
          className={`relative overflow-hidden rounded-none md:rounded-2xl transition-opacity duration-700 ${isMobile ? 'h-[65vh]' : 'h-[70vh]'}`}
          style={{
            minHeight: "500px",
            maxHeight: "none",
            opacity: imageLoaded || !heroImage ? 1 : 0.5
          }}
        >
          {/* Hero Background Image */}
          {heroImage ? (
            <div className="absolute inset-0">
              {/* Loading placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 animate-pulse" />
              )}
              <img
                src={heroImage}
                alt="Hero background"
                className={`w-full h-full object-cover transition-opacity duration-1000 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
              {/* Darker gradient overlay + vignette for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
              {/* Vignette effect */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.7) 100%)'
                }}
              />
            </div>
          ) : (
            // Fallback gradient background
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800" />
          )}

          {/* Content Container - Conditional Rendering for Mobile vs Desktop */}
          {isMobile ? (
            /* ============================================
               MOBILE LAYOUT
               ============================================ */
            <div className="relative z-10 h-full flex flex-col">
              {/* Top Right Team Logo */}
              {agentProfile?.agentProfile?.teamLogo && (
                <div className="absolute top-6 right-6 z-20">
                  <img
                    src={agentProfile.agentProfile.teamLogo}
                    alt="Team Logo"
                    className="h-16 w-auto object-contain brightness-0 invert opacity-95"
                  />
                </div>
              )}

              {/* Top section: Headline + Buttons - centered in top half */}
              <div
                className="flex-1 flex flex-col justify-center px-6 pt-12 z-10 transition-opacity duration-700"
                style={{ opacity: imageLoaded || !heroImage ? 1 : 0, maxHeight: '50%' }}
              >
                <h1
                  className="text-3xl font-serif text-white mb-4 leading-tight"
                  style={{
                    fontFamily: 'Georgia, serif',
                    textShadow: '2px 2px 12px rgba(0,0,0,0.9)'
                  }}
                  dangerouslySetInnerHTML={{ __html: heroHeadline }}
                />

                {/* CTA Buttons */}
                <div className="flex gap-3">
                  {session ? (
                    <button
                      onClick={handleChat}
                      className={`group flex-1 px-6 py-3 backdrop-blur-sm border-2 text-white text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                        isLight
                          ? "bg-blue-600/90 hover:bg-blue-700/90 border-blue-500/50"
                          : "bg-emerald-600/90 hover:bg-emerald-700/90 border-emerald-500/50"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateAccount}
                      className={`group flex-1 px-6 py-3 backdrop-blur-sm border-2 text-white text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                        isLight
                          ? "bg-blue-600/90 hover:bg-blue-700/90 border-blue-500/50"
                          : "bg-emerald-600/90 hover:bg-emerald-700/90 border-emerald-500/50"
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Create Free Account</span>
                    </button>
                  )}

                  <button
                    onClick={handleMapSearch}
                    className="group flex-1 px-6 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 hover:border-white/50 text-white text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Search className="w-4 h-4" />
                    <span>Map Search</span>
                  </button>
                </div>
              </div>

              {/* Bottom section: Business card left + Headshot right */}
              <div className="mt-auto flex items-end pb-16">
                {/* Business Card - Left side */}
                <div
                  className="px-6 z-30 transition-opacity duration-700 flex-shrink-0"
                  style={{ opacity: imageLoaded || !heroImage ? 1 : 0, maxWidth: '55%' }}
                >
                  <div className="flex flex-col gap-1.5 text-white">
                    {agentProfile?.name && (
                      <div className="text-lg font-bold tracking-wide" style={{ textShadow: '1px 1px 8px rgba(0,0,0,0.8)' }}>
                        {agentProfile.name}
                      </div>
                    )}
                    {(agentProfile?.brokerageName || agentProfile?.agentProfile?.brokerageName) && (
                      <div className="text-sm font-medium opacity-90" style={{ textShadow: '1px 1px 6px rgba(0,0,0,0.8)' }}>
                        {agentProfile.brokerageName || agentProfile.agentProfile.brokerageName}
                      </div>
                    )}
                    <div className="w-14 h-0.5 bg-white/50 my-0.5"></div>
                    {(agentProfile?.licenseNumber || agentProfile?.agentProfile?.licenseNumber) && (
                      <div className="text-sm font-medium" style={{ textShadow: '1px 1px 6px rgba(0,0,0,0.8)' }}>
                        DRE# {agentProfile.licenseNumber || agentProfile.agentProfile.licenseNumber}
                      </div>
                    )}
                    {(agentProfile?.phone || agentProfile?.agentProfile?.phone) && (
                      <div className="flex items-center gap-1.5 text-sm" style={{ textShadow: '1px 1px 6px rgba(0,0,0,0.8)' }}>
                        <Phone className="w-3.5 h-3.5" />
                        <span>{agentProfile.phone || agentProfile.agentProfile.phone}</span>
                      </div>
                    )}
                    {agentProfile?.email && (
                      <div className="text-sm" style={{ textShadow: '1px 1px 6px rgba(0,0,0,0.8)' }}>{agentProfile.email}</div>
                    )}
                  </div>
                </div>

                {/* Headshot - Bottom right */}
                {(agentProfile?.agentProfile?.headshot || agentProfile?.agentProfile?.profilePhoto) && (
                  <div
                    className="flex-1 flex justify-end pointer-events-none z-20 overflow-hidden"
                    style={{ height: '35vh', marginBottom: '-64px', marginRight: '-8px' }}
                  >
                    {!headshotLoaded && (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
                    )}
                    <img
                      src={agentProfile.agentProfile.headshot || agentProfile.agentProfile.profilePhoto}
                      alt={agentProfile.name}
                      className={`h-full w-auto object-contain transition-opacity duration-1000 ${
                        headshotLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{ objectPosition: "right bottom" }}
                      onLoad={() => setHeadshotLoaded(true)}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================
               DESKTOP LAYOUT
               ============================================ */
            <div className="relative z-10 h-full flex flex-col">
              {/* Top Right Team Logo */}
              {agentProfile?.agentProfile?.teamLogo && (
                <div className="absolute top-12 right-12 z-20">
                  <img
                    src={agentProfile.agentProfile.teamLogo}
                    alt="Team Logo"
                    className="h-28 w-auto object-contain brightness-0 invert opacity-95"
                  />
                </div>
              )}

              {/* Headline, Buttons, and Business Card - stacked with spacing */}
              <div className="flex-1 flex flex-col justify-center w-full">
                <div className="px-12 lg:px-16 xl:px-24 max-w-7xl w-full">
                  <h1
                    className="text-5xl lg:text-6xl xl:text-7xl font-serif text-white mb-8 leading-tight transition-opacity duration-700"
                    style={{
                      fontFamily: 'Georgia, serif',
                      opacity: imageLoaded || !heroImage ? 1 : 0,
                      textShadow: '2px 2px 12px rgba(0,0,0,0.9)'
                    }}
                    dangerouslySetInnerHTML={{ __html: heroHeadline }}
                  />

                  {/* CTA Buttons - Chat/Create Account and Map Search */}
                  <div
                    className="flex flex-row gap-5 transition-opacity duration-700"
                    style={{ opacity: imageLoaded || !heroImage ? 1 : 0 }}
                  >
                    {session ? (
                      <button
                        onClick={handleChat}
                        className={`group relative px-10 py-4 backdrop-blur-sm border-2 text-white text-lg font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
                          isLight
                            ? "bg-blue-600/90 hover:bg-blue-700/90 border-blue-500/50"
                            : "bg-emerald-600/90 hover:bg-emerald-700/90 border-emerald-500/50"
                        }`}
                      >
                        <MessageCircle className="w-6 h-6" />
                        <span>Chat</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleCreateAccount}
                        className={`group relative px-10 py-4 backdrop-blur-sm border-2 text-white text-lg font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
                          isLight
                            ? "bg-blue-600/90 hover:bg-blue-700/90 border-blue-500/50"
                            : "bg-emerald-600/90 hover:bg-emerald-700/90 border-emerald-500/50"
                        }`}
                      >
                        <UserPlus className="w-6 h-6" />
                        <span>Create Free Account</span>
                      </button>
                    )}

                    <button
                      onClick={handleMapSearch}
                      className="group relative px-10 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 hover:border-white/50 text-white text-lg font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      <Search className="w-6 h-6" />
                      <span>Map Search</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Business Card - absolute bottom-left, large screens only */}
              <div className="absolute bottom-0 left-0 pb-8 px-12 lg:px-16 xl:px-24 z-30">
                <div className="flex flex-col gap-1.5 text-white" style={{ maxWidth: '400px' }}>
                  {agentProfile?.name && (
                    <div className="text-2xl font-bold tracking-wide">
                      {agentProfile.name}
                    </div>
                  )}
                  {(agentProfile?.brokerageName || agentProfile?.agentProfile?.brokerageName) && (
                    <div className="text-base font-medium opacity-90">
                      {agentProfile.brokerageName || agentProfile.agentProfile.brokerageName}
                    </div>
                  )}
                  <div className="w-20 h-0.5 bg-white/50 my-1"></div>
                  {(agentProfile?.licenseNumber || agentProfile?.agentProfile?.licenseNumber) && (
                    <div className="text-sm font-medium">
                      DRE# {agentProfile.licenseNumber || agentProfile.agentProfile.licenseNumber}
                    </div>
                  )}
                  {(agentProfile?.phone || agentProfile?.agentProfile?.phone) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4" />
                      <span>{agentProfile.phone || agentProfile.agentProfile.phone}</span>
                    </div>
                  )}
                  {agentProfile?.email && (
                    <div className="text-sm opacity-80">{agentProfile.email}</div>
                  )}
                </div>
              </div>

              {/* Headshot - Right side offset */}
              {(agentProfile?.agentProfile?.headshot || agentProfile?.agentProfile?.profilePhoto) && (
                <div
                  className="absolute bottom-0 overflow-hidden pointer-events-none"
                  style={{
                    right: '-5%',
                    height: "70%",
                    maxHeight: "700px",
                    width: '50%'
                  }}
                >
                  <img
                    src={agentProfile.agentProfile.headshot || agentProfile.agentProfile.profilePhoto}
                    alt={agentProfile.name}
                    className={`h-full w-auto object-cover transition-opacity duration-1000 ${
                      headshotLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      objectPosition: "center bottom",
                      marginLeft: 'auto'
                    }}
                    onLoad={() => setHeadshotLoaded(true)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AgentHero;
