"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";

import { AuthProvider, useAuth } from "@/components/AuthProvider";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}

function ShellContent({
  children,
}: {
  children: React.ReactNode;
}) {
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
      router.replace(
        activeUser.role === "student"
          ? "/"
          : activeUser.role === "admin"
            ? "/admin"
            : "/admin/mentors",
      );
    }
  }, [activeUser, isLoginPage, loading, router]);

  /* Premium Loading Screen */

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] text-white">
        {/* Background glow */}
        <div className="absolute left-1/2 top-1/2 h-105 w-105 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[140px]" />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[70px_70px]" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            className="h-16 w-16 rounded-3xl border border-white/10 border-t-blue-400 bg-white/[0.04]/3 backdrop-blur-xl"
          />

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-2xl font-semibold tracking-tight"
          >
            Plaksha Global Portal
          </motion.h1>

          <p className="mt-3 text-sm text-white/50">
            Initializing global opportunity systems...
          </p>
        </div>
      </div>
    );
  }

  /* Redirect Placeholder */

  if (!activeUser && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#050816]" />
    );
  }

  /* Login Layout */

  if (isLoginPage) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
        {/* Ambient lighting */}
        <div className="absolute left-[-10%] top-[-10%] h-125 w-125 rounded-full bg-blue-500/20 blur-[160px]" />

        <div className="absolute bottom-[-10%] right-[-10%] h-125 w-125 rounded-full bg-violet-500/20 blur-[180px]" />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[72px_72px]" />

        <main className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(15,23,42,0.92)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(16px)",
            },
          }}
        />
      </div>
    );
  }

  /* Main Application Shell */

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0 -z-50 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-125 w-125 rounded-full bg-blue-500/15 blur-[180px]" />

        <div className="absolute bottom-[-20%] right-[-10%] h-125 w-125 rounded-full bg-violet-500/15 blur-[180px]" />

        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[72px_72px]" />
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -18,
            }}
            transition={{
              duration: 0.35,
              ease: "easeOut",
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating AI Assistant */}
      <Chatbot />
      {/* Footer */}
      <Footer />

      {/* Toast System */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(15,23,42,0.92)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
          },
        }}
      />
    </div>
  );
}
