"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { apiGet } from "@/services/api";
import type { Program } from "@/types";
import ProgramCard from "@/components/ProgramCard";

export default function Home() {
  const [featuredPrograms, setFeaturedPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedPrograms() {
      try {
        const response = await apiGet<Program[]>("/programs", { featured: true });
        setFeaturedPrograms(response);
      } catch (error) {
        console.error("Failed to load featured programs", error);
      } finally {
        setLoading(false);
      }
    }
    loadFeaturedPrograms();
  }, []);

  const partnerUniversities = useMemo(
    () => [...new Set(featuredPrograms.map((p) => p.university))],
    [featuredPrograms],
  );

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-screen-2xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">

          {/* Left — hero */}
          <div className="rounded-2xl bg-gradient-to-br from-teal-800 to-teal-600 px-8 py-10 text-white shadow-md">
            <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80">
              Plaksha Global Engagement
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight">
              Explore global opportunities, connect with mentors, and plan your international journey.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/75">
              Discover exchange, research, and summer opportunities. Stay on top of deadlines and reach the Global Engagement Office for guidance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/programs" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                Explore Programs
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/mentor" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                Book a Mentor
              </Link>
            </div>
          </div>

          {/* Right — info tiles */}
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">From exploration to application</h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Browse opportunities, book guidance sessions, and follow your application progress through OGE.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <CalendarDays className="h-5 w-5 text-amber-600" />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Stay Prepared</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Deadlines, advising, and application updates</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Office Support</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Guidance from the Global Engagement team</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Globe2 className="h-5 w-5 text-teal-600" />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Partner Network</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {partnerUniversities.map((u) => (
                  <span key={u} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">{u}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Programs */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-14">
        <div className="w-full">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Featured Opportunities</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Featured global opportunities for Plaksha students</h2>
            </div>
            <Link href="/programs" className="shrink-0 text-sm font-semibold text-teal-700 hover:text-teal-800">
              Browse all →
            </Link>
          </div>
          {loading ? (
            <p className="mt-10 text-center text-sm text-slate-400">Loading featured programs…</p>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {featuredPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About the platform */}
      <section className="px-6 py-14">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">How Plaksha Supports You</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">Support for students and the Global Engagement Office</h2>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-800">Students</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Discover programs, apply with confidence, book mentors, track deadlines, and ask questions through the AI assistant.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-800">Global Engagement Office</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Coordinate programs, mentor support, deadlines, approvals, and nominations for the Plaksha student community.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
