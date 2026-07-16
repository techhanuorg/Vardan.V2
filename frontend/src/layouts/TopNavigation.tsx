import { useTheme } from "../contexts/ThemeContext.js";
import { Sun, Moon, Bell, Search, LogOut } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext.js";
import { useAuth } from "../contexts/AuthContext.js";

export const TopNavigation: React.FC = () => {
  const { theme, setTheme, hospitalConfig } = useTheme();
  const { notifications } = useNotifications();
  const { user, logout } = useAuth();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar Scaffold */}
      <div className="relative max-w-md w-full hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search records, appointments, or patients..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          disabled
        />
      </div>

      {/* Domain Indicator */}
      <div className="md:hidden">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          {hospitalConfig?.branding.shortName}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Icon */}
        <button
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 relative transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Info Scaffold */}
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300">
            {user?.name.charAt(0) || "U"}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {user?.name || "Guest"}
            </span>
            <span className="text-xs text-slate-400">{user?.role.name || "Access Account"}</span>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
export default TopNavigation;

