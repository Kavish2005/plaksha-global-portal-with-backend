"use client";

import Image from "next/image";
import Link from "next/link";

import { usePathname } from "next/navigation";

import { motion } from "framer-motion";

import toast from "react-hot-toast";

import {
  Sparkles,
  PanelTop,
  Globe2,
  BrainCircuit,
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { cx } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Globe2,
  },
  {
    href: "/programs",
    label: "Programs",
    icon: Sparkles,
  },
  {
    href: "/mentor",
    label: "Mentors",
    icon: BrainCircuit,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: PanelTop,
  },
];

export default function Navbar() {
  const pathname = usePathname();

  const { activeUser, loading, logout } = useAuth();

  return (
    <motion.nav
      initial={{
        opacity: 0,
        y: -18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.45,
      }}
      className="sticky top-0 z-50 px-4 pt-4"
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.25)]">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.12),transparent_30%)]" />

          <div className="relative flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="group flex items-center gap-4"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]/5 backdrop-blur-xl">
                  <Image
                    src="/plaksha-logo.png"
                    alt="Plaksha"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
              </div>

              <div>
                <div className="text-lg font-semibold tracking-tight text-white">
                  Plaksha Global Portal
                </div>

                <div className="mt-1 text-xs uppercase tracking-[0.28em] text-blue-300/80">
                  AI-Powered Global Opportunities
                </div>
              </div>
            </Link>

            {/* Navigation */}
            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "group relative overflow-hidden rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-300",
                      active
                        ? "border-blue-400/30 bg-blue-500/15 text-white shadow-[0_0_25px_rgba(59,130,246,0.15)]"
                        : "border-white/5 bg-white/[0.04]/3 text-white/60 hover:border-white/10 hover:bg-white/[0.04]/6 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>

                    {active ? (
                      <motion.div
                        layoutId="navbar-active-pill"
                        className="absolute inset-0 rounded-2xl border border-blue-400/20"
                      />
                    ) : null}
                  </Link>
                );
              })}

              {/* AI Assistant CTA */}
              {activeUser?.role === "student" ? (
                <Link
                  href="/assistant"
                  className={cx(
                    "group relative overflow-hidden rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-300",
                    pathname.startsWith("/assistant")
                      ? "border-violet-400/30 bg-violet-500/15 text-white"
                      : "border-violet-400/10 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4" />
                    AI Assistant
                  </div>
                </Link>
              ) : null}
            </div>

            {/* User Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* User capsule */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04]/4 px-4 py-2 backdrop-blur-xl">
                <div className="h-9 w-9 rounded-full bg-linear-to-br from-blue-500 to-violet-500" />

                <div className="leading-tight">
                  <div className="text-sm font-medium text-white">
                    {loading
                      ? "Loading..."
                      : activeUser?.name || "Guest"}
                  </div>

                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    {activeUser?.role || "No Role"}
                  </div>
                </div>
              </div>

              {/* Admin CTA */}
              <Link
                href="/admin"
                className={cx(
                  "rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-300",
                  pathname.startsWith("/admin")
                    ? "border-amber-300/30 bg-amber-400/15 text-amber-100"
                    : "border-white/10 bg-white/[0.04]/3 text-white/70 hover:bg-white/[0.04]/6",
                )}
              >
                Admin
              </Link>

              {/* Logout */}
              <button
                onClick={() => {
                  void logout();

                  toast.success("Logged out successfully");
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.04]/3 px-4 py-2.5 text-sm text-white/70 transition-all duration-300 hover:bg-red-500/15 hover:text-red-100"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

