import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please enter email and password.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const payload = await res.json();

      if (res.ok) {
        const { accessToken, refreshToken } = payload.data;
        await login(accessToken, refreshToken);
        showToast("Login successful.", "success");
        navigate("/dashboard");
      } else {
        showToast(payload.message || "Invalid credentials.", "error");
      }
    } catch (error) {
      showToast("Connection to server failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      {/* Background radial effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[30%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[70vw] h-[70vw] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative max-w-md w-full p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-2xl glass animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-xl shadow-lg shadow-primary/20 mb-4">
            V
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign In
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access your secure white-label medical workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
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

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5.5 w-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary/20"
            />
            <label htmlFor="remember" className="text-xs font-semibold text-slate-600 dark:text-slate-400 select-none cursor-pointer">
              Remember me for 30 days
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
