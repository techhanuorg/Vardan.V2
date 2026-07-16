import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { UserPlus, Edit2, Trash2, ShieldAlert, Loader2, RefreshCw } from "lucide-react";

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  status: string;
  role: { id: string; name: string };
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
}

export const UserManagement: React.FC = () => {
  const { accessToken, hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setUsers(payload.data);
      } else {
        showToast(payload.message || "Failed to load users.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  const fetchRoles = useCallback(async () => {
    // Seed initial roles to choose from locally for scaffolding
    setRoles([
      { id: "owner-role-id-scaffold", name: "Owner" },
      { id: "doctor-role-id-scaffold", name: "DOCTOR" },
      { id: "staff-role-id-scaffold", name: "STAFF" },
    ]);
  }, []);

  useEffect(() => {
    if (hasPermission("users.read")) {
      fetchUsers();
      fetchRoles();
    }
  }, [fetchUsers, fetchRoles, hasPermission]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRoleId(roles[2]?.id || ""); // default to STAFF
    setShowModal(true);
  };

  const handleOpenEdit = (user: ManagedUser) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(""); // Obfuscate password
    setPhone(user.phone || "");
    setRoleId(user.role.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const url = editingId
      ? `http://localhost:5000/api/v1/users/${editingId}`
      : "http://localhost:5000/api/v1/users";
    const method = editingId ? "PUT" : "POST";
    const body = editingId
      ? { name, phone, roleId, email }
      : { name, email, password, phone, roleId };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (res.ok) {
        showToast(
          editingId ? "User details modified." : "New user created successfully.",
          "success"
        );
        setShowModal(false);
        fetchUsers();
      } else {
        showToast(payload.message || "Failed to save user.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        showToast("User soft deleted.", "success");
        fetchUsers();
      } else {
        showToast("Failed to delete user.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`http://localhost:5000/api/v1/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`User status toggled to ${nextStatus}.`, "success");
        fetchUsers();
      } else {
        showToast("Failed to toggle status.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    }
  };

  if (!hasPermission("users.read")) {
    return (
      <div className="p-8 rounded-3xl border border-rose-100 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-400">Access Restricted</h3>
        <p className="text-sm text-rose-600 dark:text-rose-500 mt-1">
          Only portal Owners or Administrators possess user management authorization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            User Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Create staff credentials, assign operational roles, and toggle deactivations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {hasPermission("users.create") && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Add New User
            </button>
          )}
        </div>
      </div>

      {/* Users table */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm">Fetching user records...</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-12 text-sm text-slate-400 font-medium">
            No active users listed. Click &quot;Add New User&quot; to begin.
          </p>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {users.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{item.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.role.name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.status}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {hasPermission("users.edit") && (
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer inline-flex"
                      >
                        <Edit2 className="h-4.5 w-4" />
                      </button>
                    )}
                    {hasPermission("users.delete") && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg border border-rose-50 dark:border-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer inline-flex"
                      >
                        <Trash2 className="h-4.5 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit/Create Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingId ? "Modify User Account" : "Register Staff User"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              {!editingId && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl text-sm"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">System Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm bg-white dark:bg-slate-900"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm border hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagement;
