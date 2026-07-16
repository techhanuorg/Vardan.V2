import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { Search, PlusCircle, Calendar, MessageCircle, FileText, ChevronRight, Loader2, ArrowLeft } from "lucide-react";

interface Patient {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  gender: string;
  age: number;
  dob: string;
  address: string;
  bloodGroup?: string | null;
  email?: string | null;
  medicalNotes?: string | null;
  createdAt: string;
}

export const Patients: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState("");

  // Detail view state
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("MALE");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/patients", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setPatients(payload.data);
      }
    } catch (e) {
      showToast("Failed to fetch patients list.", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, phone, gender, age, dob, address, email, bloodGroup }),
      });
      const payload = await res.json();
      if (res.ok) {
        showToast("Patient registered successfully.", "success");
        setShowModal(false);
        fetchPatients();
      } else {
        showToast(payload.message || "Failed to create patient.", "error");
      }
    } catch (e) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = selectedGender === "" || p.gender === selectedGender;
    return matchesSearch && matchesGender;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {activePatient ? (
        // Patient Details Profile View
        <div className="space-y-6">
          <button
            onClick={() => setActivePatient(null)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </button>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
                {activePatient.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activePatient.name}</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full font-mono">
                    {activePatient.patientId}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {activePatient.gender} • {activePatient.age} years old • DOB: {new Date(activePatient.dob).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-400 uppercase">Phone</span>
                <p className="font-semibold text-slate-700 dark:text-slate-350">+{activePatient.phone}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-400 uppercase">Blood Group</span>
                <p className="font-semibold text-slate-700 dark:text-slate-350">{activePatient.bloodGroup || "Unknown"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-primary" />
                Clinical Case Notes
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-850/40 p-4 rounded-2xl font-medium border">
                {activePatient.medicalNotes || "No medical history recorded for this patient yet."}
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-primary" />
                Consultation History
              </h3>
              <p className="text-xs text-slate-400 text-center py-6">No appointment history mapped.</p>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MessageCircle className="h-4.5 w-4.5 text-primary" />
                Recent Whatsapp Chats
              </h3>
              <p className="text-xs text-slate-400 text-center py-6">No messaging logs synced.</p>
            </div>
          </div>
        </div>
      ) : (
        // Patient Directory List
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Patients Registry
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Search diagnostic profiles, view case notes, and track appointments.
              </p>
            </div>
            <button
              onClick={() => {
                setName("");
                setPhone("");
                setAge("");
                setDob("");
                setAddress("");
                setEmail("");
                setBloodGroup("");
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              Register Patient
            </button>
          </div>

          {/* Search filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="px-4 py-2 border rounded-2xl text-sm bg-white dark:bg-slate-900"
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Registry Table */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm">Fetching registry files...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <p className="text-center py-12 text-sm text-slate-400 font-medium">
                No patient directory records match search filters.
              </p>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Patient ID</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Gender / Age</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {filteredPatients.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setActivePatient(p)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-400">
                        {p.patientId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-405">
                        {p.gender} / {p.age} yrs
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-405">
                        +{p.phone}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <ChevronRight className="h-4.5 w-4.5 text-slate-300 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Patient Registration
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp Phone</label>
                <input
                  type="text"
                  placeholder="919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl bg-white dark:bg-slate-900"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl text-slate-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Blood Group</label>
                  <input
                    type="text"
                    placeholder="O+"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Patients;
