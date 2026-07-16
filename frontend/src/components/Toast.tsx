import React from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Info;
          let iconColor = "text-sky-500";
          let bgColor = "bg-white dark:bg-slate-900 border-sky-100 dark:border-sky-900";

          switch (toast.type) {
            case "success":
              Icon = CheckCircle;
              iconColor = "text-emerald-500";
              bgColor = "bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900";
              break;
            case "warning":
              Icon = AlertTriangle;
              iconColor = "text-amber-500";
              bgColor = "bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900";
              break;
            case "error":
              Icon = XCircle;
              iconColor = "text-rose-500";
              bgColor = "bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900";
              break;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg glass pointer-events-auto ${bgColor}`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {toast.message}
              </p>
              <button
                onClick={() => dismissToast(toast.id)}
                className="ml-auto p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
