"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
    if (!activeUser && !isLoginPage) { router.replace("/login"); return; }
    if (activeUser && isLoginPage) {
      router.replace(
        activeUser.role === "student" ? "/" : activeUser.role === "admin" ? "/admin" : "/admin/mentors",
      );
    }
  }, [activeUser, isLoginPage, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
          <p className="text-sm text-slate-500">Loading Plaksha Global Portal…</p>
        </div>
      </div>
    );
  }

  if (!activeUser && !isLoginPage) {
    return <div className="min-h-screen bg-[#f8fafc]" />;
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <main>
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <Toaster position="top-right" toastOptions={{ style: { background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(15,23,42,0.08)" } }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: "easeOut" }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Chatbot />
      <Footer />
      <Toaster position="top-right" toastOptions={{ style: { background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(15,23,42,0.08)" } }} />
    </div>
  );
}
