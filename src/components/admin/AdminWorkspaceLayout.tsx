"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, BriefcaseBusiness, CalendarRange, ClipboardCheck, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cx } from "@/lib/utils";

const sections = [
  {
    href: "/admin",
    label: "Overview",
    shortLabel: "Overview",
    description: "Health, metrics, and queues",
    icon: LayoutGrid,
  },
  {
    href: "/admin/programs",
    label: "Programs",
    shortLabel: "Programs",
    description: "Add, edit, or remove opportunities",
    icon: BriefcaseBusiness,
  },
  {
    href: "/admin/mentors",
    label: "Mentors",
    shortLabel: "Mentors",
    description: "Manage advisors and availability",
    icon: Users,
  },
  {
    href: "/admin/deadlines",
    label: "Deadlines",
    shortLabel: "Deadlines",
    description: "Schedule and prioritize milestones",
    icon: CalendarRange,
  },
  {
    href: "/admin/applications",
    label: "Applications",
    shortLabel: "Applications",
    description: "Review, approve, and nominate",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/assistant",
    label: "Assistant",
    shortLabel: "Assistant",
    description: "Manage chatbot knowledge documents",
    icon: Bot,
  },
];

export default function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeUser } = useAuth();
  const isMentor = activeUser?.role === "mentor";

  const visibleSections = isMentor ? sections.filter((item) => item.href === "/admin/mentors" || item.href === "/admin/assistant") : sections;

  const currentSection =
    visibleSections.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) || visibleSections[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">
              <ShieldCheck size={16} />
              {isMentor ? "Mentor Portal" : "Global Engagement Office"}
            </div>
            <h1 className="mt-3 text-4xl font-bold text-[var(--portal-ink)]">{isMentor ? "Mentor workspace" : "Office management"}</h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              {isMentor
                ? "Manage your advising slots, review booked meetings, and upload reference documents that improve the assistant for students."
                : "Manage programs, mentors, deadlines, application reviews, and the assistant knowledge base for the Plaksha Global Engagement Office."}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--portal-panel)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in as</p>
            <p className="mt-2 font-semibold text-[var(--portal-ink)]">{activeUser?.name || "Admin user"}</p>
            <p className="text-sm text-slate-500">{activeUser?.email || "Office access"}</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-black/5 bg-[var(--portal-panel)] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Breadcrumb</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <span>{isMentor ? "Mentor" : "Office"}</span>
            <span>/</span>
            <span className="font-medium text-[var(--portal-ink)]">{currentSection.shortLabel}</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{currentSection.description}</p>
        </div>
      </div>

      <div className="mt-8 rounded-[2rem] border border-black/5 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {visibleSections.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "rounded-2xl border px-4 py-4 transition",
                  active
                    ? "border-[var(--portal-teal)] bg-[var(--portal-teal)] text-white"
                    : "border-transparent bg-[var(--portal-panel)] text-[var(--portal-ink)] hover:border-black/5 hover:bg-white",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className={cx("text-xs", active ? "text-white/75" : "text-slate-500")}>{item.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
