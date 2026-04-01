import type { Booking } from "@/types";
import { formatIsoDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

type Props = {
  meetings: Booking[];
};

export default function MeetingCard({ meetings }: Props) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Mentor Meetings</h2>
      <ul className="mt-4 space-y-3">
        {meetings.map((meeting) => (
          <li key={meeting.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--portal-ink)]">{meeting.mentorName}</p>
                <p className="text-sm text-slate-500">{meeting.expertise}</p>
              </div>
              <StatusBadge label={meeting.status} />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {formatIsoDate(meeting.date)} · {meeting.time}
            </p>
            {meeting.topic ? <p className="mt-2 text-sm text-slate-600">{meeting.topic}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
