"use client";

import Link from "next/link";
import { CalendarDays, Clock3, Globe2, GraduationCap, MapPin, Sparkles } from "lucide-react";
import type { Program } from "@/types";
import { formatIsoDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

type Props = { program: Program };

export default function ProgramCard({ program }: Props) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">

      {/* Top color band */}
      <div className="h-1.5 w-full bg-teal-600" />

      <div className="flex h-full flex-col p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge label={program.type} />
            {program.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 border border-teal-200">
                <Sparkles className="h-3 w-3" />
                Featured
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 shrink-0">
            <MapPin className="h-3 w-3" />
            {program.country}
          </span>
        </div>

        {/* University label */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-teal-700 font-medium">
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          <span>Global Opportunity</span>
        </div>

        {/* Title */}
        <h2 className="mt-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-teal-700 transition-colors">
          {program.title}
        </h2>

        {/* University */}
        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Globe2 className="h-3.5 w-3.5 shrink-0" />
          {program.university}
        </div>

        {/* Description */}
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 flex-1">
          {program.description}
        </p>

        {/* Tags */}
        {program.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {program.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <Clock3 className="h-3 w-3" />
              Duration
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{program.duration}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <CalendarDays className="h-3 w-3" />
              Deadline
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {program.deadline ? formatIsoDate(program.deadline) : "Rolling"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs font-medium text-emerald-600">Applications Open</span>
          <Link
            href={`/programs/${program.id}`}
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
