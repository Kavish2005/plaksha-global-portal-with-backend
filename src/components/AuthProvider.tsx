"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, DEMO_USER_STORAGE_KEY } from "@/services/api";
import type { AuthOptions, DemoUser } from "@/types";

type AuthContextValue = {
  users: DemoUser[];
  activeUser: DemoUser | null;
  loading: boolean;
  setActiveUser: (user: DemoUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [activeUser, setActiveUserState] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const options = await apiGet<AuthOptions>("/auth/options");
        const nextUsers = [...options.students, ...options.admins];
        setUsers(nextUsers);

        const stored = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
        let parsed: DemoUser | null = null;
        if (stored) {
          try {
            parsed = JSON.parse(stored) as DemoUser;
          } catch (_error) {
            window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
          }
        }
        const matchedStored = parsed
          ? nextUsers.find((user) => user.email === parsed.email && user.role === parsed.role)
          : null;
        const fallback = matchedStored || options.students[0] || options.admins[0] || null;

        if (fallback) {
          window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(fallback));
        }

        setActiveUserState(fallback);
      } catch (_error) {
        setUsers([]);
        setActiveUserState(null);
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      users,
      activeUser,
      loading,
      setActiveUser: (user) => {
        window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
        setActiveUserState(user);
      },
    }),
    [activeUser, loading, users],
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
