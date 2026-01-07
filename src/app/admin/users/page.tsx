"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Edit2, X, Check, Shield, Users as UsersIcon, Search } from "lucide-react";
import AdminNav from "@/app/components/AdminNav";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";

interface User {
  _id: string;
  name?: string;
  email: string;
  image?: string;
  phone?: string;
  roles: string[];
  isAdmin: boolean;
  isTeamLeader: boolean;
  team?: { _id: string; name: string; description?: string } | null;
  brokerageName?: string;
  licenseNumber?: string;
  profileDescription?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
}

interface UserFormData {
  name?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  isAdmin?: boolean;
  isTeamLeader?: boolean;
  team?: string; // Team ID as string, not the full object
  brokerageName?: string;
  licenseNumber?: string;
  profileDescription?: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUsers();
      fetchTeams();
    }
  }, [status]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/admin/teams");
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      isAdmin: user.isAdmin,
      isTeamLeader: user.isTeamLeader,
      team: user.team?._id,
      brokerageName: user.brokerageName,
      licenseNumber: user.licenseNumber,
      profileDescription: user.profileDescription,
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("User updated successfully");
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error("Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Error updating user");
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    const currentRoles = formData.roles || [];
    if (currentRoles.includes(role)) {
      setFormData({ ...formData, roles: currentRoles.filter(r => r !== role) });
    } else {
      setFormData({ ...formData, roles: [...currentRoles, role] });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className={`min-h-screen ${isLight ? "bg-gray-50" : "bg-black"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminNav />
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight ? "bg-gray-50" : "bg-black"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNav />

        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${textPrimary} flex items-center gap-2`}>
            <UsersIcon className="w-8 h-8" />
            User Management
          </h1>
          <p className={`mt-2 ${textSecondary}`}>
            Manage user accounts, roles, and permissions
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900"
                  : "bg-slate-800 border border-slate-700 text-white"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className={`${cardBg} rounded-lg shadow overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isLight ? "bg-gray-50" : "bg-slate-800"}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}>
                    User
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}>
                    Roles
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}>
                    Team
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}>
                    Brokerage
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${border}`}>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className={isLight ? "hover:bg-gray-50" : "hover:bg-slate-800"}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className={`text-sm font-medium ${textPrimary} flex items-center gap-2`}>
                            {user.name || "No name"}
                            {user.isAdmin && (
                              <Shield className="w-4 h-4 text-red-500" title="Admin" />
                            )}
                          </div>
                          <div className={`text-sm ${textSecondary}`}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <span
                            key={role}
                            className={`px-2 py-1 text-xs rounded-full ${
                              isLight
                                ? "bg-blue-100 text-blue-800"
                                : "bg-blue-900/30 text-blue-300"
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                        {user.isTeamLeader && (
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              isLight
                                ? "bg-purple-100 text-purple-800"
                                : "bg-purple-900/30 text-purple-300"
                            }`}
                          >
                            Team Leader
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${textPrimary}`}>
                        {user.team?.name || "No team"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${textPrimary}`}>
                        {user.brokerageName || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingUser && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setEditingUser(null)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className={`${cardBg} rounded-lg shadow-xl max-w-2xl w-full p-6`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-xl font-bold ${textPrimary}`}>
                      Edit User: {editingUser.email}
                    </h2>
                    <button
                      onClick={() => setEditingUser(null)}
                      className={`p-2 rounded-lg ${
                        isLight ? "hover:bg-gray-100" : "hover:bg-slate-700"
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Name */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900"
                            : "bg-slate-700 border border-slate-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900"
                            : "bg-slate-700 border border-slate-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900"
                            : "bg-slate-700 border border-slate-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>

                    {/* Roles */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Roles
                      </label>
                      <div className="space-y-2">
                        {["admin", "endUser", "realEstateAgent", "vacationRentalHost", "serviceProvider"].map(role => (
                          <label key={role} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.roles?.includes(role)}
                              onChange={() => toggleRole(role)}
                              className="rounded"
                            />
                            <span className={`text-sm ${textPrimary}`}>{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Admin Status */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isAdmin}
                        onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                        className="rounded"
                      />
                      <label className={`text-sm font-medium ${textPrimary}`}>
                        Admin Access
                      </label>
                    </div>

                    {/* Team Leader */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isTeamLeader}
                        onChange={(e) => setFormData({ ...formData, isTeamLeader: e.target.checked })}
                        className="rounded"
                      />
                      <label className={`text-sm font-medium ${textPrimary}`}>
                        Team Leader
                      </label>
                    </div>

                    {/* Team */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Team Affiliation
                      </label>
                      <select
                        value={formData.team || ""}
                        onChange={(e) => setFormData({ ...formData, team: e.target.value || null })}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900"
                            : "bg-slate-700 border border-slate-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="">No team</option>
                        {teams.map(team => (
                          <option key={team._id} value={team._id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Brokerage Name */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Brokerage Name
                      </label>
                      <input
                        type="text"
                        value={formData.brokerageName || ""}
                        onChange={(e) => setFormData({ ...formData, brokerageName: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900"
                            : "bg-slate-700 border border-slate-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>

                    {/* License Number */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        License Number
                      </label>
                      <input
                        type="text"
                        value={formData.licenseNumber || ""}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900"
                            : "bg-slate-700 border border-slate-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>

                    {/* Profile Description */}
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Profile Description
                      </label>
                      <textarea
                        value={formData.profileDescription || ""}
                        onChange={(e) => setFormData({ ...formData, profileDescription: e.target.value })}
                        rows={4}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900"
                            : "bg-slate-700 border border-slate-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                      onClick={() => setEditingUser(null)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                        isLight
                          ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
                          : "bg-slate-700 hover:bg-slate-600 text-white"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
