"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "./api-client";

export type AdminUser = { id: number; email: string };

type AdminAuthContextValue = {
  admin: AdminUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

// Mirrors the e-commerce app's auth-context.tsx pattern: ask the backend
// "who's signed in?" once on mount (via the httpOnly cookie the browser
// sends automatically) and cache the answer for every component under
// /admin to read via useAdminAuth().
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await apiFetch<{ admin: AdminUser | null }>("/api/auth/me");
      setAdmin(data.admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setAdmin(null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session fetch on mount
    refresh();
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refresh, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
