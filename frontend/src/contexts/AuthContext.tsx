import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  status: string;
  role: {
    id?: string;
    name: string;
    permissions: { name: string }[];
  };
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = "http://localhost:5000/api/v1";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (token: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        return payload.data;
      }
    } catch (error) {
      console.error("Failed to fetch user profile", error);
    }
    return null;
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem("refreshToken");
    if (!storedRefresh) {
      logout();
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (res.ok) {
        const payload = await res.json();
        const { accessToken: newAccess, refreshToken: newRefresh } = payload.data;
        localStorage.setItem("accessToken", newAccess);
        localStorage.setItem("refreshToken", newRefresh);
        setAccessToken(newAccess);
        const profile = await fetchProfile(newAccess);
        if (profile) {
          setUser(profile);
          return true;
        }
      }
    } catch (error) {
      console.error("Session refresh failed", error);
    }

    logout();
    return false;
  }, [fetchProfile]);

  const login = async (access: string, refresh: string) => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    setAccessToken(access);
    const profile = await fetchProfile(access);
    setUser(profile);
  };

  const logout = useCallback(async () => {
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (error) {
        console.error("Logout request failed", error);
      }
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setAccessToken(null);
    setUser(null);
  }, [accessToken]);

  // Initial load
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken) {
        const profile = await fetchProfile(accessToken);
        if (profile) {
          setUser(profile);
          setLoading(false);
          return;
        }
      }

      // Try refresh if profile fetch failed or no access token exists but refresh exists
      const refreshOk = await refreshSession();
      if (!refreshOk) {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [accessToken, fetchProfile, refreshSession]);

  // Background token refreshing every 10 minutes
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(
      () => {
        refreshSession();
      },
      10 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [accessToken, refreshSession]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.role.name === "Owner" || user.role.name === "ADMIN") return true;
      return user.role.permissions.some((p) => p.name === permission);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        refreshSession,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
