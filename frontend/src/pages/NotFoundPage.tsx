import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950/50">
      <div className="max-w-md w-full p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center">
        <div className="inline-flex p-3 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 mb-4">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">404</h1>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Page Not Found</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The page you are looking for might have been removed, had its name changed, or is
          temporarily unavailable.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};
export default NotFoundPage;
