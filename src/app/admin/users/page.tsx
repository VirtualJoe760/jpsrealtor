"use client";

import { useEffect, useState } from "react";
import {
  Edit2, X, Check, Shield, Search, Globe, Calendar, Clock, Eye,
  Users as UsersIcon, List, LayoutGrid, ChevronDown, UserPlus, LogIn,
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
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
  subdomain?: string;
  subscriptionTier?: string;
  siteForceActive?: boolean;
  signupOrigin?: { domain?: string; subdomain?: string; agentId?: string; method?: string };
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
  team?: string | null;
  brokerageName?: string;
  licenseNumber?: string;
  profileDescription?: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  admin: { bg: "bg-red-100", text: "text-red-700", darkBg: "bg-red-900/30", darkText: "text-red-300" },
  realEstateAgent: { bg: "bg-green-100", text: "text-green-700", darkBg: "bg-green-900/30", darkText: "text-green-300" },
  serviceProvider: { bg: "bg-purple-100", text: "text-purple-700", darkBg: "bg-purple-900/30", darkText: "text-purple-300" },
  endUser: { bg: "bg-blue-100", text: "text-blue-700", darkBg: "bg-blue-900/30", darkText: "text-blue-300" },
};

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminUsersPage() {
  const { cardBg, textPrimary, textSecondary, border, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "panel">("list");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({});
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ user: User; role: string; action: "add" | "remove" } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [impersonateLoading, setImpersonateLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/teams").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([userData, teamData]) => {
      if (userData) setUsers(userData.users || []);
      if (teamData) setTeams(teamData.teams || []);
    }).finally(() => setLoading(false));
  }, []);

  const openPanel = (user: User) => {
    setSelectedUser(user);
    setIsEditing(false);
    setFormData({
      name: user.name, email: user.email, phone: user.phone,
      roles: user.roles, isAdmin: user.isAdmin, isTeamLeader: user.isTeamLeader,
      team: user.team?._id, brokerageName: user.brokerageName,
      licenseNumber: user.licenseNumber, profileDescription: user.profileDescription,
    });
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("User updated");
        setIsEditing(false);
        // Refresh
        const data = await fetch("/api/admin/users").then((r) => r.json());
        setUsers(data.users || []);
        const updated = (data.users || []).find((u: User) => u._id === selectedUser._id);
        if (updated) setSelectedUser(updated);
      } else {
        toast.error("Failed to update");
      }
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  };

  const toggleRole = (role: string) => {
    const cur = formData.roles || [];
    setFormData({ ...formData, roles: cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role] });
  };

  // Quick role promote/demote — shows confirmation modal first
  const quickRoleToggle = (user: User, role: string) => {
    const hasRole = user.roles.includes(role);
    setConfirmModal({ user, role, action: hasRole ? "remove" : "add" });
  };

  const executeRoleChange = async () => {
    if (!confirmModal) return;
    setConfirmLoading(true);
    const { user, role, action } = confirmModal;
    const newRoles = action === "remove"
      ? user.roles.filter((r) => r !== role)
      : [...user.roles, role];
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: newRoles }),
      });
      if (res.ok) {
        const roleLabel = role === "realEstateAgent" ? "Agent" : role === "serviceProvider" ? "Partner" : "Admin";
        toast.success(`${action === "remove" ? "Removed" : "Added"} ${roleLabel} role for ${user.name || user.email}`);
        const data = await fetch("/api/admin/users").then((r) => r.json());
        setUsers(data.users || []);
        const updated = (data.users || []).find((u: User) => u._id === user._id);
        if (updated) setSelectedUser(updated);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update role");
      }
    } catch { toast.error("Error updating role"); }
    finally {
      setConfirmLoading(false);
      setConfirmModal(null);
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((u) => u._id)));
    }
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setSelectedIds(new Set());
        setSelectedUser(null);
        const refreshed = await fetch("/api/admin/users").then((r) => r.json());
        setUsers(refreshed.users || []);
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch { toast.error("Error deleting accounts"); }
    finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Toggle site force-active (admin override for subscription gate)
  const toggleSiteForceActive = async (user: User) => {
    const newValue = !user.siteForceActive;
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteForceActive: newValue }),
      });
      if (res.ok) {
        toast.success(newValue ? "Site activated (admin override)" : "Site deactivated — subscription required");
        const data = await fetch("/api/admin/users").then((r) => r.json());
        setUsers(data.users || []);
        const updated = (data.users || []).find((u: User) => u._id === user._id);
        if (updated) setSelectedUser(updated);
      } else {
        toast.error("Failed to update");
      }
    } catch { toast.error("Error"); }
  };

  const handleImpersonate = async (user: User) => {
    if (!user.subdomain) {
      toast.error("User has no subdomain — cannot impersonate");
      return;
    }
    setImpersonateLoading(true);
    try {
      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", subdomain: user.subdomain }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        // Redirect to the agent dashboard
        window.location.href = "/agent/dashboard";
      } else {
        toast.error(data.error || "Impersonation failed");
      }
    } catch {
      toast.error("Impersonation failed");
    } finally {
      setImpersonateLoading(false);
    }
  };

  // Build unique origin domains for filter
  const originDomains = [...new Set(users.map((u) => u.signupOrigin?.domain).filter(Boolean))] as string[];

  const filtered = users.filter((u) => {
    const matchSearch = !searchTerm ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === "all" ||
      (roleFilter === "admin" && u.isAdmin) ||
      (roleFilter !== "admin" && u.roles.includes(roleFilter));
    const matchOrigin = originFilter === "all" || u.signupOrigin?.domain === originFilter;
    return matchSearch && matchRole && matchOrigin;
  });

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${isLight ? "bg-white border-gray-300 text-gray-900" : "bg-gray-800 border-gray-700 text-white"} focus:outline-none focus:ring-2 focus:ring-blue-500`;
  const selectClass = `px-3 py-2.5 rounded-lg text-sm border ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-gray-800 border-gray-700 text-white"} [&>option]:bg-white [&>option]:text-gray-900`;
  const labelClass = `block text-sm font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-300"}`;

  const RoleBadge = ({ role }: { role: string }) => {
    const c = ROLE_COLORS[role] || ROLE_COLORS.endUser;
    return (
      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${isLight ? `${c.bg} ${c.text}` : `${c.darkBg} ${c.darkText}`}`}>
        {role === "realEstateAgent" ? "Agent" : role === "serviceProvider" ? "Partner" : role === "endUser" ? "User" : role}
      </span>
    );
  };

  if (loading) {
    return <div className={`flex items-center justify-center h-64 ${textSecondary}`}><div className="animate-pulse">Loading users...</div></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary} flex items-center gap-2`}>
            <UsersIcon size={24} /> User Management
          </h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>{filtered.length} of {users.length} users</p>
        </div>
        <div className={`flex gap-1 p-1 rounded-lg border ${isLight ? "bg-gray-100 border-gray-200" : "bg-white/5 border-white/10"}`}>
          <button onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : textSecondary}`}>
            <List size={16} />
          </button>
          <button onClick={() => setViewMode("panel")}
            className={`p-2 rounded-md transition-colors ${viewMode === "panel" ? "bg-blue-600 text-white" : textSecondary}`}>
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input type="text" placeholder="Search by name or email..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="realEstateAgent">Agents</option>
          <option value="serviceProvider">Partners</option>
          <option value="endUser">End Users</option>
        </select>
        <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)} className={selectClass}>
          <option value="all">All Origins</option>
          {originDomains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isLight ? "bg-blue-50 border-blue-200" : "bg-blue-900/20 border-blue-800/30"}`}>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selectedIds.size === filtered.length} onChange={toggleSelectAll}
              className="w-4 h-4 rounded" />
            <span className={`text-sm font-medium ${textPrimary}`}>
              {selectedIds.size} selected
            </span>
            <button onClick={() => setSelectedIds(new Set())}
              className={`text-xs ${textSecondary} hover:underline`}>Clear</button>
          </div>
          <button onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5">
            <X size={14} /> Delete Selected
          </button>
        </div>
      )}

      <div className="flex gap-4">
        {/* Main Content */}
        <div className={`flex-1 min-w-0 ${cardBg} border ${border} rounded-xl overflow-hidden`}>
          {viewMode === "list" ? (
            /* ═══ LIST VIEW ═══ */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${border} ${isLight ? "bg-gray-50" : "bg-white/5"}`}>
                    <th className="px-3 py-3 w-10">
                      <input type="checkbox"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded" />
                    </th>
                    <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>User</th>
                    <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Roles</th>
                    <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Origin</th>
                    <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Joined</th>
                    <th className={`text-left px-4 py-3 font-medium ${textSecondary}`}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user._id}
                      onClick={() => openPanel(user)}
                      className={`border-b last:border-0 ${border} cursor-pointer transition-colors ${
                        selectedIds.has(user._id)
                          ? isLight ? "bg-blue-50" : "bg-blue-900/20"
                          : selectedUser?._id === user._id
                            ? isLight ? "bg-gray-100" : "bg-white/[0.04]"
                            : isLight ? "hover:bg-gray-50" : "hover:bg-white/[0.02]"
                      }`}>
                      <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={selectedIds.has(user._id)}
                          onChange={() => toggleSelect(user._id)}
                          className="w-4 h-4 rounded cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? "bg-gray-200 text-gray-600" : "bg-gray-700 text-gray-300"}`}>
                              {(user.name || user.email)[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className={`font-medium ${textPrimary} flex items-center gap-1.5`}>
                              {user.name || "No name"}
                              {user.isAdmin && <Shield size={13} className="text-red-500" />}
                            </p>
                            <p className={`text-xs ${textSecondary}`}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => <RoleBadge key={r} role={r} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.signupOrigin?.domain && user.signupOrigin.domain !== "unknown" ? (
                          <div className="flex items-center gap-1.5">
                            <Globe size={12} className={textSecondary} />
                            <span className={`text-xs ${textPrimary}`}>{user.signupOrigin.domain}</span>
                          </div>
                        ) : (
                          <span className={`text-xs ${textSecondary}`}>—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs ${textSecondary}`}>
                        {user.createdAt ? formatTimeAgo(user.createdAt) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-xs ${textSecondary}`}>
                        {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt) : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ═══ CARD/PANEL VIEW ═══ */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {filtered.map((user) => (
                <div key={user._id}
                  onClick={() => openPanel(user)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedUser?._id === user._id
                      ? isLight ? "border-blue-400 bg-blue-50" : "border-blue-500 bg-blue-900/20"
                      : `${border} ${isLight ? "hover:border-gray-300 hover:shadow-sm" : "hover:border-gray-600"}`
                  }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isLight ? "bg-gray-200 text-gray-600" : "bg-gray-700 text-gray-300"}`}>
                        {(user.name || user.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${textPrimary} flex items-center gap-1`}>
                        {user.name || "No name"}
                        {user.isAdmin && <Shield size={12} className="text-red-500" />}
                      </p>
                      <p className={`text-xs truncate ${textSecondary}`}>{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {user.roles.map((r) => <RoleBadge key={r} role={r} />)}
                  </div>
                  <div className={`flex items-center justify-between text-xs ${textSecondary}`}>
                    {user.signupOrigin?.domain && user.signupOrigin.domain !== "unknown" ? (
                      <span className="flex items-center gap-1"><Globe size={10} />{user.signupOrigin.domain}</span>
                    ) : <span>—</span>}
                    <span>{user.createdAt ? formatTimeAgo(user.createdAt) : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <div className={`text-center py-12 ${textSecondary}`}>No users match your filters.</div>
          )}
        </div>

        {/* ═══ DETAIL PANEL ═══ */}
        {selectedUser && (
          <div className={`w-[400px] flex-shrink-0 ${cardBg} border ${border} rounded-xl overflow-hidden self-start sticky top-4`}>
            {/* Panel Header */}
            <div className={`px-5 py-4 border-b ${border} flex items-center justify-between`}>
              <h3 className={`font-semibold ${textPrimary}`}>{isEditing ? "Edit User" : "User Details"}</h3>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)}
                    className={`p-1.5 rounded-md transition-colors ${isLight ? "hover:bg-gray-100" : "hover:bg-white/10"}`}>
                    <Edit2 size={14} className={textSecondary} />
                  </button>
                )}
                <button onClick={() => { setSelectedUser(null); setIsEditing(false); }}
                  className={`p-1.5 rounded-md transition-colors ${isLight ? "hover:bg-gray-100" : "hover:bg-white/10"}`}>
                  <X size={14} className={textSecondary} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {isEditing ? (
                /* ═══ EDIT MODE ═══ */
                <>
                  <div><label className={labelClass}>Name</label>
                    <input type="text" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Email</label>
                    <input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Phone</label>
                    <input type="tel" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Roles</label>
                    <div className="space-y-1.5">
                      {["admin", "endUser", "realEstateAgent", "serviceProvider"].map((role) => (
                        <label key={role} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={formData.roles?.includes(role)} onChange={() => toggleRole(role)} className="rounded" />
                          <span className={textPrimary}>{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.isAdmin} onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })} className="rounded" />
                      <span className={textPrimary}>Admin</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.isTeamLeader} onChange={(e) => setFormData({ ...formData, isTeamLeader: e.target.checked })} className="rounded" />
                      <span className={textPrimary}>Team Leader</span>
                    </label>
                  </div>
                  <div><label className={labelClass}>Team</label>
                    <select value={formData.team || ""} onChange={(e) => setFormData({ ...formData, team: e.target.value || null })} className={inputClass}>
                      <option value="">No team</option>
                      {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Brokerage</label>
                    <input type="text" value={formData.brokerageName || ""} onChange={(e) => setFormData({ ...formData, brokerageName: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>License #</label>
                    <input type="text" value={formData.licenseNumber || ""} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Description</label>
                    <textarea value={formData.profileDescription || ""} onChange={(e) => setFormData({ ...formData, profileDescription: e.target.value })} rows={3} className={inputClass} /></div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setIsEditing(false)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {saving ? "Saving..." : <><Check size={14} /> Save</>}
                    </button>
                  </div>
                </>
              ) : (
                /* ═══ VIEW MODE ═══ */
                <>
                  {/* Identity */}
                  <div className="flex items-center gap-3">
                    {selectedUser.image ? (
                      <img src={selectedUser.image} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${isLight ? "bg-gray-200 text-gray-600" : "bg-gray-700 text-gray-300"}`}>
                        {(selectedUser.name || selectedUser.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className={`font-semibold ${textPrimary} flex items-center gap-1.5`}>
                        {selectedUser.name || "No name"}
                        {selectedUser.isAdmin && <Shield size={14} className="text-red-500" />}
                      </p>
                      <p className={`text-sm ${textSecondary}`}>{selectedUser.email}</p>
                      {selectedUser.phone && <p className={`text-xs ${textSecondary}`}>{selectedUser.phone}</p>}
                    </div>
                  </div>

                  {/* Roles */}
                  <div>
                    <p className={`text-xs font-medium mb-1.5 ${textSecondary}`}>ROLES</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedUser.roles.map((r) => <RoleBadge key={r} role={r} />)}
                      {selectedUser.isTeamLeader && (
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${isLight ? "bg-amber-100 text-amber-700" : "bg-amber-900/30 text-amber-300"}`}>
                          Team Leader
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-medium mb-1.5 ${textSecondary}`}>QUICK ACTIONS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { role: "realEstateAgent", label: "Agent", color: "green" },
                        { role: "serviceProvider", label: "Partner", color: "purple" },
                        { role: "admin", label: "Admin", color: "red" },
                      ].map(({ role, label, color }) => {
                        const has = selectedUser.roles.includes(role);
                        return (
                          <button key={role} onClick={() => quickRoleToggle(selectedUser, role)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                              has
                                ? `border-${color}-500 ${isLight ? `bg-${color}-50 text-${color}-700` : `bg-${color}-900/20 text-${color}-300`}`
                                : `${border} ${textSecondary} ${isLight ? "hover:bg-gray-100" : "hover:bg-white/5"}`
                            }`}>
                            {has ? `Remove ${label}` : `Make ${label}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className={`grid grid-cols-2 gap-3 text-sm`}>
                    <div>
                      <p className={`text-xs ${textSecondary}`}>Team</p>
                      <p className={textPrimary}>{selectedUser.team?.name || "None"}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary}`}>Brokerage</p>
                      <p className={textPrimary}>{selectedUser.brokerageName || "—"}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary}`}>License</p>
                      <p className={textPrimary}>{selectedUser.licenseNumber || "—"}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary}`}>Joined</p>
                      <p className={textPrimary}>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>

                  {/* Origin */}
                  <div className={`p-3 rounded-lg ${isLight ? "bg-gray-50" : "bg-white/5"}`}>
                    <p className={`text-xs font-medium mb-2 ${textSecondary}`}>SIGNUP ORIGIN</p>
                    {selectedUser.signupOrigin?.domain && selectedUser.signupOrigin.domain !== "unknown" ? (
                      <div className="space-y-1">
                        <p className={`text-sm flex items-center gap-1.5 ${textPrimary}`}>
                          <Globe size={13} className={textSecondary} />
                          {selectedUser.signupOrigin.domain}
                        </p>
                        {selectedUser.signupOrigin.method && (
                          <p className={`text-xs ${textSecondary}`}>Method: {selectedUser.signupOrigin.method}</p>
                        )}
                        {selectedUser.signupOrigin.subdomain && (
                          <p className={`text-xs ${textSecondary}`}>Subdomain: {selectedUser.signupOrigin.subdomain}</p>
                        )}
                      </div>
                    ) : (
                      <p className={`text-sm ${textSecondary}`}>No origin data</p>
                    )}
                  </div>

                  {/* Activity */}
                  <div className={`grid grid-cols-2 gap-3 text-sm`}>
                    <div className={`p-3 rounded-lg ${isLight ? "bg-gray-50" : "bg-white/5"}`}>
                      <p className={`text-xs ${textSecondary}`}>Last Login</p>
                      <p className={`font-medium ${textPrimary}`}>
                        {selectedUser.lastLoginAt ? formatTimeAgo(selectedUser.lastLoginAt) : "Never"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${isLight ? "bg-gray-50" : "bg-white/5"}`}>
                      <p className={`text-xs ${textSecondary}`}>Account Age</p>
                      <p className={`font-medium ${textPrimary}`}>
                        {selectedUser.createdAt ? formatTimeAgo(selectedUser.createdAt) : "—"}
                      </p>
                    </div>
                  </div>

                  {selectedUser.profileDescription && (
                    <div>
                      <p className={`text-xs font-medium mb-1 ${textSecondary}`}>DESCRIPTION</p>
                      <p className={`text-sm ${textPrimary}`}>{selectedUser.profileDescription}</p>
                    </div>
                  )}

                  {/* Impersonate + View Agent Dashboard — for agents with subdomains */}
                  {selectedUser.subdomain && selectedUser.roles.includes("realEstateAgent") && (() => {
                    const isLive = !!(selectedUser.subscriptionTier && selectedUser.subscriptionTier !== "free") || selectedUser.siteForceActive;
                    return (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleImpersonate(selectedUser)}
                          disabled={impersonateLoading}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-50"
                        >
                          <LogIn size={14} />
                          {impersonateLoading ? "Switching..." : `Log in as ${selectedUser.name || "Agent"}`}
                        </button>
                        <a
                          href={`https://${selectedUser.subdomain}.chatrealty.io`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isLight
                              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                          }`}
                        >
                          <Eye size={14} />
                          View Subdomain
                          {isLive ? (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-100 text-green-700">Live</span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700">Coming Soon</span>
                          )}
                        </a>
                        {/* Admin site activation toggle */}
                        <button
                          onClick={() => toggleSiteForceActive(selectedUser)}
                          className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                            selectedUser.siteForceActive
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : isLight
                                ? "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
                                : "bg-gray-800/50 hover:bg-gray-700 text-gray-400 border border-gray-700"
                          }`}
                        >
                          {selectedUser.siteForceActive ? "Take Site Offline" : "Activate Site Without Subscription"}
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ CONFIRMATION MODAL ═══ */}
      {confirmModal && (() => {
        const { user, role, action } = confirmModal;
        const roleLabel = role === "realEstateAgent" ? "Agent" : role === "serviceProvider" ? "Service Partner" : "Admin";
        const isDestructive = action === "remove";
        const isDangerous = role === "admin";

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-md rounded-xl shadow-2xl ${isLight ? "bg-white" : "bg-gray-900"}`}>
              <div className={`px-6 py-5 border-b ${border}`}>
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                  {isDestructive ? `Remove ${roleLabel} Role` : `Promote to ${roleLabel}`}
                </h3>
              </div>
              <div className="px-6 py-5">
                <p className={`text-sm mb-4 ${textSecondary}`}>
                  {isDestructive ? (
                    <>
                      Are you sure you want to remove the <strong className={textPrimary}>{roleLabel}</strong> role from <strong className={textPrimary}>{user.name || user.email}</strong>?
                      {role === "realEstateAgent" && " They will lose access to the agent dashboard, campaigns, CRM, and their subdomain."}
                      {role === "admin" && " They will lose all administrative access to the platform."}
                      {role === "serviceProvider" && " They will lose access to partnership features."}
                    </>
                  ) : (
                    <>
                      Promote <strong className={textPrimary}>{user.name || user.email}</strong> to <strong className={textPrimary}>{roleLabel}</strong>?
                      {role === "realEstateAgent" && " They will get access to the agent dashboard, campaigns, CRM, and a subdomain will be generated."}
                      {role === "admin" && " They will get full administrative access to the platform. This is a sensitive action."}
                      {role === "serviceProvider" && " They will get access to partnership and service provider features."}
                    </>
                  )}
                </p>
                {isDangerous && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${isLight ? "bg-red-50 border border-red-200 text-red-700" : "bg-red-900/20 border border-red-800/30 text-red-300"}`}>
                    <strong>Warning:</strong> {isDestructive ? "Removing" : "Granting"} admin access is a sensitive operation. Make sure this is intentional.
                  </div>
                )}
              </div>
              <div className={`px-6 py-4 border-t ${border} flex gap-3 justify-end`}>
                <button onClick={() => setConfirmModal(null)} disabled={confirmLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                  Cancel
                </button>
                <button onClick={executeRoleChange} disabled={confirmLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1.5 ${
                    isDestructive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}>
                  {confirmLoading ? "Updating..." : isDestructive ? `Remove ${roleLabel}` : `Make ${roleLabel}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {showDeleteModal && (() => {
        const count = selectedIds.size;
        const selectedUsers = users.filter((u) => selectedIds.has(u._id));
        const hasAdmins = selectedUsers.some((u) => u.isAdmin);
        const hasAgents = selectedUsers.some((u) => u.roles.includes("realEstateAgent"));

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-lg rounded-xl shadow-2xl ${isLight ? "bg-white" : "bg-gray-900"}`}>
              <div className={`px-6 py-5 border-b ${border}`}>
                <h3 className={`text-lg font-semibold text-red-600`}>
                  Delete {count} Account{count !== 1 ? "s" : ""}
                </h3>
              </div>
              <div className="px-6 py-5">
                <p className={`text-sm mb-4 ${textSecondary}`}>
                  This action is <strong className="text-red-500">permanent and cannot be undone</strong>. All data associated with these accounts will be deleted.
                </p>

                {(hasAdmins || hasAgents) && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${isLight ? "bg-red-50 border border-red-200 text-red-700" : "bg-red-900/20 border border-red-800/30 text-red-300"}`}>
                    <strong>Warning:</strong> Selection includes
                    {hasAdmins && " admin accounts"}
                    {hasAdmins && hasAgents && " and"}
                    {hasAgents && " agent accounts (with CRM data, campaigns, etc.)"}
                    .
                  </div>
                )}

                <div className={`max-h-48 overflow-y-auto rounded-lg border ${border} mb-4`}>
                  {selectedUsers.map((u) => (
                    <div key={u._id} className={`flex items-center justify-between px-3 py-2 border-b last:border-0 ${border} text-sm`}>
                      <div>
                        <span className={textPrimary}>{u.name || "No name"}</span>
                        <span className={`ml-2 text-xs ${textSecondary}`}>{u.email}</span>
                      </div>
                      <div className="flex gap-1">
                        {u.roles.map((r) => <RoleBadge key={r} role={r} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`px-6 py-4 border-t ${border} flex gap-3 justify-end`}>
                <button onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                  Cancel
                </button>
                <button onClick={executeDelete} disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
                  {deleteLoading ? "Deleting..." : `Delete ${count} Account${count !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
