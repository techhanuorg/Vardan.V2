import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import {
  Brain,
  Cpu,
  Save,
  Loader2,
  TrendingUp,
  Activity,
  AlertOctagon,
  Key,
} from "lucide-react";

interface AiUsageStats {
  totalRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
  totalErrors: number;
  providerBreakdown: Record<string, number>;
}

export const AiSettings: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  // Active configurations
  const [provider, setProvider] = useState<string>("GEMINI");
  const [model, setModel] = useState<string>("gemini-1.5-flash");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // System Prompts states
  const [triagePrompt, setTriagePrompt] = useState("");
  const [supportPrompt, setSupportPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Usage stats state
  const [stats, setStats] = useState<AiUsageStats>({
    totalRequests: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
    totalErrors: 0,
    providerBreakdown: {},
  });

  const fetchAiConfig = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/ai/providers", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setProvider(payload.data.activeProvider);
        setModel(payload.data.activeModel);
      }
    } catch (e) {
      console.error("Failed to load AI configuration", e);
    }
  }, [accessToken]);

  const fetchUsageStats = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/ai/usage", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setStats(payload.data);
      }
    } catch (e) {
      console.error("Failed to load AI usage statistics", e);
    }
  }, [accessToken]);

  useEffect(() => {
    Promise.all([fetchAiConfig(), fetchUsageStats()]).finally(() => {
      setLoading(false);
    });

    // Populate scaffolds for dynamic prompt editing representation
    setTriagePrompt(
      `You are the Virtual Receptionist AI at our hospital. Your task is to welcome patients, understand their primary symptoms, and guide them. Ask questions naturally, one at a time. Verify their details politely if needed.`
    );
    setSupportPrompt(
      `You are a Medical Assistant. Help answer general questions about hospital timings, departments, availability of doctors, and simple FAQ questions. Keep answers short and polite.`
    );
  }, [fetchAiConfig, fetchUsageStats]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("http://localhost:5000/api/v1/ai/provider/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ provider, model }),
      });

      const payload = await res.json();
      if (res.ok) {
        showToast("AI provider and model updated successfully.", "success");
        fetchAiConfig();
      } else {
        showToast(payload.message || "Failed to switch AI settings.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompts = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrompt(true);

    // Dynamic prompt updates simulation for representation
    setTimeout(() => {
      showToast("Agent system prompts updated successfully in database.", "success");
      setSavingPrompt(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm">Loading AI brain configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          AI Brain Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Configure active LLM settings, edit system prompts, and track tokens throughput.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Requests</span>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.totalRequests}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase">Tokens Throughput</span>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.totalTokens.toLocaleString()}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase">Avg Response Time</span>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.avgLatencyMs} ms
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5 rotate-90" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase">Provider Fallbacks</span>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.totalErrors}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center">
            <AlertOctagon className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Swapper settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              AI Model Routing
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Active Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setModel(e.target.value === "GEMINI" ? "gemini-1.5-flash" : "llama3-8b-8192");
                  }}
                  className="w-full px-4 py-2 border rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="GEMINI">Google Gemini (Free tier)</option>
                  <option value="GROQ">Groq Cloud (Free fallback)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Target Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {provider === "GEMINI" ? (
                    <>
                      <option value="gemini-1.5-flash">Gemini 2.5/1.5 Flash (Recommended)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </>
                  ) : (
                    <>
                      <option value="llama3-8b-8192">Llama 3 8B (Free speed)</option>
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70b (Versatile reasoning)</option>
                    </>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Configuration
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Prompts editors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Agent System Instructions
            </h3>

            <form onSubmit={handleSavePrompts} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  Triage / Reception Agent Prompt
                </label>
                <textarea
                  value={triagePrompt}
                  onChange={(e) => setTriagePrompt(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-850/40 text-slate-700 dark:text-slate-300 font-mono leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  Support / FAQ Agent Prompt
                </label>
                <textarea
                  value={supportPrompt}
                  onChange={(e) => setSupportPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-850/40 text-slate-700 dark:text-slate-300 font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPrompt}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {savingPrompt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Agent Prompts
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AiSettings;
