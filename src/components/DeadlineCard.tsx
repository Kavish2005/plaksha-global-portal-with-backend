import type { Deadline } from "@/types";
import { formatIsoDate } from "@/lib/utils";

type Props = {
  deadlines: Deadline[];
};

export default function DeadlineCard({ deadlines }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <h2 className="font-semibold text-lg">Upcoming Deadlines</h2>
      <ul className="mt-4 space-y-2">
        {deadlines.map((deadline) => (
          <li key={deadline.programId} className="flex justify-between gap-4">
            <span>{deadline.programTitle}</span>
            <span className="text-gray-500">{formatIsoDate(deadline.deadline)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
