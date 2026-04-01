"use client";

import { useEffect, useState } from "react";
import MentorCalendar from "@/components/MentorCalendar";
import { apiGet } from "@/services/api";
import type { Mentor } from "@/types";

export default function MentorPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMentors() {
      try {
        const response = await apiGet<Mentor[]>("/mentors");
        setMentors(response);
      } catch (error) {
        console.error("Failed to load mentors", error);
      } finally {
        setLoading(false);
      }
    }

    loadMentors();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Mentor Support</p>
        <h1 className="mt-2 text-4xl font-bold">Mentor booking and advising</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Meet the Global Engagement mentors, understand their support areas, and reserve guidance slots directly from the shared availability calendar.
        </p>
      </div>

      {loading ? (
        <p className="mt-8 text-gray-500">Loading mentors...</p>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <MentorCalendar mentors={mentors} />

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Available Mentors</h2>
            <div className="mt-4 space-y-4">
              {mentors.map((mentor) => (
                <div key={mentor.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{mentor.name}</h3>
                      <p className="text-sm text-gray-600">{mentor.expertise}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{mentor.region}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{mentor.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
