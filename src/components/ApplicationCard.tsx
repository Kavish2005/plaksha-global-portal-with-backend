import type { Application } from "@/types";
import { formatIsoDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

type Props = {
  applications: Application[];
};

export default function ApplicationCard({ applications }: Props) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">My Applications</h2>
      <ul className="mt-4 space-y-4">
        {applications.map((application) => (
          <li key={application.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[var(--portal-ink)]">{application.programTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{application.programUniversity}</p>
              </div>
              <StatusBadge label={application.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              <span>Submitted: {formatIsoDate(application.createdAt)}</span>
              {application.deadline ? <span>Deadline: {formatIsoDate(application.deadline)}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
