"use client";

import { useEffect, useMemo, useState } from "react";
import ProgramCard from "@/components/ProgramCard";
import api from "@/services/api";
import type { Program } from "@/types";

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const response = await api.get<Program[]>("/programs");
        setPrograms(response.data);
      } catch (error) {
        console.error("Failed to load programs", error);
      } finally {
        setLoading(false);
      }
    }

    loadPrograms();
  }, []);

  const filteredPrograms = useMemo(() => {
    return programs
      .filter((program) => filter === "All" || program.type === filter)
      .filter((program) => {
        const query = search.toLowerCase();
        return (
          program.title.toLowerCase().includes(query) ||
          program.country.toLowerCase().includes(query) ||
          program.university.toLowerCase().includes(query)
        );
      });
  }, [filter, programs, search]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-16">
      <h1 className="text-3xl font-bold">Global Programs</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">
        Browse exchange and research opportunities offered through the Global Engagement Office.
      </p>

      <input
        placeholder="Search programs, country, or university..."
        className="border rounded-lg px-4 py-3 mt-6 w-full max-w-xl bg-white"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-4 mt-6 flex-wrap">
        {['All', 'Exchange', 'Research'].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded ${filter === value ? 'bg-[var(--plaksha-teal)] text-white' : 'border bg-white'}`}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading programs...</p>
      ) : (
        <>
          <p className="mt-8 text-sm text-gray-500">Showing {filteredPrograms.length} program(s)</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mt-6">
            {filteredPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
