"use client";

import { useEffect, useState } from "react";
import ApplicationCard from "@/components/ApplicationCard";
import DeadlineCard from "@/components/DeadlineCard";
import MeetingCard from "@/components/MeetingCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { apiGet, apiDelete } from "@/services/api";
import type { Booking, ChatInteraction, NotificationItem, Program, StudentDashboard } from "@/types";
import { CalendarDays, FileText, MessageSquareText, Users } from "lucide-react";
import { formatDateTime, formatIsoDate, getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { activeUser, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (authLoading) {
        return;
      }

      if (activeUser?.role === "admin") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await apiGet<StudentDashboard>("/dashboard/me");
        setDashboard(response);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [activeUser, authLoading]);

  async function cancelBooking(bookingId: number) {
    try {
      await apiDelete<{ id: number }>(`/bookings/${bookingId}`);
      toast.success("Booking cancelled.");
      const response = await apiGet<StudentDashboard>("/dashboard/me");
      setDashboard(response);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (authLoading) {
    return <div className="mx-auto max-w-7xl px-6 py-16 text-slate-500">Loading dashboard...</div>;
  }

  if (activeUser?.role === "admin") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Student dashboard is role-specific</h1>
          <p className="mt-3 text-slate-600">
            You&apos;re currently browsing as an admin user. Switch to a student from the navbar or head to the admin panel to manage programs and approvals.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !dashboard) {
    return <div className="max-w-7xl mx-auto px-8 py-16 text-gray-500">Loading dashboard...</div>;
  }

  const { summary, applications, deadlines, meetings, savedPrograms, chatHistory, notifications } = dashboard;

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Student Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Your Global Engagement dashboard</h1>
        <p className="mt-3 text-slate-600">Track applications, deadlines, mentor meetings, saved programs, and recent updates from the office.</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl bg-[var(--portal-teal)] p-6 text-white shadow">
          <FileText size={28} className="mb-3" />
          <h3 className="text-sm opacity-90">Applications</h3>
          <p className="text-3xl font-bold">{summary.applicationsCount}</p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <Users size={28} className="mb-3 text-[var(--portal-teal)]" />
          <h3 className="text-sm text-gray-500">Mentor Meetings</h3>
          <p className="text-3xl font-bold">{summary.mentorMeetingsCount}</p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <CalendarDays size={28} className="mb-3 text-[var(--portal-teal)]" />
          <h3 className="text-sm text-gray-500">Deadlines</h3>
          <p className="text-3xl font-bold">{summary.deadlinesCount}</p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <MessageSquareText size={28} className="mb-3 text-[var(--portal-teal)]" />
          <h3 className="text-sm text-gray-500">Saved Programs</h3>
          <p className="text-3xl font-bold">{summary.savedProgramsCount}</p>
        </div>
      </div>

      <div className="mt-12 grid gap-8 xl:grid-cols-3">
        <ApplicationCard applications={applications} />
        <DeadlineCard deadlines={deadlines} />
        <MeetingCard meetings={meetings} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <Panel title="Saved Programs">
          {savedPrograms.length === 0 ? (
            <EmptyState text="No saved programs yet." />
          ) : (
            savedPrograms.map((program) => (
              <SavedProgramItem key={program.id} program={program} />
            ))
          )}
        </Panel>

        <Panel title="Recent Assistant Questions">
          {chatHistory.length === 0 ? (
            <EmptyState text="No chatbot history yet." />
          ) : (
            chatHistory.map((item) => <ChatHistoryItem key={item.id} item={item} />)
          )}
        </Panel>

        <Panel title="Status Updates">
          {notifications.length === 0 ? (
            <EmptyState text="No status updates yet." />
          ) : (
            notifications.map((item) => <NotificationEntry key={item.id} item={item} />)
          )}
        </Panel>
      </div>

      <div className="mt-10 rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Upcoming mentor meetings</h2>
            <p className="mt-2 text-sm text-slate-600">Manage your confirmed sessions directly from the dashboard.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {meetings.length === 0 ? (
            <EmptyState text="No meetings scheduled yet." />
          ) : (
            meetings.map((meeting) => (
              <div key={meeting.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-[var(--portal-ink)]">{meeting.mentorName}</p>
                  <p className="text-sm text-slate-500">{meeting.expertise}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatIsoDate(meeting.date)} · {meeting.time}
                  </p>
                  {meeting.topic ? <p className="mt-2 text-sm text-slate-500">{meeting.topic}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={meeting.status} />
                  {meeting.status !== "Cancelled" ? (
                    <button
                      onClick={() => void cancelBooking(meeting.id)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{text}</p>;
}

function SavedProgramItem({ program }: { program: Program }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="font-medium text-[var(--portal-ink)]">{program.title}</p>
      <p className="mt-1 text-sm text-slate-500">{program.university}</p>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>{program.country}</span>
        {program.deadline ? <span>{formatIsoDate(program.deadline)}</span> : null}
      </div>
    </div>
  );
}

function ChatHistoryItem({ item }: { item: ChatInteraction }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="font-medium text-[var(--portal-ink)]">{item.query}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.response}</p>
      <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
    </div>
  );
}

function NotificationEntry({ item }: { item: NotificationItem }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="font-medium text-[var(--portal-ink)]">{item.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
      <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
    </div>
  );
}
