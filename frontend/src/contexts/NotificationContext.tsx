import React, { createContext, useContext, useState, useCallback } from "react";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: Date;
  read: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  duration?: number;
}

interface NotificationContextType {
  notifications: SystemNotification[];
  toasts: ToastItem[];
  addNotification: (title: string, message: string, type: SystemNotification["type"]) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  showToast: (message: string, type?: ToastItem["type"], duration?: number) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addNotification = useCallback(
    (title: string, message: string, type: SystemNotification["type"]) => {
      const newNotification: SystemNotification = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        message,
        type,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastItem["type"] = "info", duration = 3000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, message, type, duration };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        dismissToast(id);
      }, duration);
    },
    [dismissToast]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        addNotification,
        markAsRead,
        clearNotifications,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
