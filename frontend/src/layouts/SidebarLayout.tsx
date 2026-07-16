import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext.js";
import {
  LayoutDashboard,
  Users,
  Brain,
  MessageSquare,
  Settings,
  User,
  Hospital,
  Calendar,
  HelpCircle,
  Megaphone,
  Table,
  BarChart2,
  ScrollText,
  ShieldAlert,
} from "lucide-react";

export const SidebarLayout: React.FC = () => {
  const { hospitalConfig } = useTheme();
  const location = useLocation();

  if (!hospitalConfig) return null;

  const { branding } = hospitalConfig;

  const navigationItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      enabled: true,
    },
    {
      name: "Patients",
      path: "/dashboard/patients",
      icon: Users,
      enabled: true,
    },
    {
      name: "Doctors",
      path: "/dashboard/doctors",
      icon: User,
      enabled: true,
    },
    {
      name: "Departments",
      path: "/dashboard/departments",
      icon: Hospital,
      enabled: true,
    },
    {
      name: "Appointments",
      path: "/dashboard/appointments",
      icon: Calendar,
      enabled: true,
    },
    {
      name: "AI Settings",
      path: "/dashboard/ai",
      icon: Brain,
      enabled: true,
    },
    {
      name: "WhatsApp",
      path: "/dashboard/whatsapp",
      icon: MessageSquare,
      enabled: true,
    },
    {
      name: "Knowledge Base",
      path: "/dashboard/kb",
      icon: HelpCircle,
      enabled: true,
    },
    {
      name: "Campaigns",
      path: "/dashboard/campaigns",
      icon: Megaphone,
      enabled: true,
    },
    {
      name: "Analytics",
      path: "/dashboard/analytics",
      icon: BarChart2,
      enabled: true,
    },
    {
      name: "Google Sheets",
      path: "/dashboard/sheets",
      icon: Table,
      enabled: true,
    },
    {
      name: "System Logs",
      path: "/dashboard/logs",
      icon: ScrollText,
      enabled: true,
    },
    {
      name: "Settings",
      path: "/dashboard/settings",
      icon: Settings,
      enabled: true,
    },
  ];


  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-screen overflow-y-auto">
      {/* Header / Brand Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
          {branding.shortName.charAt(0)}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
            {branding.name}
          </span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
            SaaS Portal
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigationItems
          .filter((item) => item.enabled)
          .map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
      </nav>

      {/* Footer Identity */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              HIPAA Certified
            </span>
            <span className="text-[9px] text-slate-400">Strict Data Privacy</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default SidebarLayout;
