"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AgentNav from "@/app/components/AgentNav";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  Briefcase,
  Users,
  TrendingUp,
  FileCheck,
  User as UserIcon,
  Phone,
  Building2,
  CreditCard,
  Settings,
  Mail,
  Eye,
} from "lucide-react";
import PointsSection from "./components/PointsSection";
import PartnershipsSection from "./components/PartnershipsSection";

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Agent profile state (read-only on dashboard)
  const [agentProfile, setAgentProfile] = useState({
    name: "",
    email: "",
    phone: "",
    brokerageName: "",
    licenseNumber: "",
    profileDescription: "",
    image: "",
    team: null as { name: string; description?: string } | null,
    isTeamLeader: false,
    agentProfile: null as any,
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Fetch agent profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          const user = session?.user as any;

          setAgentProfile({
            name: data.profile.name || user?.name || "",
            email: data.profile.email || user?.email || "",
            phone: data.profile.phone || "",
            brokerageName: data.profile.brokerageName || "",
            licenseNumber: data.profile.licenseNumber || "",
            profileDescription: data.profile.profileDescription || "",
            image: data.profile.image || user?.image || "",
            team: data.profile.team || null,
            isTeamLeader: data.profile.isTeamLeader || false,
            agentProfile: data.profile.agentProfile || null,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (status === "authenticated" && session) {
      fetchProfile();
    }
  }, [status, session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className={`mt-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Loading...
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
  const isAgent = user?.roles?.includes("realEstateAgent");

  if (!isAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2
            className={`text-2xl font-bold mb-2 ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            Access Denied
          </h2>
          <p className={`${isLight ? "text-gray-600" : "text-gray-400"}`}>
            You must be a real estate agent to access this page.
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Active Clients",
      value: "0",
      icon: Briefcase,
      color: isLight ? "text-blue-600" : "text-blue-400",
      bgColor: isLight ? "bg-blue-100" : "bg-blue-900/30",
    },
    {
      label: "Team Members",
      value: user?.isTeamLeader ? "1" : "N/A",
      icon: Users,
      color: isLight ? "text-green-600" : "text-green-400",
      bgColor: isLight ? "bg-green-100" : "bg-green-900/30",
    },
    {
      label: "Pending Applications",
      value: user?.isTeamLeader ? "0" : "N/A",
      icon: FileCheck,
      color: isLight ? "text-purple-600" : "text-purple-400",
      bgColor: isLight ? "bg-purple-100" : "bg-purple-900/30",
    },
    {
      label: "Monthly Performance",
      value: "N/A",
      icon: TrendingUp,
      color: isLight ? "text-orange-600" : "text-orange-400",
      bgColor: isLight ? "bg-orange-100" : "bg-orange-900/30",
    },
  ];

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
            Agent Dashboard
          </h1>
          <p
            className={`text-sm sm:text-base ${
              isLight ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Welcome back, {user?.name || user?.email}
          </p>
          {user?.isTeamLeader && (
            <p
              className={`text-sm mt-1 ${
                isLight ? "text-blue-600" : "text-blue-400"
              }`}
            >
              Team Leader
            </p>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 px-4 md:px-6">
          {/* Agent Profile Card (read-only) */}
          {!isLoadingProfile && (
            <div
              className={`rounded-xl p-4 sm:p-6 mb-8 relative ${
                isLight
                  ? "bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-lg"
                  : "bg-gradient-to-r from-slate-900/50 to-slate-800/50 shadow-lg shadow-blue-500/20"
              }`}
            >
              {/* Action Icons */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={() => router.push("/agent/profile")}
                  className={`p-2 rounded-lg transition-all ${
                    isLight
                      ? "hover:bg-gray-100 text-gray-700"
                      : "hover:bg-slate-700 text-gray-300"
                  }`}
                  aria-label="View Profile"
                >
                  <Eye className="w-6 h-6" />
                </button>
                <button
                  onClick={() => router.push("/agent/settings")}
                  className={`p-2 rounded-lg transition-all ${
                    isLight
                      ? "hover:bg-gray-100 text-gray-700"
                      : "hover:bg-slate-700 text-gray-300"
                  }`}
                  aria-label="Edit Settings"
                >
                  <Settings className="w-6 h-6" />
                </button>
              </div>

              {/* Name and Email */}
              <div className="mb-3">
                <h3
                  className={`text-xl sm:text-2xl font-bold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {agentProfile.name || "Not set"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Mail
                    className={`w-4 h-4 ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isLight ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {agentProfile.email}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-start">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                    <div
                      className={`w-full h-full rounded-full overflow-hidden border-4 ${
                        isLight ? "border-white" : "border-slate-700"
                      } shadow-lg`}
                    >
                      {agentProfile.image ? (
                        <img
                          src={agentProfile.image}
                          alt={agentProfile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center ${
                            isLight ? "bg-blue-100" : "bg-slate-700"
                          }`}
                        >
                          <UserIcon
                            className={`w-16 h-16 ${
                              isLight ? "text-blue-400" : "text-slate-500"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Information (display only) */}
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3">
                      <Phone
                        className={`w-5 h-5 ${
                          isLight ? "text-blue-600" : "text-blue-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-xs ${
                            isLight ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          Phone
                        </p>
                        <p
                          className={`font-medium ${
                            isLight ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {agentProfile.phone || "Not set"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3">
                      <Building2
                        className={`w-5 h-5 ${
                          isLight ? "text-blue-600" : "text-blue-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-xs ${
                            isLight ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          Brokerage
                        </p>
                        <p
                          className={`font-medium ${
                            isLight ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {agentProfile.brokerageName || "Not set"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3">
                      <CreditCard
                        className={`w-5 h-5 ${
                          isLight ? "text-blue-600" : "text-blue-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-xs ${
                            isLight ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          License Number
                        </p>
                        <p
                          className={`font-medium ${
                            isLight ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {agentProfile.licenseNumber || "Not set"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3">
                      <Users
                        className={`w-5 h-5 ${
                          isLight ? "text-blue-600" : "text-blue-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-xs ${
                            isLight ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          Team Affiliation
                        </p>
                        <p
                          className={`font-medium ${
                            isLight ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {agentProfile.team ? (
                            <>
                              {agentProfile.team.name}
                              {agentProfile.isTeamLeader && (
                                <span
                                  className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                    isLight
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-blue-900/50 text-blue-300"
                                  }`}
                                >
                                  Leader
                                </span>
                              )}
                            </>
                          ) : (
                            "No team assigned"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Setup Progress Card */}
          {!isLoadingProfile &&
            (() => {
              const requiredFields = [
                { name: "Name", value: agentProfile.name },
                { name: "Phone", value: agentProfile.phone },
                { name: "Brokerage Name", value: agentProfile.brokerageName },
                {
                  name: "Banner Photo",
                  value: agentProfile.agentProfile?.heroPhoto,
                },
                {
                  name: "Headshot",
                  value: agentProfile.agentProfile?.headshot,
                },
                {
                  name: "Broker Logo",
                  value: agentProfile.agentProfile?.brokerLogo,
                },
                {
                  name: "Headline",
                  value: agentProfile.agentProfile?.headline,
                },
                {
                  name: "Personal Story or Video",
                  value:
                    agentProfile.agentProfile?.personalStory ||
                    agentProfile.agentProfile?.videoTestimony,
                },
              ];

              const completed = requiredFields.filter(
                (field) => field.value
              ).length;
              const total = requiredFields.length;
              const percentage = Math.round((completed / total) * 100);
              const isComplete = percentage === 100;
              const missingFields = requiredFields.filter(
                (field) => !field.value
              );

              if (isComplete) return null;

              return (
                <div
                  className={`rounded-xl p-6 mb-8 ${
                    isLight
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
                      : "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-2 border-blue-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3
                        className={`text-xl font-bold mb-1 ${
                          isLight ? "text-gray-900" : "text-white"
                        }`}
                      >
                        Complete Your Profile Setup
                      </h3>
                      <p
                        className={`text-sm ${
                          isLight ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        {completed} of {total} required fields completed
                      </p>
                    </div>
                    <div
                      className={`text-3xl font-bold ${
                        percentage >= 75
                          ? "text-green-600"
                          : percentage >= 50
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {percentage}%
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className={`w-full h-3 rounded-full mb-4 ${
                      isLight ? "bg-gray-200" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentage >= 75
                          ? "bg-green-600"
                          : percentage >= 50
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Missing Fields */}
                  {missingFields.length > 0 && (
                    <div>
                      <p
                        className={`text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        Still needed:
                      </p>
                      <ul className="space-y-1">
                        {missingFields.map((field, index) => (
                          <li
                            key={index}
                            className={`text-sm flex items-center gap-2 ${
                              isLight ? "text-gray-600" : "text-gray-400"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {field.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div
                    className={`mt-4 pt-4 border-t flex items-center justify-between ${
                      isLight ? "border-blue-200" : "border-blue-800"
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      Complete your profile to attract more clients and appear in
                      search results.
                    </p>
                    <button
                      onClick={() =>
                        router.push("/agent/settings?onboarding=true")
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ml-4 ${
                        isLight
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      Go to Settings
                    </button>
                  </div>
                </div>
              );
            })()}

          {/* Points Section */}
          <div className="mb-8">
            <PointsSection />
          </div>

          {/* Partnerships Section */}
          <div className="mb-8">
            <PartnershipsSection />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 p-2">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`rounded-lg p-6 flex items-center justify-between ${
                    isLight
                      ? "bg-white/30 shadow-lg"
                      : "bg-neutral-900/30 shadow-lg shadow-blue-500/20"
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <p
                      className={`text-sm font-medium mb-1 ${
                        isLight ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {stat.label}
                    </p>
                    <p
                      className={`text-3xl font-bold ${
                        isLight ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
