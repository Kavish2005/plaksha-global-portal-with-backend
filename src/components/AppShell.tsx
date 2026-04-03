"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeUser, loading } = useAuth();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (loading) return;

    if (!activeUser && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (activeUser && isLoginPage) {
      router.replace(activeUser.role === "student" ? "/" : activeUser.role === "admin" ? "/admin" : "/admin/mentors");
    }
  }, [activeUser, isLoginPage, loading, router]);

  if (loading) {
    return <div className="min-h-screen bg-[var(--portal-cream)] px-6 py-16 text-[var(--portal-ink)]">Loading...</div>;
  }

  if (!activeUser && !isLoginPage) {
    return <div className="min-h-screen bg-[var(--portal-cream)]" />;
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[var(--portal-cream)] text-[var(--portal-ink)]">
        <main>{children}</main>
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--portal-cream)] text-[var(--portal-ink)]">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <Chatbot />
      <Toaster position="top-right" />
    </div>
  );
}
