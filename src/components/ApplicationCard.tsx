import type { Application } from "@/types";

type Props = {
  applications: Application[];
};

export default function ApplicationCard({ applications }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl shadow border hover:shadow-lg transition">
      <h2 className="font-semibold text-lg">Applications</h2>
      <ul className="mt-4 space-y-3">
        {applications.map((application) => (
          <li key={application.id} className="flex justify-between gap-4">
            <span>{application.programTitle}</span>
            <span className="font-medium text-right text-[var(--plaksha-teal)]">{application.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
