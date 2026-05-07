"use client";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import {
  Search,
  Sparkles,
  Globe2,
  GraduationCap,
} from "lucide-react";

import ProgramCard from "@/components/ProgramCard";

import { apiGet } from "@/services/api";

import type { Program } from "@/types";

export default function Programs() {
  const [programs, setPrograms] =
    useState<Program[]>([]);

  const [search, setSearch] =
    useState<string>("");

  const [typeFilter, setTypeFilter] =
    useState<string>("All");

  const [countryFilter, setCountryFilter] =
    useState<string>("All");

  const [
    universityFilter,
    setUniversityFilter,
  ] = useState<string>("All");

  const [loading, setLoading] =
    useState<boolean>(true);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const response =
          await apiGet<Program[]>(
            "/programs",
          );

        setPrograms(response);
      } catch (error) {
        console.error(
          "Failed to load programs",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPrograms();
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
    <div className="relative mx-auto max-w-7xl px-6 py-16">
      {/* Hero */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
        className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04]/4 p-10 backdrop-blur-2xl"
      >
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

          <div className="absolute bottom-[-20%] right-[-10%] h-96 w-96 rounded-full bg-violet-500/10 blur-[160px]" />
        </div>

        <div className="relative z-10">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-blue-200">
            <Sparkles className="h-3.5 w-3.5" />
            Global Opportunity Explorer
          </div>

          {/* Heading */}
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl">
            Discover international academic
            pathways.
          </h1>

          {/* Description */}
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/60">
            Explore elite exchange programs,
            research collaborations,
            internships, scholarships,
            and global learning ecosystems
            tailored for ambitious students.
          </p>

          {/* Stats */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04]/3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-semibold text-white">
                    {programs.length}+
                  </div>

                  <div className="mt-1 text-sm text-white/50">
                    Global Programs
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500/20 to-violet-500/20">
                  <Globe2 className="h-5 w-5 text-blue-200" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04]/3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-semibold text-white">
                    {countries.length - 1}
                  </div>

                  <div className="mt-1 text-sm text-white/50">
                    Countries
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500/20 to-violet-500/20">
                  <Sparkles className="h-5 w-5 text-blue-200" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04]/3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-semibold text-white">
                    {universities.length - 1}
                  </div>

                  <div className="mt-1 text-sm text-white/50">
                    Universities
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500/20 to-violet-500/20">
                  <GraduationCap className="h-5 w-5 text-blue-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-10 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            {/* Search */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04]/4 px-4 py-3 backdrop-blur-xl">
              <Search className="h-5 w-5 text-white/40" />

              <input
                placeholder="Search programs, universities, tags..."
                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value,
                )
              }
              className="rounded-2xl border border-white/10 bg-white/[0.04]/4 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl"
            >
              {types.map(
                (option: string) => (
                  <option
                    key={option}
                    value={option}
                    className="bg-[#0B1120]"
                  >
                    {option}
                  </option>
                ),
              )}
            </select>

            {/* Country Filter */}
            <select
              value={countryFilter}
              onChange={(e) =>
                setCountryFilter(
                  e.target.value,
                )
              }
              className="rounded-2xl border border-white/10 bg-white/[0.04]/4 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl"
            >
              {countries.map(
                (option: string) => (
                  <option
                    key={option}
                    value={option}
                    className="bg-[#0B1120]"
                  >
                    {option}
                  </option>
                ),
              )}
            </select>

            {/* University Filter */}
            <select
              value={universityFilter}
              onChange={(e) =>
                setUniversityFilter(
                  e.target.value,
                )
              }
              className="rounded-2xl border border-white/10 bg-white/[0.04]/4 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl"
            >
              {universities.map(
                (option: string) => (
                  <option
                    key={option}
                    value={option}
                    className="bg-[#0B1120]"
                  >
                    {option}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Results Header */}
      {!loading ? (
        <div className="mt-10 flex items-center justify-between">
          <div className="text-sm text-white/40">
            Showing{" "}
            <span className="text-white">
              {
                filteredPrograms.length
              }
            </span>{" "}
            program(s)
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.04]/4 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/40">
            Live Global Database
          </div>
        </div>
      ) : null}

      {/* Loading State */}
      {loading ? (
        <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="h-105 animate-pulse rounded-4xl border border-white/10 bg-white/[0.04]/4"
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.45,
            delay: 0.15,
          }}
          className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3"
        >
          {filteredPrograms.map(
            (program) => (
              <ProgramCard
                key={program.id}
                program={program}
              />
            ),
          )}
        </motion.div>
      )}
    </div>
  );
}