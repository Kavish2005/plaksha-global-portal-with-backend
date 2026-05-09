"use client";

import { useEffect, useState } from "react";
import MentorCalendar from "@/components/MentorCalendar";
import { apiGet } from "@/services/api";
import { readCache, writeCache } from "@/lib/pageCache";
import type { Mentor } from "@/types";
import { cx } from "@/lib/utils";

const MENTORS_CACHE_KEY = "plaksha-mentors";
const MENTORS_TTL = 5 * 60_000; // 5 min

export default function MentorPage() {
  const cached = readCache<Mentor[]>(MENTORS_CACHE_KEY, MENTORS_TTL);
  const [mentors, setMentors] = useState<Mentor[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(
    cached?.[0]?.id ?? null,
  );

  useEffect(() => {
    async function loadMentors() {
      try {
        const response = await apiGet<Mentor[]>("/mentors");
        setMentors(response);
        writeCache(MENTORS_CACHE_KEY, response);
        if (!selectedMentorId && response.length > 0) setSelectedMentorId(response[0].id);
      } catch (error) {
        console.error("Failed to load mentors", error);
      } finally {
        setLoading(false);
      }
    }
    void loadMentors();
  }, []);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">

      {/* Page header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Mentor Support</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Mentor booking and advising</h1>
        <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
          Meet the Global Engagement mentors, understand their support areas, and reserve guidance slots directly from the shared availability calendar.
        </p>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Loading mentors…</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">

          {/* Left: booking form */}
          <MentorCalendar
            mentors={mentors}
            selectedMentorId={selectedMentorId}
            onSelectMentor={setSelectedMentorId}
          />

          {/* Right: mentor directory — self-start so it doesn't stretch */}
          <div className="self-start space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="font-semibold text-slate-900">Available Mentors</p>
                <p className="mt-0.5 text-xs text-slate-500">Click a mentor to select them for booking</p>
              </div>
              <div className="divide-y divide-slate-100">
                {mentors.map((mentor) => {
                  const active = mentor.id === selectedMentorId;
                  return (
                    <button
                      key={mentor.id}
                      type="button"
                      onClick={() => setSelectedMentorId(mentor.id)}
                      className={cx(
                        "w-full px-5 py-4 text-left transition",
                        active ? "bg-teal-50" : "hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={cx("font-semibold text-sm", active ? "text-teal-800" : "text-slate-900")}>
                            {mentor.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{mentor.expertise}</p>
                        </div>
                        <span className={cx(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          active ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500",
                        )}>
                          {mentor.region}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{mentor.bio}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
