"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Briefcase } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";

interface PartnerApplication {
  _id: string;
  name?: string;
  email: string;
  companyName?: string;
  type?: string;
  phone?: string;
  website?: string;
  licenseNumber?: string;
  nmlsId?: string;
  createdAt: string;
  status?: "pending" | "approved" | "rejected";
  appliedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export default function AdminPartnerApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [partners, setPartners] = useState<PartnerApplication[]>([]);
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
      fetchPartners();
    }
  }, [status]);

  const fetchPartners = async () => {
    try {
      const response = await fetch("/api/admin/applications/partners");
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners);
      } else {
        toast.error("Failed to fetch partner applications");
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Error loading partner applications");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: "approve" | "reject", reason?: string) => {
    setProcessing(userId);
    try {
      const response = await fetch("/api/admin/applications/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });

      if (response.ok) {
        toast.success(action === "approve" ? "Partner approved" : "Partner rejected");
        fetchPartners();
        setRejectModal(null);
        setRejectReason("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Error processing partner:", error);
      toast.error("Error processing partner application");
    } finally {
      setProcessing(null);
    }
  };

  const formatType = (type?: string) => {
    if (!type) return "Unknown";
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const statusBadge = (s?: string) => {
    const status = s || "approved"; // legacy partners with no status are treated as approved
    const map: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-400",
      approved: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full capitalize ${map[status] || map.approved}`}>
        {status}
      </span>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`${textSecondary} text-center py-12`}>Loading partner applications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Partner Applications</h1>
        <p className={`${textSecondary} mt-1`}>Review and manage service partner registrations</p>
      </div>

      {partners.length === 0 ? (
        <div className={`${cardBg} ${border} border rounded-xl p-8 text-center`}>
          <Briefcase className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
          <p className={textSecondary}>No partner applications found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {partners.map((partner) => (
            <div
              key={partner._id}
              className={`${cardBg} ${border} border rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={`font-semibold ${textPrimary} truncate`}>
                    {partner.companyName || partner.name || "Unknown"}
                  </h3>
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400">
                    {formatType(partner.type)}
                  </span>
                  {statusBadge(partner.status)}
                </div>
                <p className={`text-sm ${textSecondary} truncate`}>{partner.email}</p>
                <div className={`text-sm ${textSecondary} mt-2 flex flex-wrap gap-x-4 gap-y-1`}>
                  {partner.phone && <span>Phone: {partner.phone}</span>}
                  {partner.website && <span>Web: {partner.website}</span>}
                  {partner.licenseNumber && <span>License: {partner.licenseNumber}</span>}
                  {partner.nmlsId && <span>NMLS: {partner.nmlsId}</span>}
                  <span>Joined: {new Date(partner.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {partner.status !== "approved" && (
                  <button
                    onClick={() => handleAction(partner._id, "approve")}
                    disabled={processing === partner._id}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {partner.status === "rejected" ? "Re-approve" : "Approve"}
                  </button>
                )}
                {partner.status !== "rejected" && (
                  <button
                    onClick={() => setRejectModal(partner._id)}
                    disabled={processing === partner._id}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {partner.status === "approved" ? "Revoke" : "Reject"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardBg} ${border} border rounded-xl p-6 w-full max-w-md`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Reject Partner</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection (optional)..."
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
