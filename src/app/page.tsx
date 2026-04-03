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
    () => [...new Set(featuredPrograms.map((program) => program.university))],
    [featuredPrograms],
  );

  return (
    <div>
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] bg-[linear-gradient(135deg,var(--portal-teal-dark),var(--portal-teal))] px-8 py-12 text-white shadow-xl">
            <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em]">
              Plaksha Global Engagement
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-tight">
              Explore global opportunities, connect with mentors, and plan your international journey at Plaksha.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/80">
              Discover exchange, research, and summer opportunities, stay on top of deadlines, and reach the Global Engagement Office for guidance along the way.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/programs"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--portal-gold)] px-6 py-3 font-semibold text-[var(--portal-ink)]"
              >
                Explore Programs
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/mentor"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-semibold text-white"
              >
                Book Mentor
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
              <Sparkles className="text-[var(--portal-teal)]" />
              <h2 className="mt-4 text-xl font-semibold">From exploration to application support</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Browse opportunities, book guidance sessions, and follow your application progress through Plaksha&apos;s Global Engagement Office.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
                <CalendarDays className="text-[var(--portal-gold)]" />
                <p className="mt-4 text-sm uppercase tracking-[0.2em] text-slate-500">Stay Prepared</p>
                <p className="mt-2 font-semibold">Deadlines, advising, and application updates</p>
              </div>
              <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
                <ShieldCheck className="text-[var(--portal-teal)]" />
                <p className="mt-4 text-sm uppercase tracking-[0.2em] text-slate-500">Office Support</p>
                <p className="mt-2 font-semibold">Guidance from the Global Engagement team</p>
              </div>
            </div>
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
              <Globe2 className="text-[var(--portal-teal)]" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-slate-500">Partner Network</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {partnerUniversities.map((university) => (
                  <span key={university} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                    {university}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Featured Opportunities</p>
              <h2 className="mt-2 text-3xl font-bold">Featured global opportunities for Plaksha students</h2>
            </div>
            <Link href="/programs" className="text-sm font-semibold text-[var(--portal-teal)]">
              Browse all programs
            </Link>
          </div>
          {loading ? (
            <p className="mt-12 text-center text-gray-500">Loading featured programs...</p>
          ) : (
            <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {featuredPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/5 bg-[var(--portal-panel)] p-10">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">How Plaksha Supports You</p>
              <h2 className="mt-2 text-3xl font-bold">Support for students and the Global Engagement Office</h2>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Students</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Discover programs, apply with confidence, book mentors, track deadlines, and ask questions through the assistant.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Global Engagement Office</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Coordinate programs, mentor support, deadlines, approvals, and nominations for the Plaksha student community.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
