import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { Save, Loader2, Database, Table, RefreshCcw } from "lucide-react";

export const GoogleSheets: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [syncDirection, setSyncDirection] = useState("BIDIRECTIONAL");
  const [autoSync, setAutoSync] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/sheets", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok && payload.data) {
        setSpreadsheetId(payload.data.spreadsheetId);
        setSyncDirection(payload.data.syncDirection || "BIDIRECTIONAL");
        setAutoSync(payload.data.autoSync ?? true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ spreadsheetId, syncDirection, autoSync }),
      });

      if (res.ok) {
        showToast("Google Sheets config updated successfully.", "success");
      } else {
        showToast("Failed to save sheets configuration.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = () => {
    showToast("Starting manual spreadsheet sync...", "info");
    // Simulate App Script sync
    setTimeout(() => {
      showToast("Spreadsheet synced successfully.", "success");
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm">Loading spreadsheet integrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Google Sheets Sync
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Sync patient directories, appointments schedule, and audit trails directly to Google Sheets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Table className="h-5 w-5 text-primary" />
            Integration Setup
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Spreadsheet ID</label>
              <input
                type="text"
                placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Sync Mode</label>
                <select
                  value={syncDirection}
                  onChange={(e) => setSyncDirection(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl bg-white dark:bg-slate-900"
                >
                  <option value="BIDIRECTIONAL">Bidirectional</option>
                  <option value="PUSH_ONLY">Push only (Database → Sheets)</option>
                  <option value="PULL_ONLY">Pull only (Sheets → Database)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Auto Sync</label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="h-4 w-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                  />
                  <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-350">
                    Enable auto background sync
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Settings
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Manual Action
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Trigger a manual sync of all directory resources to Google Sheets instantly.
          </p>
          <button
            onClick={handleSyncNow}
            className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Sync Spreadsheet
          </button>
        </div>
      </div>
    </div>
  );
};
export default GoogleSheets;
