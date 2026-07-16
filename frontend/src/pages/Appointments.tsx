import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { PlusCircle, Search, Edit2, Loader2, Calendar } from "lucide-react";

interface Appointment {
  id: string;
  appointmentId: string;
  patient: { name: string; phone: string };
  doctor: { name: string };
  department: { name: string };
  date: string;
  reason: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export const Appointments: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [appts, setAppts] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);

  const fetchAppts = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/appointments", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setAppts(payload.data);
      }
    } catch (e) {
      showToast("Failed to fetch appointments.", "error");
    }
  }, [accessToken, showToast]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [patRes, docRes, deptRes] = await Promise.all([
        fetch("http://localhost:5000/api/v1/dashboard/patients", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch("http://localhost:5000/api/v1/dashboard/doctors", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch("http://localhost:5000/api/v1/dashboard/departments", { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);

      const patPayload = await patRes.json();
      const docPayload = await docRes.json();
      const deptPayload = await deptRes.json();

      if (patRes.ok) {
        setPatients(patPayload.data);
        if (patPayload.data.length > 0) setPatientId(patPayload.data[0].id);
      }
      if (docRes.ok) {
        setDoctors(docPayload.data);
        if (docPayload.data.length > 0) setDoctorId(docPayload.data[0].id);
      }
      if (deptRes.ok) {
        setDepts(deptPayload.data);
        if (deptPayload.data.length > 0) setDeptId(deptPayload.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }, [accessToken]);

  useEffect(() => {
    Promise.all([fetchAppts(), fetchDependencies()]).finally(() => {
      setLoading(false);
    });
  }, [fetchAppts, fetchDependencies]);

  const handleOpenCreate = () => {
    setDate("");
    setReason("");
    setShowModal(true);
  };

  const handleOpenEdit = (appt: Appointment) => {
    setSelectedApptId(appt.id);
    setStatus(appt.status);
    setReason(appt.reason);
    setShowEditModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("http://localhost:5000/api/v1/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ patientId, doctorId, date, reason }),
      });
      const payload = await res.json();
      if (res.ok) {
        showToast("Appointment booked successfully.", "success");
        setShowModal(false);
        fetchAppts();
      } else {
        showToast(payload.message || "Failed to book appointment.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let res;
      if (status === "CANCELLED") {
        res = await fetch("http://localhost:5000/api/v1/appointments/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ appointmentId: selectedApptId }),
        });
      } else {
        res = await fetch(`http://localhost:5000/api/v1/dashboard/appointments/${selectedApptId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status, reason }),
        });
      }

      const payload = await res.json();
      if (res.ok) {
        showToast("Appointment updated.", "success");
        setShowEditModal(false);
        fetchAppts();
      } else {
        showToast(payload.message || "Failed to update appointment.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAppts = appts.filter((appt) =>
    appt.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appt.doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appt.appointmentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Consultations Schedule
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Book patient appointments, assign clinician shifts, and monitor check-in statuses.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Book Appointment
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-4.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search appointments by patient, physician, or appointment ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Schedule Registry Table */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm">Fetching schedule registry...</p>
          </div>
        ) : filteredAppts.length === 0 ? (
          <p className="text-center py-12 text-sm text-slate-400 font-medium">
            No consultations registered in system schedule.
          </p>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Clinician</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {filteredAppts.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-650 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {new Date(appt.date).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {appt.patient.name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-405">
                    {appt.doctor.name} ({appt.department.name})
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        appt.status === "CONFIRMED" || appt.status === "COMPLETED"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(appt)}
                      className="p-1 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Book Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Reserve Consultation Slot
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Select Patient</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl bg-white dark:bg-slate-900"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Select Department</label>
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Select Doctor</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl bg-white dark:bg-slate-900"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Date & Time</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-slate-600"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Reason / Symptom Notes</label>
                <input
                  type="text"
                  placeholder="Severe back pain"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
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

      {/* Edit Status Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Update Consultation
            </h3>

            <form onSubmit={handleEdit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl bg-white dark:bg-slate-900"
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="NOSHOW">No Show</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Reason / Symptom Notes</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
export default Appointments;
