import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext.js";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

export const ForgotPassword: React.FC = () => {
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await res.json();
      if (res.ok) {
        showToast(payload.message || "Reset code generated.", "success");
        // Store email temporarily for reset page transition
        sessionStorage.setItem("resetEmail", email);
        navigate("/reset-password");
      } else {
        showToast(payload.message || "Recovery request failed.", "error");
      }
    } catch (error) {
      showToast("Connection to server failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="relative max-w-md w-full p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-2xl glass animate-fade-in">
        <div className="mb-6">
          <a
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Login
          </a>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Recover Account
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Input your account email to generate a passcode.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5.5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.ai"
                className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Requesting Code...
              </>
            ) : (
              "Generate Code"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default ForgotPassword;
