"use client";

import { motion } from "framer-motion";
import type { Program } from "@/types";
import { formatIsoDate } from "@/lib/utils";

type Props = {
  program: Program;
};

export default function ProgramCard({ program }: Props) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-[var(--plaksha-teal)]">
          {program.type}
        </span>
        <span className="text-xs text-gray-400">{program.country}</span>
      </div>

      <h2 className="text-lg font-semibold mt-4">{program.title}</h2>

      <p className="text-gray-500 mt-2">{program.shortDescription}</p>
      <p className="text-sm mt-4 text-gray-400">Deadline: {formatIsoDate(program.deadline)}</p>
      <p className="text-sm mt-2 text-gray-500">University: {program.university}</p>
      <p className="mt-5 text-sm text-gray-600">{program.description}</p>
    </motion.div>
  );
}
