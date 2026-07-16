import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { Loader2, TrendingUp, BarChart2, Brain } from "lucide-react";

interface AnalyticsStats {
  usage: {
    totalTokens: number;
    totalRequests: number;
  };
  counts: {
    patients: number;
    appointments: number;
  };
}

export const Analytics: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [usageRes, statsRes] = await Promise.all([
        fetch("http://localhost:5000/api/v1/ai/usage", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch("http://localhost:5000/api/v1/dashboard/stats", { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);

      const usagePayload = await usageRes.json();
      const statsPayload = await statsRes.json();

      if (usageRes.ok && statsRes.ok) {
        setStats({
          usage: usagePayload.data,
          counts: statsPayload.data.counts,
        });
      }
    } catch (e) {
      showToast("Failed to load analytics statistics.", "error");
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
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm">Compiling diagnostic analytics charts...</p>
      </div>
    );
  }

  // Sample SVG Chart calculations
  const totalPatients = stats?.counts?.patients || 0;
  const totalAppts = stats?.counts?.appointments || 0;
  const totalTokens = stats?.usage?.totalTokens || 0;
  const totalRequests = stats?.usage?.totalRequests || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Performance Analytics
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Monitor token usages, patient registration throughput, and clinic operations graphs.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Volume</span>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{totalPatients}</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
            <TrendingUp className="h-3 w-3" />
            +14.2% Growth
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Consults</span>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{totalAppts}</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
            <TrendingUp className="h-3 w-3" />
            +8.5% Growth
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Operations</span>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{totalRequests}</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
            <TrendingUp className="h-3 w-3" />
            +22.4% Increase
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Token Usages</span>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{totalTokens.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
            <TrendingUp className="h-3 w-3" />
            +12.8% Increase
          </div>
        </div>
      </div>

      {/* SVG Charts Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="h-4.5 w-4.5 text-primary" />
            Clinic Volume (Weekly)
          </h3>
          <div className="h-48 w-full flex items-end justify-between px-4 pt-6 border-b border-l border-slate-100 dark:border-slate-800">
            {/* SVG columns representing diagnostic volumes */}
            <div className="w-8 bg-primary/25 hover:bg-primary/45 h-16 rounded-t-lg transition-colors flex items-center justify-center text-[10px] font-bold text-primary pb-1">M</div>
            <div className="w-8 bg-primary/25 hover:bg-primary/45 h-24 rounded-t-lg transition-colors flex items-center justify-center text-[10px] font-bold text-primary pb-1">T</div>
            <div className="w-8 bg-primary/25 hover:bg-primary/45 h-32 rounded-t-lg transition-colors flex items-center justify-center text-[10px] font-bold text-primary pb-1">W</div>
            <div className="w-8 bg-primary/25 hover:bg-primary/45 h-28 rounded-t-lg transition-colors flex items-center justify-center text-[10px] font-bold text-primary pb-1">T</div>
            <div className="w-8 bg-primary/25 hover:bg-primary/45 h-40 rounded-t-lg transition-colors flex items-center justify-center text-[10px] font-bold text-primary pb-1">F</div>
            <div className="w-8 bg-primary/25 hover:bg-primary/45 h-20 rounded-t-lg transition-colors flex items-center justify-center text-[10px] font-bold text-primary pb-1">S</div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Brain className="h-4.5 w-4.5 text-primary" />
            AI Efficiency Throughput
          </h3>
          <div className="h-48 w-full flex items-end justify-between px-4 pt-6 border-b border-l border-slate-100 dark:border-slate-800">
            {/* SVG line-graphs approximation for performance and latency */}
            <div className="w-8 bg-primary/20 h-10 rounded-t-lg flex items-center justify-center text-[10px] font-bold pb-1">Q1</div>
            <div className="w-8 bg-primary/20 h-20 rounded-t-lg flex items-center justify-center text-[10px] font-bold pb-1">Q2</div>
            <div className="w-8 bg-primary/20 h-28 rounded-t-lg flex items-center justify-center text-[10px] font-bold pb-1">Q3</div>
            <div className="w-8 bg-primary/20 h-36 rounded-t-lg flex items-center justify-center text-[10px] font-bold pb-1">Q4</div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Analytics;
