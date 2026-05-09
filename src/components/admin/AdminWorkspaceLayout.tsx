"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Bot, BriefcaseBusiness, CalendarDays, ClipboardCheck, Compass, Globe2, LayoutGrid, LogOut, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cx } from "@/lib/utils";

const sections = [
  { href: "/admin", label: "Overview", description: "Health, metrics, and queues", icon: LayoutGrid },
  { href: "/admin/programs", label: "Programs", description: "Add, edit, or remove opportunities", icon: BriefcaseBusiness },
  { href: "/admin/mentors", label: "Mentors", description: "Manage advisors and availability", icon: Users },
  { href: "/admin/applications", label: "Applications", description: "Review, approve, and nominate", icon: ClipboardCheck },
  { href: "/admin/discovery", label: "Discovery", description: "Research new opportunities", icon: Compass },
  { href: "/admin/assistant", label: "Assistant", description: "Manage chatbot knowledge documents", icon: Bot },
];

const mentorSections = [
  { href: "/admin", label: "Dashboard", description: "Your schedule and meetings", icon: CalendarDays },
  { href: "/admin/mentors", label: "Availability", description: "Manage advisors and availability", icon: Users },
  { href: "/admin/assistant", label: "Assistant", description: "Manage chatbot knowledge documents", icon: Bot },
];

export default function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeUser, logout } = useAuth();
  const isMentor = activeUser?.role === "mentor";

  const visibleSections = isMentor ? mentorSections : sections;

  const currentSection =
    visibleSections.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)) ||
    visibleSections[0];

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      {/* ── Top navigation bar ───────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-[0_1px_8px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-3">
          {/* Logo */}
          <Link href="/admin" className="flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <Image src="/plaksha-logo.png" alt="Plaksha" width={28} height={28} className="object-contain" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-bold text-slate-900">Plaksha Global Portal</p>
              <p className="text-xs font-medium text-teal-700">
                {isMentor ? "Mentor Portal" : "Global Engagement Office"}
              </p>
            </div>
          </Link>

          {/* Section tabs — horizontal nav */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {visibleSections.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                  <Icon size={15} className={active ? "text-teal-600" : "text-slate-400"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: user info + portal link + logout */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Back to student portal */}
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:flex"
            >
              <Globe2 size={14} />
              Student portal
            </Link>

            {/* User capsule */}
            {activeUser ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  {activeUser.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="hidden leading-tight lg:block">
                  <p className="text-xs font-semibold text-slate-800">{activeUser.name}</p>
                  <p className="text-[10px] capitalize text-slate-500">{activeUser.role}</p>
                </div>
              </div>
            ) : null}

            {/* Logout */}
            <button
              onClick={() => {
                void logout();
                toast.success("Logged out");
              }}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Log out"
            >
              <LogOut size={15} />
              <span className="hidden lg:inline">Log out</span>
            </button>
          </div>
        </div>

        {/* Mobile section tabs */}
        <div className="flex gap-1 overflow-x-auto px-6 pb-2 lg:hidden">
          {visibleSections.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:bg-slate-100",
                )}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
