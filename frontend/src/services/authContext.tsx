import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, getErrorMessage } from "./api";
import { queryClient } from "./queryClient";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: User["role"]) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileInflight = useRef<Promise<void> | null>(null);

  const refreshProfile = useCallback(async () => {
    if (profileInflight.current) return profileInflight.current;
    const p = (async () => {
      const t = localStorage.getItem("token");
      setToken(t);
      if (!t) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get<User>("/api/auth/profile");
        setUser(data);
        setError(null);
      } catch (e) {
        setUser(null);
        setError(getErrorMessage(e));
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
    const tracked = p.finally(() => {
      profileInflight.current = null;
    });
    profileInflight.current = tracked;
    return tracked;
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    setError(null);
    const { data } = await api.post<{ access_token: string }>("/api/auth/login", { email, password });
    localStorage.setItem("token", data.access_token);
    setLoading(true);
    await refreshProfile();
  };

  const register = async (name: string, email: string, password: string, role: User["role"]) => {
    setError(null);
    const { data } = await api.post<User>("/api/auth/register", { name, email, password, role });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      token,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, loading, error, token, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
