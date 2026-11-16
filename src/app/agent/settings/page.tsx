"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import AgentNav from "@/app/components/AgentNav";
import SettingsSidebar from "./components/SettingsSidebar";

// First-run setup is the conversational /agent/setup (the form wizard that
// used to live here was removed 2026-11-04). This page is the editor only.
function SettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          setProfileData({
            name: p.name || "",
            email: p.email || "",
            phone: p.phone || "",
            image: p.image || "",
            brokerageName: p.brokerageName || "",
            licenseNumber: p.licenseNumber || "",
            profileDescription: p.profileDescription || "",
            agentProfile: p.agentProfile || {},
            calendarSettings: p.calendarSettings || {},
            adAccounts: p.adAccounts || {},
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className={`mt-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const user = session?.user as any;
  if (!user?.roles?.includes("realEstateAgent")) {
    router.push("/");
    return null;
  }
  const agentTier = user?.agentTier || "free";
  const isAdmin = !!user?.isAdmin;

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className={isLight ? "text-gray-600" : "text-gray-400"}>
          Failed to load profile data.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-hidden pt-16 md:pt-0 md:py-4 md:py-8">
        {/* Agent Navigation */}
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header */}
        <div className="mb-6 flex-shrink-0 px-4 md:px-6">
          <h1
            className={`text-2xl sm:text-3xl font-bold mb-2 ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            Agent Settings
          </h1>
          <p
            className={`text-sm ${
              isLight ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Manage your profile, branding, and website settings.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 px-4 md:px-6">
          <SettingsSidebar
            initialData={profileData}
            tier={agentTier}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}

export default function AgentSettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
