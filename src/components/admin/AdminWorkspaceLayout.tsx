"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, BriefcaseBusiness, CalendarDays, ClipboardCheck, Compass, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cx } from "@/lib/utils";

const sections = [
  { href: "/admin", label: "Overview", shortLabel: "Overview", description: "Health, metrics, and queues", icon: LayoutGrid },
  { href: "/admin/programs", label: "Programs", shortLabel: "Programs", description: "Add, edit, or remove opportunities", icon: BriefcaseBusiness },
  { href: "/admin/mentors", label: "Mentors", shortLabel: "Mentors", description: "Manage advisors and availability", icon: Users },
  { href: "/admin/applications", label: "Applications", shortLabel: "Applications", description: "Review, approve, and nominate", icon: ClipboardCheck },
  { href: "/admin/discovery", label: "Discovery", shortLabel: "Discovery", description: "Research new opportunities", icon: Compass },
  { href: "/admin/assistant", label: "Assistant", shortLabel: "Assistant", description: "Manage chatbot knowledge documents", icon: Bot },
];

const mentorSections = [
  { href: "/admin", label: "Dashboard", shortLabel: "Dashboard", description: "Your schedule and meetings", icon: CalendarDays },
  { href: "/admin/mentors", label: "Availability", shortLabel: "Availability", description: "Manage advisors and availability", icon: Users },
  { href: "/admin/assistant", label: "Assistant", shortLabel: "Assistant", description: "Manage chatbot knowledge documents", icon: Bot },
];

export default function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeUser } = useAuth();
  const isMentor = activeUser?.role === "mentor";

  const visibleSections = isMentor ? mentorSections : sections;

  const currentSection =
    visibleSections.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)) || visibleSections[0];

  return (
<div className="mx-auto max-w-screen-2xl px-6 py-8">

      {/* Workspace header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <ShieldCheck size={14} />
              {isMentor ? "Mentor Portal" : "Global Engagement Office"}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {isMentor ? "Mentor workspace" : "Office management"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              {isMentor
                ? "Manage your advising slots, review booked meetings, and upload reference documents."
                : "Manage programs, mentors, application reviews, and the assistant knowledge base."}
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Signed in as</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{activeUser?.name || "Admin user"}</p>
            <p className="text-xs text-slate-500">{activeUser?.email || "Office access"}</p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 border-t border-slate-100 pt-4">
          <span>{isMentor ? "Mentor" : "Office"}</span>
          <span>/</span>
          <span className="font-medium text-slate-800">{currentSection.shortLabel}</span>
          <span className="text-slate-400">—</span>
          <span className="text-slate-500">{currentSection.description}</span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {visibleSections.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "rounded-lg border px-3 py-3 transition-colors",
                  active
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={active ? "text-teal-700" : "text-slate-400"} />
                  <div>
                    <p className="text-sm font-semibold leading-tight">{item.label}</p>
                    <p className={cx("text-[10px] leading-tight mt-0.5", active ? "text-teal-600" : "text-slate-400")}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
