import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { PlusCircle, Edit2, Trash2, Loader2, Hospital } from "lucide-react";

interface Department {
  id: string;
  name: string;
  description?: string | null;
}

export const Departments: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/departments", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setDepts(payload.data);
      }
    } catch (e) {
      showToast("Failed to fetch departments.", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setShowModal(true);
  };

  const handleOpenEdit = (d: Department) => {
    setEditingId(d.id);
    setName(d.name);
    setDescription(d.description || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const url = editingId
      ? `http://localhost:5000/api/v1/dashboard/departments/${editingId}`
      : "http://localhost:5000/api/v1/dashboard/departments";
    const method = editingId ? "PUT" : "POST";
    const body = { name, description };

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
        showToast(editingId ? "Department updated." : "Department created successfully.", "success");
        setShowModal(false);
        fetchDepts();
      } else {
        showToast(payload.message || "Failed to save department.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this department?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/dashboard/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        showToast("Department deleted.", "success");
        fetchDepts();
      } else {
        showToast("Failed to delete department.", "error");
      }
    } catch (e) {
      showToast("Server connection error.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Departments Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Define medical departments and specialty fields.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Create Department
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Fetching departments list...</p>
        </div>
      ) : depts.length === 0 ? (
        <p className="text-center py-12 text-sm text-slate-400 font-medium bg-white dark:bg-slate-900 border rounded-3xl">
          No departments configured yet. Click &quot;Create Department&quot; to begin.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {depts.map((d) => (
            <div
              key={d.id}
              className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Hospital className="h-5 w-5" />
                  </div>
                  <div className="space-x-1 flex">
                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="p-1.5 rounded-lg border border-rose-50 dark:border-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">{d.name}</h3>
                <p className="text-xs text-slate-450 leading-relaxed font-medium">
                  {d.description || "No description provided for this medical department specialty."}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingId ? "Modify Department" : "Create Department"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Department Name</label>
                <input
                  type="text"
                  placeholder="Cardiology"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <textarea
                  placeholder="Clinical diagnostic and surgical treatments for cardiovascular health."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 flex items-center gap-2"
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
export default Departments;
