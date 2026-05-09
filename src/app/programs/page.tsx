"use client";

import { useEffect, useMemo, useState } from "react";

import { Search } from "lucide-react";

import ProgramCard from "@/components/ProgramCard";

import { apiGet } from "@/services/api";
import { readCache, writeCache } from "@/lib/pageCache";
import type { Program } from "@/types";

const PROGRAMS_CACHE_KEY = "plaksha-programs";
const PROGRAMS_TTL = 5 * 60_000; // 5 min — programs rarely change

export default function Programs() {
  const cached = readCache<Program[]>(PROGRAMS_CACHE_KEY, PROGRAMS_TTL);
  const [programs, setPrograms] = useState<Program[]>(cached ?? []);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [countryFilter, setCountryFilter] = useState<string>("All");
  const [universityFilter, setUniversityFilter] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(!cached);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const response = await apiGet<Program[]>("/programs");
        setPrograms(response);
        writeCache(PROGRAMS_CACHE_KEY, response);
      } catch (error) {
        console.error("Failed to load programs", error);
      } finally {
        setLoading(false);
      }
    }

    if (cached) {
      // Restore instantly from cache, then refresh silently in background.
      void loadPrograms();
    } else {
      void loadPrograms();
    }
  }, []);

  const filteredPrograms =
    useMemo(() => {
      return programs
        .filter((program) => {
          return (
            typeFilter === "All" ||
            program.type === typeFilter
          );
        })
        .filter((program) => {
          return (
            countryFilter === "All" ||
            program.country ===
              countryFilter
          );
        })
        .filter((program) => {
          return (
            universityFilter ===
              "All" ||
            program.university ===
              universityFilter
          );
        })
        .filter((program) => {
          const query =
            search.toLowerCase();

          return (
            program.title
              .toLowerCase()
              .includes(query) ||
            program.country
              .toLowerCase()
              .includes(query) ||
            program.university
              .toLowerCase()
              .includes(query) ||
            program.tags.some((tag) =>
              tag
                .toLowerCase()
                .includes(query),
            )
          );
        });
    }, [
      programs,
      search,
      typeFilter,
      countryFilter,
      universityFilter,
    ]);

  const countries: string[] = [
    "All",
    ...new Set(
      programs.map(
        (program) => program.country,
      ),
    ),
  ];

  const universities: string[] = [
    "All",
    ...new Set(
      programs.map(
        (program) =>
          program.university,
      ),
    ),
  ];

  const types: string[] = [
    "All",
    "Exchange",
    "Research",
    "Internship",
    "Summer School",
  ];

  return (
<div className="mx-auto max-w-screen-2xl px-6 py-10">
      {/* Page header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Global Opportunity Explorer</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Browse international programs</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Exchange programs, research placements, internships, and summer schools available to Plaksha students.
            </p>
          </div>
          {/* Stats */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{programs.length}</div>
              <div className="text-xs text-slate-400">Programs</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{countries.length - 1}</div>
              <div className="text-xs text-slate-400">Countries</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{universities.length - 1}</div>
              <div className="text-xs text-slate-400">Universities</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              placeholder="Search programs, universities, tags…"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none"
          >
            {types.map((option: string) => <option key={option} value={option}>{option === "All" ? "All Types" : option}</option>)}
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none"
          >
            {countries.map((option: string) => <option key={option} value={option}>{option === "All" ? "All Countries" : option}</option>)}
          </select>
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none"
          >
            {universities.map((option: string) => <option key={option} value={option}>{option === "All" ? "All Universities" : option}</option>)}
          </select>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filteredPrograms.length}</span> program{filteredPrograms.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  );
}