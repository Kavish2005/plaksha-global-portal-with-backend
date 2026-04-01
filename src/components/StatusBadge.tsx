import { cx } from "@/lib/utils";

const styles: Record<string, string> = {
  Exchange: "bg-cyan-100 text-cyan-700",
  Research: "bg-indigo-100 text-indigo-700",
  Internship: "bg-orange-100 text-orange-700",
  "Summer School": "bg-sky-100 text-sky-700",
  Draft: "bg-slate-100 text-slate-700",
  Submitted: "bg-blue-100 text-blue-700",
  "Under Review": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Nominated: "bg-violet-100 text-violet-700",
  Featured: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
  Available: "bg-emerald-100 text-emerald-700",
  Booked: "bg-slate-100 text-slate-600",
  Confirmed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

export default function StatusBadge({ label }: { label: string }) {
  return (
    <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", styles[label] || "bg-slate-100 text-slate-700")}>
      {label}
    </span>
  );
}
