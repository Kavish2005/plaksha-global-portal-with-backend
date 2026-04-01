import type { Deadline } from "@/types";
import { formatIsoDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

type Props = {
  deadlines: Deadline[];
};

export default function DeadlineCard({ deadlines }: Props) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
      <ul className="mt-4 space-y-3">
        {deadlines.map((deadline) => (
          <li key={deadline.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
            <div>
              <p className="font-medium text-[var(--portal-ink)]">{deadline.programTitle}</p>
              <p className="text-sm text-slate-500">{deadline.title}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">{formatIsoDate(deadline.date)}</p>
              <div className="mt-2">
                <StatusBadge label={deadline.priority} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
