"use client";

import { useEffect, useState } from "react";
import MentorCalendar from "@/components/MentorCalendar";
import api from "@/services/api";
import type { Mentor } from "@/types";

export default function MentorPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMentors() {
      try {
        const response = await api.get<Mentor[]>("/mentors");
        setMentors(response.data);
      } catch (error) {
        console.error("Failed to load mentors", error);
      } finally {
        setLoading(false);
      }
    }

    loadMentors();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-8 py-16">
      <h1 className="text-3xl font-bold">Mentor Booking</h1>
      <p className="text-gray-600 mt-2">
        Schedule guidance sessions with faculty and advisors.
      </p>

      {loading ? (
        <p className="mt-8 text-gray-500">Loading mentors...</p>
      ) : (
        <div className="mt-10 grid md:grid-cols-2 gap-10">
          <MentorCalendar mentors={mentors} />

          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="font-semibold text-lg">Available Mentors</h2>
            <div className="space-y-4 mt-4">
              {mentors.map((mentor) => (
                <div key={mentor.id} className="border p-4 rounded-lg">
                  <h3 className="font-semibold">{mentor.name}</h3>
                  <p className="text-sm text-gray-600">{mentor.expertise}</p>
                  <p className="text-sm text-gray-500 mt-1">{mentor.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
