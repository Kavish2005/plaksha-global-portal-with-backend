import { cx } from "@/lib/utils";

const styles: Record<string, string> = {
  Exchange: "bg-blue-50 text-blue-700 border border-blue-200",
  Research: "bg-teal-50 text-teal-700 border border-teal-200",
  Internship: "bg-amber-50 text-amber-700 border border-amber-200",
  "Summer School": "bg-violet-50 text-violet-700 border border-violet-200",
  Draft: "bg-slate-100 text-slate-600 border border-slate-200",
  Submitted: "bg-teal-50 text-teal-700 border border-teal-200",
  "Under Review": "bg-amber-50 text-amber-700 border border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border border-rose-200",
  Nominated: "bg-teal-50 text-teal-700 border border-teal-200",
  Featured: "bg-teal-50 text-teal-700 border border-teal-200",
  High: "bg-rose-50 text-rose-700 border border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Booked: "bg-slate-100 text-slate-600 border border-slate-200",
  Confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Cancelled: "bg-slate-100 text-slate-500 border border-slate-200",
  PENDING: "bg-slate-100 text-slate-600 border border-slate-200",
  ACTIVE: "bg-blue-50 text-blue-700 border border-blue-200",
  FORWARDED: "bg-violet-50 text-violet-700 border border-violet-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CHANGES_REQUESTED: "bg-amber-50 text-amber-700 border border-amber-200",
  REJECTED: "bg-rose-50 text-rose-700 border border-rose-200",
  COMPLETED: "bg-teal-50 text-teal-700 border border-teal-200",
};

export default function StatusBadge({ label }: { label: string }) {
  return (
    <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[label] ?? "bg-slate-100 text-slate-600 border border-slate-200")}>
      {label}
    </span>
  );
}
