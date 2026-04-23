"use client";

import { useTheme } from "@/app/contexts/ThemeContext";

export type PartnershipStatus = "pending" | "active" | "suspended" | "terminated";
export type JmaStatus = "signed" | "unsigned";

export interface Partnership {
  _id: string;
  agentName: string;
  agentPhoto?: string;
  partnerName: string;
  partnerPhoto?: string;
  status: PartnershipStatus;
  costSplit: { agent: number; partner: number };
  jmaStatus: JmaStatus;
  createdAt: string;
}

interface PartnershipCardProps {
  partnership: Partnership;
  /** Which side is viewing: the agent or the partner */
  viewAs: "agent" | "partner";
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

const STATUS_STYLES = {
  pending: {
    light: "bg-amber-100 border-amber-300 text-amber-700",
    dark: "bg-amber-500/20 border-amber-500/50 text-amber-300",
  },
  active: {
    light: "bg-green-100 border-green-300 text-green-700",
    dark: "bg-green-500/20 border-green-500/50 text-green-300",
  },
  suspended: {
    light: "bg-red-100 border-red-300 text-red-700",
    dark: "bg-red-500/20 border-red-500/50 text-red-300",
  },
  terminated: {
    light: "bg-gray-100 border-gray-300 text-gray-500",
    dark: "bg-gray-700/50 border-gray-600 text-gray-400",
  },
};

const JMA_STYLES = {
  signed: {
    light: "bg-green-100 text-green-700",
    dark: "bg-green-500/20 text-green-300",
  },
  unsigned: {
    light: "bg-gray-100 text-gray-500",
    dark: "bg-gray-700/50 text-gray-400",
  },
};

export default function PartnershipCard({
  partnership,
  viewAs,
  onAccept,
  onReject,
  onViewDetails,
}: PartnershipCardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const displayName = viewAs === "partner" ? partnership.agentName : partnership.partnerName;
  const displayPhoto = viewAs === "partner" ? partnership.agentPhoto : partnership.partnerPhoto;

  const statusStyle = STATUS_STYLES[partnership.status];
  const jmaStyle = JMA_STYLES[partnership.jmaStatus];

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isLight
          ? "bg-white border-gray-200 hover:shadow-md"
          : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${
            isLight ? "bg-gray-100" : "bg-gray-700"
          }`}
        >
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className={`text-lg font-semibold ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {displayName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`font-semibold truncate ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              {displayName}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                isLight ? statusStyle.light : statusStyle.dark
              }`}
            >
              {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
            </span>
          </div>

          {/* Cost Split */}
          <p
            className={`text-sm mt-1 ${
              isLight ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Cost Split: Agent {partnership.costSplit.agent}% / Partner{" "}
            {partnership.costSplit.partner}%
          </p>

          {/* JMA Status */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isLight ? jmaStyle.light : jmaStyle.dark
              }`}
            >
              JMA: {partnership.jmaStatus === "signed" ? "Signed" : "Unsigned"}
            </span>
            <span
              className={`text-xs ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Since {new Date(partnership.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dashed flex-wrap"
        style={{ borderColor: isLight ? "#d1d5db" : "#374151" }}
      >
        {partnership.status === "pending" && onAccept && onReject && (
          <>
            <button
              onClick={() => onAccept(partnership._id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isLight
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              Accept
            </button>
            <button
              onClick={() => onReject(partnership._id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isLight
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              Reject
            </button>
          </>
        )}
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(partnership._id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-blue-50 hover:bg-blue-100 text-blue-600"
                : "bg-blue-900/30 hover:bg-blue-900/50 text-blue-400"
            }`}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
