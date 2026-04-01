"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Program } from "@/types";
import { formatIsoDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

type Props = {
  program: Program;
};

export default function ProgramCard({ program }: Props) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={program.type} />
          {program.featured ? <StatusBadge label="Featured" /> : null}
        </div>
        <span className="text-xs text-slate-500">{program.country}</span>
      </div>

      <h2 className="mt-4 text-xl font-semibold text-[var(--portal-ink)]">{program.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{program.university}</p>

      <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">{program.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {program.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-6 space-y-2 text-sm text-slate-500">
        <p>Duration: {program.duration}</p>
        <p>Deadline: {program.deadline ? formatIsoDate(program.deadline) : "No deadline yet"}</p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link href={`/programs/${program.id}`} className="font-medium text-[var(--portal-teal)]">
          View details
        </Link>
      </div>
    </motion.div>
  );
}
