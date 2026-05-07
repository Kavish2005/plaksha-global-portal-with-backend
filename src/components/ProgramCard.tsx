"use client";

import Link from "next/link";

import { motion } from "framer-motion";

import {
  ArrowUpRight,
  CalendarDays,
  Globe2,
  Sparkles,
  Clock3,
  GraduationCap,
} from "lucide-react";

import type { Program } from "@/types";

import { formatIsoDate } from "@/lib/utils";

import StatusBadge from "@/components/StatusBadge";

type Props = {
  program: Program;
};

export default function ProgramCard({
  program,
}: Props) {
  const aiMatch =
    82 + (program.title.length % 15);

  return (
    <motion.div
      whileHover={{
        y: -10,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 18,
      }}
      className="group relative flex h-full flex-col overflow-hidden rounded-4xl border border-white/10 bg-white/[0.04]/4 backdrop-blur-2xl"
    >
      {/* Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_40%)]" />
      </div>

      {/* Floating Accent */}
      <div className="absolute -right-7.5 -top-7.5 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl transition duration-700 group-hover:bg-blue-500/20" />

      <div className="relative z-10 flex h-full flex-col p-7">
        {/* Top Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={program.type} />

            {program.featured ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
                <Sparkles className="h-3 w-3" />
                Featured
              </div>
            ) : null}
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.04]/3 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/50">
            {program.country}
          </div>
        </div>

        {/* Program Info */}
        <div className="mt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04]/3 px-3 py-1 text-xs text-blue-200">
            <GraduationCap className="h-3.5 w-3.5" />
            Global Opportunity
          </div>

          <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-white transition duration-300 group-hover:text-blue-100">
            {program.title}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-sm text-white/50">
            <Globe2 className="h-4 w-4" />
            {program.university}
          </div>

          <p className="mt-5 line-clamp-4 text-sm leading-7 text-white/60">
            {program.description}
          </p>
        </div>

        {/* Tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {program.tags.map((tag) => (
            <div
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04]/3 px-3 py-1 text-xs text-white/60 transition duration-300 hover:bg-white/[0.04]/6"
            >
              {tag}
            </div>
          ))}
        </div>

        {/* AI Match System */}
        <div className="mt-7 rounded-2xl border border-blue-500/15 bg-blue-500/10 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-blue-200/70">
                AI Match Score
              </div>

              <div className="mt-2 text-3xl font-semibold text-white">
                {aiMatch}%
              </div>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-500 shadow-[0_0_40px_rgba(59,130,246,0.25)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.04]/5">
            <motion.div
              initial={{
                width: 0,
              }}
              whileInView={{
                width: `${aiMatch}%`,
              }}
              transition={{
                duration: 1,
              }}
              className="h-full rounded-full bg-linear-to-r from-blue-400 to-violet-400"
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04]/3 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40">
              <Clock3 className="h-3.5 w-3.5" />
              Duration
            </div>

            <div className="mt-3 text-sm font-medium text-white">
              {program.duration}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04]/3 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40">
              <CalendarDays className="h-3.5 w-3.5" />
              Deadline
            </div>

            <div className="mt-3 text-sm font-medium text-white">
              {program.deadline
                ? formatIsoDate(program.deadline)
                : "Rolling"}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Opportunity Status
            </div>

            <div className="mt-1 text-sm text-emerald-300">
              Applications Open
            </div>
          </div>

          <Link
            href={`/programs/${program.id}`}
            className="group/button inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04]/4 px-5 py-3 text-sm font-medium text-white transition-all duration-300 hover:border-blue-400/20 hover:bg-blue-500/10"
          >
            View Details

            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

