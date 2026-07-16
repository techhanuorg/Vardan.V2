import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { PlusCircle, Search, Loader2, Megaphone } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
}

export const Campaigns: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/campaigns", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setCampaigns(payload.data);
      }
    } catch (e) {
      showToast("Failed to fetch campaigns.", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, scheduledAt: scheduledAt || null }),
      });

      const payload = await res.json();
      if (res.ok) {
        showToast("Campaign broadcast scheduled successfully.", "success");
        setShowModal(false);
        fetchCampaigns();
      } else {
        showToast(payload.message || "Failed to create campaign.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Marketing Campaigns
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Send WhatsApp broadcasts, manage health reminders, and preview patient campaigns.
          </p>
        </div>
        <button
          onClick={() => {
            setName("");
            setScheduledAt("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Schedule Broadcast
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-4.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search campaigns by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Fetching campaigns list...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <p className="text-center py-12 text-sm text-slate-400 font-medium bg-white dark:bg-slate-900 border rounded-3xl">
          No active broadcasts scheduled. Schedule a campaign to broadcast.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredCampaigns.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                    {c.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">{c.name}</h3>
                <p className="text-xs text-slate-400 font-semibold">Created: {new Date(c.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold uppercase">Scheduled Time</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-350">
                  {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "Manual trigger"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Schedule Broadcast Campaign
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Campaign Title</label>
                <input
                  type="text"
                  placeholder="Flu Vaccination Drive"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Broadcast Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-slate-650"
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
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Campaigns;
