"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";

// Paid onboarding (2026-10-28): apply → pay (becomes an agent) → verify ID →
// admin confirms here → public site can go live. Reject cancels + refunds.
interface AgentApplication {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  isAgent?: boolean;
  subdomain?: string;
  licenseNumber?: string;
  licenseState?: string;
  brokerageName?: string;
  mlsAssociation?: string;
  mlsId?: string;
  mlsContact?: string;
  identityStatus?: string | null;
  phase?: string;
  paidAt?: string | null;
  siteApprovedAt?: string | null;
  createdAt: string;
}

export default function AdminAgentApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchApplications();
    }
  }, [status]);

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/admin/applications/agents");
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      } else {
        toast.error("Failed to fetch agent applications");
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Error loading applications");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: "confirm" | "reject", reason?: string) => {
    setProcessing(userId);
    try {
      const response = await fetch("/api/admin/applications/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success(data.message || (action === "confirm" ? "Confirmed" : "Rejected"));
        fetchApplications();
        setRejectModal(null);
        setRejectReason("");
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Error processing application:", error);
      toast.error("Error processing application");
    } finally {
      setProcessing(null);
    }
  };

  const badge = (cls: string, label: string) => <span className={`px-2 py-1 text-xs rounded-full ${cls}`}>{label}</span>;
  const getStatusBadge = (phase?: string) => {
    if (phase === "final_approved") return badge("bg-green-500/20 text-green-400", "Confirmed — site can go live");
    if (phase === "final_rejected" || phase === "inquiry_rejected") return badge("bg-red-500/20 text-red-400", "Rejected");
    if (phase === "site_review") return badge("bg-blue-500/20 text-blue-400", "Paid — needs your review");
    if (phase === "awaiting_payment") return badge("bg-gray-500/20 text-gray-400", "Applied — hasn't paid");
    return badge("bg-yellow-500/20 text-yellow-400", "Pending (old flow)");
  };
  const idLabel = (s?: string | null) =>
    s === "verified" ? "✓ ID verified" : s === "requires_input" ? "ID check failed — retrying" : s === "pending" ? "ID check in progress" : s === "failed" ? "ID check cancelled" : "ID not verified yet";

  if (status === "loading" || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`${textSecondary} text-center py-12`}>Loading agent applications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Agent Applications</h1>
        <p className={`${textSecondary} mt-1`}>Review and manage agent registration requests</p>
      </div>

      {applications.length === 0 ? (
        <div className={`${cardBg} ${border} border rounded-xl p-8 text-center`}>
          <Shield className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
          <p className={textSecondary}>No agent applications found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app._id}
              className={`${cardBg} ${border} border rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={`font-semibold ${textPrimary} truncate`}>
                    {app.name || "Unknown"}
                  </h3>
                  {getStatusBadge(app.phase)}
                </div>
                <p className={`text-sm ${textSecondary} truncate`}>{app.email}</p>
                <div className={`text-sm ${textSecondary} mt-2 flex flex-wrap gap-x-4 gap-y-1`}>
                  {app.licenseNumber && <span>License: {app.licenseNumber}{app.licenseState ? ` (${app.licenseState})` : ""}</span>}
                  {app.brokerageName && <span>Brokerage: {app.brokerageName}</span>}
                  {app.mlsAssociation && <span>MLS: {app.mlsAssociation}{app.mlsId ? ` · ID ${app.mlsId}` : ""}</span>}
                  {app.mlsContact && <span>Assoc. contact: {app.mlsContact}</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Applied {new Date(app.createdAt).toLocaleDateString()}
                    {app.paidAt ? ` · paid ${new Date(app.paidAt).toLocaleDateString()}` : ""}
                  </span>
                  {app.isAgent && <span>{idLabel(app.identityStatus)}</span>}
                  {app.subdomain && <span>{app.subdomain}.chatrealty.io</span>}
                </div>
              </div>

              {app.phase !== "final_approved" && app.phase !== "final_rejected" && (
                <div className="flex gap-2 shrink-0">
                  {app.isAgent && (
                    <button
                      onClick={() => handleAction(app._id, "confirm")}
                      disabled={processing === app._id}
                      title={app.identityStatus === "verified" ? "" : "Their ID isn't verified yet"}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirm &amp; publish site
                    </button>
                  )}
                  <button
                    onClick={() => setRejectModal(app._id)}
                    disabled={processing === app._id}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {app.isAgent ? "Reject & refund" : "Reject"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardBg} ${border} border rounded-xl p-6 w-full max-w-md`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Reject Application</h3>
            <p className={`text-sm ${textSecondary} mb-4`}>
              If they&apos;ve paid, this cancels their Basic plan, refunds their payment and removes agent access.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection (will be emailed to applicant)..."
              className={`w-full p-3 rounded-lg border ${border} ${
                isLight ? "bg-white text-gray-900" : "bg-white/5 text-white"
              } min-h-[100px] resize-none`}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className={`px-4 py-2 rounded-lg ${textSecondary} hover:opacity-80`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(rejectModal, "reject", rejectReason)}
                disabled={processing === rejectModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
