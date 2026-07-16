import React from "react";
import { useTheme } from "../contexts/ThemeContext";

export const Footer: React.FC = () => {
  const { hospitalConfig } = useTheme();

  return (
    <footer className="py-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-400">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <p>
          &copy; {new Date().getFullYear()} {hospitalConfig?.branding.name || "Hospital AI SaaS"}.
          All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            Privacy Policy
          </span>
          <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            Terms of Service
          </span>
          <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            Support
          </span>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
