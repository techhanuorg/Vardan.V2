import React from "react";
import { Activity } from "lucide-react";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* Animated medical pulse icon */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full bg-primary/20 animate-ping" />
          <div className="relative p-4 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-lg text-primary">
            <Activity className="h-8 w-8 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Loading System</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verifying secure database pipelines...
          </p>
        </div>
      </div>
    </div>
  );
};
export default LoadingScreen;
