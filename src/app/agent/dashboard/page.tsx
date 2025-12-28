"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AgentNav from "@/app/components/AgentNav";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Briefcase, Users, TrendingUp, FileCheck } from "lucide-react";

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>Loading...</p>
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
          <h2 className={`text-2xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
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
    <div className={`min-h-screen ${isLight ? "bg-gray-50" : "bg-black"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Agent Navigation */}
        <AgentNav />

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
            Agent Dashboard
          </h1>
          <p className={`${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Welcome back, {user?.name || user?.email}
          </p>
          {user?.isTeamLeader && (
            <p className={`text-sm mt-1 ${isLight ? "text-blue-600" : "text-blue-400"}`}>
              Team Leader
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-lg p-6 ${
                  isLight ? "bg-white shadow-sm border border-gray-200" : "bg-neutral-900 border border-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  {stat.label}
                </p>
                <p className={`text-3xl font-bold mt-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div
          className={`rounded-lg p-6 ${
            isLight ? "bg-white shadow-sm border border-gray-200" : "bg-neutral-900 border border-neutral-800"
          }`}
        >
          <h2 className={`text-xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push("/agent/clients")}
              className={`p-4 rounded-lg text-left transition-colors ${
                isLight
                  ? "bg-blue-50 hover:bg-blue-100 text-blue-900"
                  : "bg-blue-900/20 hover:bg-blue-900/30 text-blue-400"
              }`}
            >
              <Briefcase className="w-5 h-5 mb-2" />
              <p className="font-semibold">Manage Clients</p>
              <p className={`text-sm mt-1 ${isLight ? "text-blue-700" : "text-blue-300"}`}>
                View and manage your client list
              </p>
            </button>

            {user?.isTeamLeader && (
              <>
                <button
                  onClick={() => router.push("/agent/applications")}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    isLight
                      ? "bg-green-50 hover:bg-green-100 text-green-900"
                      : "bg-green-900/20 hover:bg-green-900/30 text-green-400"
                  }`}
                >
                  <FileCheck className="w-5 h-5 mb-2" />
                  <p className="font-semibold">Review Applications</p>
                  <p className={`text-sm mt-1 ${isLight ? "text-green-700" : "text-green-300"}`}>
                    Manage pending agent applications
                  </p>
                </button>

                <button
                  onClick={() => router.push("/agent/team")}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    isLight
                      ? "bg-purple-50 hover:bg-purple-100 text-purple-900"
                      : "bg-purple-900/20 hover:bg-purple-900/30 text-purple-400"
                  }`}
                >
                  <Users className="w-5 h-5 mb-2" />
                  <p className="font-semibold">Manage Team</p>
                  <p className={`text-sm mt-1 ${isLight ? "text-purple-700" : "text-purple-300"}`}>
                    View and manage your team members
                  </p>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
