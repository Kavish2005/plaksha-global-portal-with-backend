"use client";

import { useEffect, useState } from "react";
import ApplicationCard from "@/components/ApplicationCard";
import DeadlineCard from "@/components/DeadlineCard";
import MeetingCard from "@/components/MeetingCard";
import api from "@/services/api";
import type { Application, Booking, DashboardSummary, Deadline } from "@/types";
import { FileText, CalendarDays, Users } from "lucide-react";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [meetings, setMeetings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryResponse, applicationsResponse, deadlinesResponse, meetingsResponse] = await Promise.all([
          api.get<DashboardSummary>("/dashboard/me"),
          api.get<Application[]>("/applications/me"),
          api.get<Deadline[]>("/deadlines/me"),
          api.get<Booking[]>("/meetings/me"),
        ]);

        setSummary(summaryResponse.data);
        setApplications(applicationsResponse.data);
        setDeadlines(deadlinesResponse.data);
        setMeetings(meetingsResponse.data);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading || !summary) {
    return <div className="max-w-7xl mx-auto px-8 py-16 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-16">
      <h1 className="text-3xl font-bold">Student Dashboard</h1>
      <p className="text-gray-600 mt-2">Track applications, deadlines, and mentor meetings.</p>

      <div className="grid md:grid-cols-3 gap-6 mt-10">
        <div className="bg-[var(--plaksha-teal)] text-white p-6 rounded-xl shadow">
          <FileText size={28} className="mb-3" />
          <h3 className="text-sm opacity-90">Applications</h3>
          <p className="text-3xl font-bold">{summary.applicationsCount}</p>
        </div>

        <div className="bg-white border p-6 rounded-xl shadow-sm">
          <Users size={28} className="mb-3 text-[var(--plaksha-teal)]" />
          <h3 className="text-sm text-gray-500">Mentor Meetings</h3>
          <p className="text-3xl font-bold">{summary.mentorMeetingsCount}</p>
        </div>

        <div className="bg-white border p-6 rounded-xl shadow-sm">
          <CalendarDays size={28} className="mb-3 text-[var(--plaksha-teal)]" />
          <h3 className="text-sm text-gray-500">Deadlines</h3>
          <p className="text-3xl font-bold">{summary.deadlinesCount}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-12">
        <ApplicationCard applications={applications} />
        <DeadlineCard deadlines={deadlines} />
        <MeetingCard meetings={meetings} />
      </div>
    </div>
  );
}
