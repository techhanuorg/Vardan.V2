import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import {
  Users,
  Calendar,
  MessageSquare,
  Activity,
  CheckCircle,
  Cpu,
  RefreshCw,
} from "lucide-react";

interface StatsData {
  counts: {
    patients: number;
    doctors: number;
    appointments: number;
    todayNewPatients: number;
  };
  todayAppointments: {
    id: string;
    patient: { name: string };
    doctor: { name: string };
    reason: string;
    status: string;
  }[];
  whatsappStatus: string;
  connectedDevice: {
    whatsappName?: string | null;
    phone?: string | null;
  } | null;
}

export const HomeDashboard: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/stats", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setStats(payload.data);
      }
    } catch (e) {
      showToast("Failed to compile overview stats.", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm">Compiling home dashboard feeds...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Workspace Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Real-time hospital operations, active syncs, and system health triggers.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats();
          }}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients</span>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {stats?.counts.patients || 0}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Today</span>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {stats?.counts.todayNewPatients || 0}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appointments</span>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {stats?.counts.appointments || 0}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {stats?.counts.doctors || 0}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side: Sync Indicators */}
        <div className="lg:col-span-1 space-y-6">
          {/* WhatsApp Card */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              WhatsApp Engine
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Status</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    stats?.whatsappStatus === "CONNECTED" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                  {stats?.whatsappStatus}
                </span>
              </div>
            </div>
            {stats?.connectedDevice && (
              <div className="text-xs space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <p className="text-slate-400">Device User: <span className="font-semibold text-slate-600 dark:text-slate-300">{stats.connectedDevice.whatsappName}</span></p>
                <p className="text-slate-400">Phone: <span className="font-semibold text-slate-600 dark:text-slate-300">+{stats.connectedDevice.phone}</span></p>
              </div>
            )}
          </div>

          {/* AI Card */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              AI Copilot Brain
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">State</span>
              <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Today's Appointments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Next Appointments
              </h3>
            </div>

            {!stats?.todayAppointments || stats.todayAppointments.length === 0 ? (
              <p className="text-center py-12 text-sm text-slate-400 font-medium">
                No upcoming consultations scheduled.
              </p>
            ) : (
              <div className="space-y-4">
                {stats.todayAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-850/40 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {appt.patient.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Consultant: {appt.doctor.name} • {appt.reason}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomeDashboard;
