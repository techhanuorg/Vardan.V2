import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { Loader2 } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  target: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { name: string } | null;
}

export const AuditLogs: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/logs", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setLogs(payload.data);
      }
    } catch (e) {
      showToast("Failed to fetch audit trails.", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm">Retrieving security audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System Audit Logs
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Track security updates, active profile logins, and system changes.
        </p>
      </div>

      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
        {logs.length === 0 ? (
          <p className="text-center py-12 text-sm text-slate-400 font-medium">
            No system actions recorded in the audit trail.
          </p>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Metadata</th>
                <th className="py-3.5 px-4">Network IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-850 dark:text-slate-250">
                    {log.user?.name || "System Agent"}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-350">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400 font-medium">
                    {log.target}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    {log.ipAddress || "Localhost"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default AuditLogs;
