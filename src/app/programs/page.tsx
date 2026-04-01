"use client";

import { useEffect, useMemo, useState } from "react";
import ProgramCard from "@/components/ProgramCard";
import { apiGet } from "@/services/api";
import type { Program } from "@/types";

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [universityFilter, setUniversityFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const response = await apiGet<Program[]>("/programs");
        setPrograms(response);
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
      .filter((program) => typeFilter === "All" || program.type === typeFilter)
      .filter((program) => countryFilter === "All" || program.country === countryFilter)
      .filter((program) => universityFilter === "All" || program.university === universityFilter)
      .filter((program) => {
        const query = search.toLowerCase();
        return (
          program.title.toLowerCase().includes(query) ||
          program.country.toLowerCase().includes(query) ||
          program.university.toLowerCase().includes(query) ||
          program.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      });
  }, [countryFilter, programs, search, typeFilter, universityFilter]);

  const countries = ["All", ...new Set(programs.map((program) => program.country))];
  const universities = ["All", ...new Set(programs.map((program) => program.university))];
  const types = ["All", "Exchange", "Research", "Internship", "Summer School"];

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Programs</p>
        <h1 className="mt-2 text-4xl font-bold">Global opportunities catalog</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Browse live international programs, search by partner university, and filter by region, institution, or opportunity type.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <input
            placeholder="Search programs, tags, country, or university..."
            className="rounded-2xl border border-black/10 bg-[var(--portal-panel)] px-4 py-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded-2xl border border-black/10 bg-[var(--portal-panel)] px-4 py-3" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {types.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select className="rounded-2xl border border-black/10 bg-[var(--portal-panel)] px-4 py-3" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
            {countries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select className="rounded-2xl border border-black/10 bg-[var(--portal-panel)] px-4 py-3" value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)}>
            {universities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading programs...</p>
      ) : (
        <>
          <p className="mt-8 text-sm text-gray-500">Showing {filteredPrograms.length} program(s)</p>
          <div className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
