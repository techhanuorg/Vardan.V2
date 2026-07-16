import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { useNotifications } from "../contexts/NotificationContext.js";
import {
  QrCode,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  MessageCircle,
  Loader2,
} from "lucide-react";

interface WhatsAppDeviceInfo {
  whatsappName?: string | null;
  whatsappId?: string | null;
  platform?: string | null;
  phone?: string | null;
  status: string;
  lastConnected?: string | null;
}

export const WhatsAppSettings: React.FC = () => {
  const { accessToken, user } = useAuth();
  const { showToast } = useNotifications();

  const [status, setStatus] = useState<string>("DISCONNECTED");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [device, setDevice] = useState<WhatsAppDeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/whatsapp/status", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setStatus(payload.data.status);
        setQrUrl(payload.data.qr);
        setDevice(payload.data.device);
      }
    } catch (error) {
      console.error("Failed to load WhatsApp status", error);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Polling loop for active connection status when connecting
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(
      () => {
        fetchStatus();
      },
      status === "CONNECTING" ? 3000 : 10000
    );

    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  const handleConnect = async () => {
    setActioning(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/whatsapp/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        showToast("WhatsApp connection loop initialized.", "success");
        setStatus("CONNECTING");
        fetchStatus();
      } else {
        showToast("Failed to initialize connection.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setActioning(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your WhatsApp session? This will stop all automation hooks.")) return;

    setActioning(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/whatsapp/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        showToast("Session disconnected and cleared.", "success");
        setStatus("DISCONNECTED");
        setQrUrl(null);
        setDevice(null);
        fetchStatus();
      } else {
        showToast("Failed to disconnect session.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setActioning(false);
    }
  };

  const handleReconnect = async () => {
    setActioning(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/whatsapp/reconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        showToast("WhatsApp reconnect cycle dispatched.", "success");
        setStatus("CONNECTING");
        fetchStatus();
      } else {
        showToast("Failed to dispatch reconnect cycle.", "error");
      }
    } catch (error) {
      showToast("Server connection error.", "error");
    } finally {
      setActioning(false);
    }
  };

  const isOwner = user?.role.name === "Owner" || user?.role.name === "ADMIN";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          WhatsApp Center
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Pair local WhatsApp JID accounts, view linked devices, and check sync health.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Connection
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Engine Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        status === "CONNECTED"
                          ? "bg-emerald-500 animate-pulse"
                          : status === "CONNECTING"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {status}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  {status === "DISCONNECTED" && isOwner && (
                    <button
                      onClick={handleConnect}
                      disabled={actioning}
                      className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-sm hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <QrCode className="h-4 w-4" />
                      Generate Pairing QR
                    </button>
                  )}

                  {status === "CONNECTED" && isOwner && (
                    <>
                      <button
                        onClick={handleReconnect}
                        disabled={actioning}
                        className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Restart Session
                      </button>
                      <button
                        onClick={handleDisconnect}
                        disabled={actioning}
                        className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </button>
                    </>
                  )}

                  {status === "CONNECTING" && (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs text-slate-400 font-medium">
                        Initializing sockets...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pairing Flow / QR Page */}
        <div className="lg:col-span-2 space-y-6">
          {status === "CONNECTING" && qrUrl ? (
            <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Pair Your Device
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Open WhatsApp on your device, navigate to Linked Devices, and scan this QR code to associate your account.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-inner">
                <img src={qrUrl} alt="WhatsApp Pairing QR Code" className="h-48 w-48 select-none" />
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3.5 py-1.5 rounded-full">
                <AlertTriangle className="h-3.5 w-3.5" />
                This code rotates automatically every 20 seconds.
              </div>
            </div>
          ) : status === "CONNECTED" && device ? (
            <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Session Active
                    </h3>
                    <p className="text-xs text-slate-400">
                      Channel actively routing message receipts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Device User</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {device.whatsappName || "Linked Client"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Phone Number</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    +{device.phone || "Not Synced"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Platform</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {device.platform || "Baileys"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Last Connected</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {device.lastConnected ? new Date(device.lastConnected).toLocaleString() : "Syncing..."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  No Active Connection
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Click &quot;Generate Pairing QR&quot; to initialize connection sockets and pair your hospital mobile device.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default WhatsAppSettings;
