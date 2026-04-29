"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import AdminNav from "@/app/components/AdminNav";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";

interface AgentApplication {
  _id: string;
  name?: string;
  email: string;
  licenseNumber?: string;
  brokerageName?: string;
  identityStatus?: string;
  phase?: string;
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

  const handleAction = async (userId: string, action: "approve" | "reject", reason?: string) => {
    setProcessing(userId);
    try {
      const response = await fetch("/api/admin/applications/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });

      if (response.ok) {
        toast.success(action === "approve" ? "Application approved" : "Application rejected");
        fetchApplications();
        setRejectModal(null);
        setRejectReason("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Error processing application:", error);
      toast.error("Error processing application");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (phase?: string, identityStatus?: string) => {
    if (phase === "final_approved") {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Approved</span>;
    }
    if (phase === "final_rejected" || phase === "inquiry_rejected") {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Rejected</span>;
    }
    if (identityStatus === "verified") {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">Verified</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pending</span>;
  };

  if (status === "loading" || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminNav />
        <div className={`${textSecondary} text-center py-12`}>Loading agent applications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <AdminNav />

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
                  {getStatusBadge(app.phase, app.identityStatus)}
                </div>
                <p className={`text-sm ${textSecondary} truncate`}>{app.email}</p>
                <div className={`text-sm ${textSecondary} mt-2 flex flex-wrap gap-x-4 gap-y-1`}>
                  {app.brokerageName && <span>Brokerage: {app.brokerageName}</span>}
                  {app.licenseNumber && <span>License: {app.licenseNumber}</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Identity: {app.identityStatus || "pending"}
                  </span>
                </div>
              </div>

              {app.phase !== "final_approved" && app.phase !== "final_rejected" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(app._id, "approve")}
                    disabled={processing === app._id}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectModal(app._id)}
                    disabled={processing === app._id}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
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
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Reject Application</h3>
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
