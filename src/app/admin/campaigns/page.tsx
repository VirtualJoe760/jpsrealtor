"use client";

import { useEffect, useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  Mail,
  Phone,
  Megaphone,
  Send,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  neighborhood?: string;
  status: "draft" | "active" | "completed" | "paused";
  totalContacts: number;
  activeStrategies: {
    voicemail: boolean;
    email: boolean;
    text: boolean;
  };
  analytics: {
    voicemailsSent: number;
    voicemailsListened: number;
    emailsSent: number;
    emailsOpened: number;
    textsSent: number;
    textsDelivered: number;
    responses: number;
    conversions: number;
  };
  createdAt: string;
  lastActivity: string;
}

const typeIcons: Record<string, typeof Mail> = {
  voicemail: Phone,
  email: Mail,
  direct_mail: Send,
  ads: Megaphone,
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

export default function AdminCampaignsPage() {
  const { textPrimary, textSecondary, border, cardBg, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/campaigns/list${params}`);
      if (!res.ok) throw new Error("Failed to load campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  const filterOptions = ["all", "draft", "active", "completed", "paused"];

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse">Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>Campaigns</h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={fetchCampaigns}
          className={`p-2 rounded-lg transition-colors ${
            isLight ? "hover:bg-gray-100" : "hover:bg-white/5"
          }`}
        >
          <RefreshCw size={18} className={textSecondary} />
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className={textSecondary} />
        <div
          className={`flex gap-1 p-1 rounded-lg border ${
            isLight
              ? "bg-gray-100 border-gray-200"
              : "bg-white/5 border-white/10"
          }`}
        >
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === opt
                  ? "bg-blue-600 text-white"
                  : `${textSecondary} ${isLight ? "hover:bg-gray-200" : "hover:bg-white/10"}`
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div
          className={`${cardBg} border ${border} rounded-xl p-12 text-center`}
        >
          <Mail
            size={40}
            className={`mx-auto mb-3 ${isLight ? "text-gray-300" : "text-gray-600"}`}
          />
          <p className={textSecondary}>
            {statusFilter === "all"
              ? "No campaigns found"
              : `No ${statusFilter} campaigns`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const Icon = typeIcons[campaign.type] || Mail;
            const isExpanded = expandedId === campaign.id;

            return (
              <div
                key={campaign.id}
                className={`${cardBg} border ${border} rounded-xl overflow-hidden`}
              >
                {/* Campaign Row */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : campaign.id)
                  }
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <div
                    className={`p-2 rounded-lg ${isLight ? "bg-gray-100" : "bg-white/5"}`}
                  >
                    <Icon size={18} className="text-blue-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold truncate ${textPrimary}`}
                      >
                        {campaign.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          statusColors[campaign.status] || statusColors.draft
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <div className={`text-xs mt-0.5 ${textSecondary}`}>
                      {campaign.type} &middot; {campaign.totalContacts} contacts
                      &middot; Created{" "}
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp size={18} className={textSecondary} />
                  ) : (
                    <ChevronDown size={18} className={textSecondary} />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    className={`px-4 pb-4 pt-0 border-t ${border} space-y-3`}
                  >
                    {campaign.description && (
                      <p className={`text-sm ${textSecondary}`}>
                        {campaign.description}
                      </p>
                    )}

                    {campaign.neighborhood && (
                      <p className={`text-sm ${textSecondary}`}>
                        <span className="font-medium">Neighborhood:</span>{" "}
                        {campaign.neighborhood}
                      </p>
                    )}

                    {/* Active Strategies */}
                    <div className="flex gap-2">
                      {campaign.activeStrategies.voicemail && (
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            isLight
                              ? "bg-purple-50 text-purple-700"
                              : "bg-purple-900/30 text-purple-300"
                          }`}
                        >
                          <Phone size={12} /> Voicemail
                        </span>
                      )}
                      {campaign.activeStrategies.email && (
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            isLight
                              ? "bg-blue-50 text-blue-700"
                              : "bg-blue-900/30 text-blue-300"
                          }`}
                        >
                          <Mail size={12} /> Email
                        </span>
                      )}
                      {campaign.activeStrategies.text && (
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            isLight
                              ? "bg-green-50 text-green-700"
                              : "bg-green-900/30 text-green-300"
                          }`}
                        >
                          <Send size={12} /> SMS
                        </span>
                      )}
                    </div>

                    {/* Analytics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Voicemails Sent",
                          val: campaign.analytics.voicemailsSent,
                        },
                        {
                          label: "VM Listened",
                          val: campaign.analytics.voicemailsListened,
                        },
                        {
                          label: "Emails Sent",
                          val: campaign.analytics.emailsSent,
                        },
                        {
                          label: "Emails Opened",
                          val: campaign.analytics.emailsOpened,
                        },
                        {
                          label: "Texts Sent",
                          val: campaign.analytics.textsSent,
                        },
                        {
                          label: "Texts Delivered",
                          val: campaign.analytics.textsDelivered,
                        },
                        {
                          label: "Responses",
                          val: campaign.analytics.responses,
                        },
                        {
                          label: "Conversions",
                          val: campaign.analytics.conversions,
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className={`p-2 rounded-lg text-center ${
                            isLight ? "bg-gray-50" : "bg-white/5"
                          }`}
                        >
                          <div
                            className={`text-lg font-bold ${textPrimary}`}
                          >
                            {stat.val}
                          </div>
                          <div className={`text-[11px] ${textSecondary}`}>
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`text-xs ${textSecondary}`}>
                      Last activity:{" "}
                      {new Date(campaign.lastActivity).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
