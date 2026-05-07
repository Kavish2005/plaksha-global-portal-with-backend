"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Globe2, LayoutDashboard, Users, BookOpen, BrainCircuit, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cx } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Globe2, exact: true },
  { href: "/programs", label: "Programs", icon: BookOpen, exact: false },
  { href: "/mentor", label: "Mentors", icon: Users, exact: false },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const { activeUser, loading, logout } = useAuth();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/") || (href !== "/" && pathname.startsWith(href));
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-[0_1px_8px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-6 px-6 py-3">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <Image src="/plaksha-logo.png" alt="Plaksha" width={28} height={28} className="object-contain" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-slate-900 leading-tight">Plaksha Global Portal</div>
            <div className="text-xs text-teal-700 font-medium leading-tight">Global Engagement Office</div>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}

          {activeUser?.role === "student" && (
            <Link
              href="/assistant"
              className={cx(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/assistant")
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <BrainCircuit className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">AI Assistant</span>
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Admin link */}
          <Link
            href="/admin"
            className={cx(
              "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-amber-50 text-amber-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Admin</span>
          </Link>

          {/* User capsule */}
          {!loading && activeUser && (
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="h-6 w-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                {activeUser.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="hidden lg:block leading-tight">
                <div className="text-xs font-semibold text-slate-800">{activeUser.name}</div>
                <div className="text-[10px] text-slate-500 capitalize">{activeUser.role}</div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => { void logout(); toast.success("Logged out"); }}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
