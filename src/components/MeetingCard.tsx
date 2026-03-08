import type { Booking } from "@/types";
import { formatIsoDate } from "@/lib/utils";

type Props = {
  meetings: Booking[];
};

export default function MeetingCard({ meetings }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <h2 className="font-semibold text-lg">Mentor Meetings</h2>
      <ul className="mt-4 space-y-3">
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <p className="font-medium">{meeting.mentorName}</p>
            <p className="text-sm text-gray-500">{formatIsoDate(meeting.date)} · {meeting.time}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
