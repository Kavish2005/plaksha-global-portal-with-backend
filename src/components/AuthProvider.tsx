"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, clearStoredUser, DEMO_USER_STORAGE_KEY } from "@/services/api";
import type { AuthOptions, DemoUser } from "@/types";

type AuthContextValue = {
  adminOptions: DemoUser[];
  mentorOptions: DemoUser[];
  activeUser: DemoUser | null;
  loading: boolean;
  login: (payload: { role: "student" | "admin" | "mentor"; email: string; name?: string }) => Promise<DemoUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminOptions, setAdminOptions] = useState<DemoUser[]>([]);
  const [mentorOptions, setMentorOptions] = useState<DemoUser[]>([]);
  const [activeUser, setActiveUserState] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuthState() {
      try {
        const options = await apiGet<AuthOptions>("/auth/options");
        setAdminOptions(options.admins);
        setMentorOptions(options.mentors);

        const stored = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
        let parsed: DemoUser | null = null;
        if (stored) {
          try {
            parsed = JSON.parse(stored) as DemoUser;
          } catch (_error) {
            window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
          }
        }

        if (parsed) {
          try {
            const me = await apiGet<DemoUser>("/me");
            window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(me));
            setActiveUserState(me);
          } catch (_error) {
            clearStoredUser();
            setActiveUserState(null);
          }
        } else {
          setActiveUserState(null);
        }
      } catch (_error) {
        setAdminOptions([]);
        setMentorOptions([]);
        setActiveUserState(null);
      } finally {
        setLoading(false);
      }
    }

    void loadAuthState();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      adminOptions,
      mentorOptions,
      activeUser,
      loading,
      login: async (payload) => {
        const user = await apiPost<DemoUser>("/auth/login", payload);
        window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
        setActiveUserState(user);
        return user;
      },
      logout: async () => {
        try {
          await apiPost("/auth/logout");
        } catch (_error) {
          // Local logout should still work even if the backend is unavailable.
        }
        clearStoredUser();
        setActiveUserState(null);
      },
    }),
    [activeUser, adminOptions, loading, mentorOptions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
