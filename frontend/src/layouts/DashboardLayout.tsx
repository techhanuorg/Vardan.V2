import React from "react";
import { Outlet } from "react-router-dom";
import SidebarLayout from "./SidebarLayout";
import TopNavigation from "./TopNavigation";
import Footer from "./Footer";

export const DashboardLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Navigation */}
      <SidebarLayout />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavigation />

        {/* Dynamic Page Scroll Workspace */}
        <main className="flex-1 overflow-y-auto p-6 focus:outline-none">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Footer info */}
        <Footer />
      </div>
    </div>
  );
};
export default DashboardLayout;
