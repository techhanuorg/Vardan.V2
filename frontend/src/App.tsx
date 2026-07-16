import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext.js";
import { NotificationProvider } from "./contexts/NotificationContext.js";
import { AuthProvider } from "./contexts/AuthContext.js";
import { ToastContainer } from "./components/Toast.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import LoadingScreen from "./components/LoadingScreen.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import PublicRoute from "./components/PublicRoute.js";
import DashboardLayout from "./layouts/DashboardLayout.js";
import NotFoundPage from "./pages/NotFoundPage.js";

// Lazy-loaded authentication & management pages
import Login from "./pages/Login.js";
import ForgotPassword from "./pages/ForgotPassword.js";
import ResetPassword from "./pages/ResetPassword.js";
import Profile from "./pages/Profile.js";
import UserManagement from "./pages/UserManagement.js";
import RoleManagement from "./pages/RoleManagement.js";
import PermissionManagement from "./pages/PermissionManagement.js";
import WhatsAppSettings from "./pages/WhatsAppSettings.js";
import AiSettings from "./pages/AiSettings.js";
import HomeDashboard from "./pages/HomeDashboard.js";
import Patients from "./pages/Patients.js";
import Doctors from "./pages/Doctors.js";
import Departments from "./pages/Departments.js";
import Appointments from "./pages/Appointments.js";
import KnowledgeBase from "./pages/KnowledgeBase.js";
import Campaigns from "./pages/Campaigns.js";
import Analytics from "./pages/Analytics.js";
import GoogleSheets from "./pages/GoogleSheets.js";
import AuditLogs from "./pages/AuditLogs.js";
import Settings from "./pages/Settings.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});



export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NotificationProvider>
            <AuthProvider>
              <BrowserRouter>
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    {/* Public Auth Routes */}
                    <Route element={<PublicRoute />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                    </Route>

                    {/* Private Workspace routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<DashboardLayout />}>
                        <Route index element={<HomeDashboard />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="roles" element={<RoleManagement />} />
                        <Route path="permissions" element={<PermissionManagement />} />
                        <Route path="patients" element={<Patients />} />
                        <Route path="doctors" element={<Doctors />} />
                        <Route path="departments" element={<Departments />} />
                        <Route path="appointments" element={<Appointments />} />
                        <Route path="ai" element={<AiSettings />} />
                        <Route path="whatsapp" element={<WhatsAppSettings />} />
                        <Route path="kb" element={<KnowledgeBase />} />
                        <Route path="campaigns" element={<Campaigns />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="sheets" element={<GoogleSheets />} />
                        <Route path="logs" element={<AuditLogs />} />
                        <Route path="settings" element={<Settings />} />
                      </Route>
                    </Route>

                    {/* Redirections & Errors */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
                <ToastContainer />
              </BrowserRouter>
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
