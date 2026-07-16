import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { PlusCircle, Search, Edit2, Trash2, Loader2, HelpCircle } from "lucide-react";

interface Faq {
  id: string;
  question: string;
  answer: string;
}

export const KnowledgeBase: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useNotifications();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/dashboard/faqs", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setFaqs(payload.data);
      }
    } catch (e) {
      showToast("Failed to fetch FAQs.", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setShowModal(true);
  };

  const handleOpenEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const url = editingId
      ? `http://localhost:5000/api/v1/dashboard/faqs/${editingId}`
      : "http://localhost:5000/api/v1/dashboard/faqs";
    const method = editingId ? "PUT" : "POST";
    const body = { question, answer };

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
        showToast(editingId ? "FAQ modified." : "FAQ created successfully.", "success");
        setShowModal(false);
        fetchFaqs();
      } else {
        showToast(payload.message || "Failed to save FAQ.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this FAQ entry?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/dashboard/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        showToast("FAQ removed.", "success");
        fetchFaqs();
      } else {
        showToast("Failed to remove FAQ.", "error");
      }
    } catch (e) {
      showToast("Server connection error.", "error");
    }
  };

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Configure triage FAQs, hospital timing rules, and symptoms guidelines.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Add FAQ
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-4.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search FAQs by keywords, questions, or answers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm">Fetching FAQ articles...</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <p className="text-center py-12 text-sm text-slate-400 font-medium bg-white dark:bg-slate-900 border rounded-3xl">
          No FAQ articles configured. Click &quot;Add FAQ&quot; to start building your knowledge base.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                  {faq.question}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 pl-6.5 leading-relaxed font-medium">
                  {faq.answer}
                </p>
              </div>
              <div className="space-x-1 flex pl-6.5 md:pl-0">
                <button
                  onClick={() => handleOpenEdit(faq)}
                  className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(faq.id)}
                  className="p-1.5 rounded-lg border border-rose-50 dark:border-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
              {editingId ? "Modify FAQ Entry" : "Create FAQ Entry"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Question</label>
                <input
                  type="text"
                  placeholder="What are the consulting hours?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Answer</label>
                <textarea
                  placeholder="Consulting hours are Monday through Saturday, 9:00 AM to 6:00 PM."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
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
    </div>
  );
};
export default KnowledgeBase;
