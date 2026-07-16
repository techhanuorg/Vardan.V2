import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { PlusCircle, Search, Edit2, Trash2, Loader2 } from "lucide-react";

interface Doctor {
  id: string;
  doctorId: string;
  name: string;
  qualification: string;
  experience: string;
  fees: number;
  roomNumber?: string | null;
  department: { name: string };
  departmentId: string;
}

interface Department {
  id: string;
  name: string;
}

export const Doctors: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deptId, setDeptId] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [fees, setFees] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/doctors", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setDoctors(payload.data);
      }
    } catch (e) {
      showToast("Failed to fetch doctors registry.", "error");
    }
  }, [accessToken, showToast]);

  const fetchDepts = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/departments", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setDepts(payload.data);
        if (payload.data.length > 0) setDeptId(payload.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }, [accessToken]);

  useEffect(() => {
    Promise.all([fetchDoctors(), fetchDepts()]).finally(() => {
      setLoading(false);
    });
  }, [fetchDoctors, fetchDepts]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setQualification("");
    setExperience("");
    setFees("");
    setRoomNumber("");
    if (depts.length > 0) setDeptId(depts[0].id);
    setShowModal(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setEditingId(doc.id);
    setName(doc.name);
    setDeptId(doc.departmentId);
    setQualification(doc.qualification);
    setExperience(doc.experience);
    setFees(doc.fees.toString());
    setRoomNumber(doc.roomNumber || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const url = editingId
      ? `http://localhost:5000/api/v1/dashboard/doctors/${editingId}`
      : "http://localhost:5000/api/v1/dashboard/doctors";
    const method = editingId ? "PUT" : "POST";
    const body = { name, departmentId: deptId, qualification, experience, fees, roomNumber };

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
        showToast(editingId ? "Doctor profile modified." : "Doctor registered successfully.", "success");
        setShowModal(false);
        fetchDoctors();
      } else {
        showToast(payload.message || "Failed to save details.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Archive this doctor's profile?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/dashboard/doctors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        showToast("Profile archived.", "success");
        fetchDoctors();
      } else {
        showToast("Failed to archive profile.", "error");
      }
    } catch (e) {
      showToast("Server connection error.", "error");
    }
  };

  const filteredDocs = doctors.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.qualification.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Doctors Registry
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage hospital clinicians, set consult rooms, and edit qualifications.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Add Physician
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-4.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search clinicians by name, degree, or specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Grid of Doctor Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Fetching physicians registry...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <p className="text-center py-12 text-sm text-slate-400 font-medium bg-white dark:bg-slate-900 border rounded-3xl">
          No records matching search query.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black">
                    {doc.name.charAt(0)}
                  </div>
                  <div className="space-x-1 flex">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg border border-rose-50 dark:border-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{doc.name}</h3>
                <p className="text-xs text-slate-400 font-semibold">{doc.department.name} Specialist</p>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500 font-medium">
                  <p>Degree: <span className="text-slate-700 dark:text-slate-300">{doc.qualification}</span></p>
                  <p>Experience: <span className="text-slate-700 dark:text-slate-300">{doc.experience}</span></p>
                  <p>Consult Room: <span className="text-slate-700 dark:text-slate-300">{doc.roomNumber || "N/A"}</span></p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold uppercase">Consultation Fee</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">₹{doc.fees}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingId ? "Modify Physician Profile" : "Register Physician"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Doctor Name</label>
                <input
                  type="text"
                  placeholder="Dr. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Specialty Department</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl bg-white dark:bg-slate-900"
                >
                  {depts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qualification</label>
                  <input
                    type="text"
                    placeholder="MD, MBBS"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Experience</label>
                  <input
                    type="text"
                    placeholder="8 years"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Consulting Fee</label>
                  <input
                    type="number"
                    placeholder="500"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Room Number</label>
                  <input
                    type="text"
                    placeholder="Room 102"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl"
                  />
                </div>
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
export default Doctors;
