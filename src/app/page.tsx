"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/services/api";
import type { Program } from "@/types";

function FeatureCard({ program }: { program: Program }) {
  return (
    <div className="bg-white p-8 rounded-xl border shadow-sm hover:shadow-lg transition">
      <div className="text-sm uppercase tracking-wide text-[var(--plaksha-teal)] font-semibold">
        {program.type}
      </div>
      <h3 className="text-xl font-semibold mt-2">{program.title}</h3>
      <p className="mt-3 text-gray-600">{program.shortDescription}</p>
      <p className="mt-3 text-sm text-gray-500">{program.university} · {program.country}</p>
      <Link href="/programs" className="mt-5 inline-block text-[var(--plaksha-teal)] font-medium">
        Learn more →
      </Link>
    </div>
  );
}

export default function Home() {
  const [featuredPrograms, setFeaturedPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedPrograms() {
      try {
        const response = await api.get<Program[]>("/programs", {
          params: { featured: true },
        });
        setFeaturedPrograms(response.data);
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
    <main>
      <section className="bg-gradient-to-r from-[var(--plaksha-teal)] to-[#005f5f] text-white py-32">
        <div className="max-w-6xl mx-auto text-center px-6">
          <h1 className="text-5xl font-bold">Global Engagement Portal</h1>
          <p className="mt-6 text-lg opacity-90 max-w-2xl mx-auto">
            Discover international exchange programs, research collaborations,
            and global opportunities at Plaksha University.
          </p>
          <div className="mt-10 flex justify-center gap-6 flex-wrap">
            <Link href="/programs">
              <button className="bg-[var(--plaksha-gold)] text-black px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition">
                Explore Programs
              </button>
            </Link>
            <Link href="/mentor">
              <button className="border border-white px-6 py-3 rounded-lg hover:bg-white hover:text-[var(--plaksha-teal)] transition">
                Book Mentor
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center">Featured Opportunities</h2>
          {loading ? (
            <p className="text-center text-gray-500 mt-12">Loading featured programs...</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {featuredPrograms.map((program) => (
                <FeatureCard key={program.id} program={program} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto text-center px-6">
          <h2 className="text-2xl font-bold">Partner Universities</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mt-10 opacity-70">
            {partnerUniversities.map((university) => (
              <span key={university}>{university}</span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
