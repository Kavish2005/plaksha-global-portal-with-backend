"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { apiDelete, apiGet, apiPut } from "@/services/api";
import type {
  Application,
  ApplicationDocumentAsset,
  Booking,
  NotificationItem,
  Program,
  ReviewerDashboard,
  StudentDashboard,
  WorkflowStageStatus,
} from "@/types";
import { CalendarDays, FileText, MessageSquareText, Users } from "lucide-react";
import { formatDateTime, formatIsoDate, getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

type SearchableOption = {
  value: string;
  label: string;
  helperText?: string;
  keywords?: string[];
};

export default function Dashboard() {
  const { activeUser, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [reviewerDashboard, setReviewerDashboard] = useState<ReviewerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const isOfficeUser = activeUser?.role === "admin";
  const isMentorUser = activeUser?.role === "mentor";
  const isReviewerUser = activeUser?.role === "reviewer";

  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<number | null>(null);
  const [selectedSavedProgramId, setSelectedSavedProgramId] = useState<number | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (authLoading) {
        return;
      }

      if (isOfficeUser || isMentorUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (isReviewerUser) {
          const response = await apiGet<ReviewerDashboard>("/reviewer/tasks");
          setReviewerDashboard(response);
          setDashboard(null);
        } else {
          const response = await apiGet<StudentDashboard>("/dashboard/me");
          setDashboard(response);
          setReviewerDashboard(null);
        }
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [activeUser, authLoading, isMentorUser, isOfficeUser, isReviewerUser]);

  useEffect(() => {
    if (!dashboard) return;

    if (!selectedApplicationId && dashboard.applications[0]) {
      setSelectedApplicationId(dashboard.applications[0].id);
    }

    if (!selectedDeadlineId && dashboard.deadlines[0]) {
      setSelectedDeadlineId(dashboard.deadlines[0].id);
    }

    if (!selectedSavedProgramId && dashboard.savedPrograms[0]) {
      setSelectedSavedProgramId(dashboard.savedPrograms[0].id);
    }

    if (!selectedNotificationId && dashboard.notifications[0]) {
      setSelectedNotificationId(dashboard.notifications[0].id);
    }
  }, [dashboard, selectedApplicationId, selectedDeadlineId, selectedNotificationId, selectedSavedProgramId]);

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

  if (isOfficeUser) {
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

  if (isMentorUser) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Mentor Workspace</p>
          <h1 className="mt-2 text-3xl font-bold">Your advising dashboard lives in the mentor workspace</h1>
          <p className="mt-3 text-slate-600">
            Use the mentor section to manage your availability and review meetings booked with you by students.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/admin/mentors"
              className="rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Open mentor workspace
            </a>
            <a
              href="/mentor"
              className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-[var(--portal-ink)] transition hover:bg-slate-50"
            >
              View public mentor page
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isReviewerUser) {
    return <ReviewerDashboardView dashboard={reviewerDashboard} loading={loading} />;
  }

  if (loading || !dashboard) {
    return <div className="mx-auto max-w-7xl px-8 py-16 text-gray-500">Loading dashboard...</div>;
  }

  const { summary, applications, deadlines, meetings, savedPrograms, notifications } = dashboard;

  const selectedApplication = applications.find((application) => application.id === selectedApplicationId) ?? applications[0] ?? null;
  const selectedDeadline = deadlines.find((deadline) => deadline.id === selectedDeadlineId) ?? deadlines[0] ?? null;
  const selectedSavedProgram = savedPrograms.find((program) => program.id === selectedSavedProgramId) ?? savedPrograms[0] ?? null;
  const selectedNotification =
    notifications.find((notification) => notification.id === selectedNotificationId) ?? notifications[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Student Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Your Global Engagement dashboard</h1>
        <p className="mt-3 text-slate-600">Track applications, deadlines, mentor meetings, saved programs, and recent updates from the office.</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-4">
        <MetricCard icon={<FileText size={28} className="mb-3" />} label="Applications" value={summary.applicationsCount} accent />
        <MetricCard icon={<Users size={28} className="mb-3 text-[var(--portal-teal)]" />} label="Mentor Meetings" value={summary.mentorMeetingsCount} />
        <MetricCard icon={<CalendarDays size={28} className="mb-3 text-[var(--portal-teal)]" />} label="Deadlines" value={summary.deadlinesCount} />
        <MetricCard icon={<MessageSquareText size={28} className="mb-3 text-[var(--portal-teal)]" />} label="Saved Programs" value={summary.savedProgramsCount} />
      </div>

      <div className="mt-12 grid gap-8 xl:grid-cols-3">
        <SearchPanel
          title="My Applications"
          count={applications.length}
          options={applications.map((application) => ({
            value: String(application.id),
            label: application.programTitle,
            helperText: `${application.programUniversity} · ${application.status}`,
            keywords: [application.studentName],
          }))}
          selectedValue={selectedApplication ? String(selectedApplication.id) : ""}
          onSelect={(value) => setSelectedApplicationId(value ? Number(value) : null)}
          searchPlaceholder="Search applications"
          emptyText="No applications yet."
        >
          {selectedApplication ? <ApplicationDetail application={selectedApplication} /> : null}
        </SearchPanel>

        <SearchPanel
          title="Upcoming Deadlines"
          count={deadlines.length}
          options={deadlines.map((deadline) => ({
            value: String(deadline.id),
            label: deadline.programTitle,
            helperText: `${deadline.requirementLabel ? `${deadline.requirementLabel} · ` : ""}${deadline.title} · ${formatIsoDate(deadline.date)}`,
            keywords: [deadline.priority, deadline.requirementLabel || ""],
          }))}
          selectedValue={selectedDeadline ? String(selectedDeadline.id) : ""}
          onSelect={(value) => setSelectedDeadlineId(value ? Number(value) : null)}
          searchPlaceholder="Search deadlines"
          emptyText="No upcoming deadlines."
        >
          {selectedDeadline ? <DeadlineDetail deadline={selectedDeadline} /> : null}
        </SearchPanel>

        <Panel title="Mentor Meetings">
          {meetings.length === 0 ? (
            <EmptyState text="No meetings scheduled yet." />
          ) : (
            meetings.map((meeting) => <MeetingPreview key={meeting.id} meeting={meeting} />)
          )}
        </Panel>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <SearchPanel
          title="Saved Programs"
          count={savedPrograms.length}
          options={savedPrograms.map((program) => ({
            value: String(program.id),
            label: program.title,
            helperText: `${program.university} · ${program.country}`,
            keywords: [program.type, ...program.tags],
          }))}
          selectedValue={selectedSavedProgram ? String(selectedSavedProgram.id) : ""}
          onSelect={(value) => setSelectedSavedProgramId(value ? Number(value) : null)}
          searchPlaceholder="Search saved programs"
          emptyText="No saved programs yet."
        >
          {selectedSavedProgram ? <SavedProgramDetail program={selectedSavedProgram} /> : null}
        </SearchPanel>

        <SearchPanel
          title="Status Updates"
          count={notifications.length}
          options={notifications.map((notification) => ({
            value: String(notification.id),
            label: notification.title,
            helperText: formatDateTime(notification.createdAt),
            keywords: [notification.message],
          }))}
          selectedValue={selectedNotification ? String(selectedNotification.id) : ""}
          onSelect={(value) => setSelectedNotificationId(value ? Number(value) : null)}
          searchPlaceholder="Search status updates"
          emptyText="No status updates yet."
        >
          {selectedNotification ? <NotificationDetail item={selectedNotification} /> : null}
        </SearchPanel>
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

function ReviewerDashboardView({
  dashboard,
  loading,
}: {
  dashboard: ReviewerDashboard | null;
  loading: boolean;
}) {
  const [documentActionLoadingId, setDocumentActionLoadingId] = useState<number | null>(null);
  const [previewDocument, setPreviewDocument] = useState<ApplicationDocumentAsset | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<number, string>>({});
  const [submittingActionKey, setSubmittingActionKey] = useState<string | null>(null);

  async function refreshReviewerDashboard() {
    const response = await apiGet<ReviewerDashboard>("/reviewer/tasks");
    setPreviewDocument(null);
    return response;
  }

  async function openApplicationDocument(documentId: number, mode: "preview" | "download") {
    try {
      setDocumentActionLoadingId(documentId);
      const asset = await apiGet<ApplicationDocumentAsset>(`/application-documents/${documentId}`);

      if (mode === "preview") {
        setPreviewDocument(asset);
        return;
      }

      const link = window.document.createElement("a");
      link.href = asset.fileData;
      link.download = asset.fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDocumentActionLoadingId(null);
    }
  }

  async function respondToRequest(requestId: number, status: "RESPONDED" | "INFO_REQUESTED" | "REJECTED_RECOMMENDATION") {
    const notes = responseDrafts[requestId] || "";
    if (!notes.trim()) {
      toast.error("Please write your response notes before submitting.");
      return;
    }
    const actionKey = `req:${requestId}:${status}`;
    try {
      setSubmittingActionKey(actionKey);
      await apiPut(`/review-requests/${requestId}/respond`, { status, reviewerNotes: notes.trim() });
      toast.success("Response sent to OGE.");
      setResponseDrafts((current) => ({ ...current, [requestId]: "" }));
      await refreshReviewerDashboard();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingActionKey(null);
    }
  }

  const previewableDocument = useMemo(() => {
    if (!previewDocument) return null;

    const mimeType = previewDocument.mimeType.toLowerCase();
    const canInlinePreview =
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType.startsWith("text/") ||
      mimeType.includes("json");

    return {
      ...previewDocument,
      canInlinePreview,
    };
  }, [previewDocument]);

  if (loading || !dashboard) {
    return <div className="mx-auto max-w-7xl px-8 py-16 text-gray-500">Loading reviewer workspace...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {previewableDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-lg font-semibold text-[var(--portal-ink)]">{previewableDocument.fileName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {previewableDocument.requirementLabel}
                  {previewableDocument.deadlineTitle ? ` · ${previewableDocument.deadlineTitle}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openApplicationDocument(previewableDocument.id, "download")}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4">
              {previewableDocument.canInlinePreview ? (
                <iframe
                  title={previewableDocument.fileName}
                  src={previewableDocument.fileData}
                  className="h-full w-full rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
                  <p className="text-lg font-semibold text-[var(--portal-ink)]">Preview not supported for this file type</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    This document can still be downloaded and opened locally. For the best experience, use the download action above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Reviewer Workspace</p>
        <h1 className="mt-2 text-4xl font-bold">Advisory review requests</h1>
        <p className="mt-3 text-slate-600">
          OGE has asked for your input on these applications. Review the materials and send your recommendation back to the office. You cannot route applications — OGE controls all stage transitions.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <MetricCard icon={<FileText className="mb-3 h-5 w-5 opacity-60" />} label="Open Requests" value={dashboard.tasks.length} />
        <MetricCard icon={<Users className="mb-3 h-5 w-5 opacity-60" />} label="Assigned to you" value={dashboard.tasks.length} />
      </div>

      <div className="mt-10 space-y-8">
        {dashboard.tasks.length === 0 ? (
          <div className="rounded-[2rem] border border-black/5 bg-white p-8 text-slate-500 shadow-sm">
            No review requests are assigned to you right now.
          </div>
        ) : (
          dashboard.tasks.map((task) => {
            const reqId = task.reviewRequest.id;
            const responseText = responseDrafts[reqId] || "";

            return (
              <div key={reqId} className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--portal-teal)]">{task.stage.stageLabel}</p>
                    <h2 className="mt-2 text-2xl font-semibold">{task.application.programTitle}</h2>
                    <p className="mt-2 text-sm font-medium text-[var(--portal-ink)]">{task.application.studentName}</p>
                    <p className="text-sm text-slate-500">{task.application.programUniversity}</p>
                  </div>
                  <StatusBadge label={task.reviewRequest.status} />
                </div>

                {task.reviewRequest.instructions ? (
                  <div className="mt-5 rounded-2xl border border-slate-100 bg-[var(--portal-panel)] px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">OGE instructions for you</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{task.reviewRequest.instructions}</p>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-5">
                    {task.application.documents.length > 0 ? (
                      <div className="rounded-3xl border border-slate-100 p-5">
                        <h3 className="text-lg font-semibold">Student uploads</h3>
                        <div className="mt-4 space-y-3">
                          {task.application.documents.map((document) => (
                            <div
                              key={document.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-[var(--portal-panel)] p-3 lg:flex-row lg:items-center lg:justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium text-[var(--portal-ink)]">
                                  {document.requirementLabel}: {document.fileName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {document.deadlineTitle}
                                  {document.deadlineDate ? ` · due ${formatIsoDate(document.deadlineDate)}` : ""}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void openApplicationDocument(document.id, "preview")}
                                  disabled={documentActionLoadingId === document.id}
                                  className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                >
                                  {documentActionLoadingId === document.id ? "Loading..." : "Preview"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void openApplicationDocument(document.id, "download")}
                                  disabled={documentActionLoadingId === document.id}
                                  className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-slate-100 p-5">
                        <h3 className="text-lg font-semibold">Student uploads</h3>
                        <EmptyState text="No documents uploaded for this application yet." />
                      </div>
                    )}

                    {task.application.statement ? (
                      <div className="rounded-3xl border border-slate-100 p-5">
                        <h3 className="text-lg font-semibold">Personal statement</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{task.application.statement}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-slate-100 p-5">
                    <h3 className="text-lg font-semibold">Your response to OGE</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Write your recommendation, questions, or concerns below. Your response goes directly back to the Global Engagement Office — you cannot route this application further.
                    </p>
                    <textarea
                      value={responseText}
                      onChange={(e) =>
                        setResponseDrafts((current) => ({ ...current, [reqId]: e.target.value }))
                      }
                      className="mt-4 min-h-32 w-full rounded-2xl border border-black/10 px-4 py-3"
                      placeholder="Write your recommendation or input here..."
                    />
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => void respondToRequest(reqId, "RESPONDED")}
                        disabled={submittingActionKey === `req:${reqId}:RESPONDED`}
                        className="rounded-full bg-[var(--portal-teal)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {submittingActionKey === `req:${reqId}:RESPONDED` ? "Sending..." : "Send recommendation to OGE"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void respondToRequest(reqId, "INFO_REQUESTED")}
                        disabled={submittingActionKey === `req:${reqId}:INFO_REQUESTED`}
                        className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60"
                      >
                        {submittingActionKey === `req:${reqId}:INFO_REQUESTED` ? "Sending..." : "Request more information from OGE"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void respondToRequest(reqId, "REJECTED_RECOMMENDATION")}
                        disabled={submittingActionKey === `req:${reqId}:REJECTED_RECOMMENDATION`}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-60"
                      >
                        {submittingActionKey === `req:${reqId}:REJECTED_RECOMMENDATION` ? "Sending..." : "Recommend rejection"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "rounded-3xl bg-[var(--portal-teal)] p-6 text-white shadow" : "rounded-3xl border border-black/5 bg-white p-6 shadow-sm"}>
      {icon}
      <h3 className={accent ? "text-sm opacity-90" : "text-sm text-gray-500"}>{label}</h3>
      <p className="text-3xl font-bold">{value}</p>
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

function SearchPanel({
  title,
  count,
  options,
  selectedValue,
  onSelect,
  searchPlaceholder,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  options: SearchableOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Panel title={title}>
      {options.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <>
          <SearchableSelect
            value={selectedValue}
            onChange={onSelect}
            options={options}
            placeholder={`Select ${title.toLowerCase()}`}
            searchPlaceholder={searchPlaceholder}
          />
          <p className="text-sm text-slate-500">{count} available.</p>
          {children}
        </>
      )}
    </Panel>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{text}</p>;
}

function ApplicationDetail({ application }: { application: Application }) {
  const applicationDeadlinePassed = application.deadline ? new Date(application.deadline) < new Date(new Date().toDateString()) : false;
  const currentStage = application.currentWorkflowStage;

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/programs/${application.programId}`} className="font-medium text-[var(--portal-teal)] underline-offset-4 hover:underline">
            {application.programTitle}
          </Link>
          <p className="mt-1 text-sm text-slate-500">{application.programUniversity}</p>
        </div>
        <StatusBadge label={application.status} />
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>Submitted: {formatIsoDate(application.createdAt)}</p>
        {application.deadline ? <p>Deadline: {formatIsoDate(application.deadline)}</p> : null}
        {application.reviewerNotes ? <p>Office notes: {application.reviewerNotes}</p> : null}
      </div>
      {currentStage ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current stage</p>
          <p className="mt-2 font-medium text-[var(--portal-ink)]">{currentStage.stageLabel}</p>
          {currentStage.studentVisibleUpdate ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{currentStage.studentVisibleUpdate}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">Your application is currently under review by the Global Engagement Office.</p>
          )}
        </div>
      ) : null}
      {application.workflowStages.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Review progress</p>
          <div className="mt-3 space-y-3">
            {application.workflowStages.map((stage) => {
              const isActive = currentStage?.id === stage.id;
              const isDone = ["FORWARDED", "APPROVED", "COMPLETED"].includes(stage.status);
              const isNeedsAction = stage.status === "CHANGES_REQUESTED";

              return (
                <div key={stage.id} className="flex gap-3">
                  <div className="mt-1 flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isActive
                          ? "bg-[var(--portal-teal)]"
                          : isNeedsAction
                            ? "bg-amber-500"
                            : isDone
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                      }`}
                    />
                    {stage !== application.workflowStages[application.workflowStages.length - 1] ? (
                      <div className="mt-1 h-full w-px bg-slate-200" />
                    ) : null}
                  </div>
                  <div className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[var(--portal-ink)]">{stage.stageLabel}</p>
                      <StatusBadge label={formatWorkflowStageStatusLabel(stage.status)} />
                    </div>
                    {stage.studentVisibleUpdate ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{stage.studentVisibleUpdate}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-400">
                      {stage.completedAt ? `Updated ${formatDateTime(stage.completedAt)}` : `Opened ${formatDateTime(stage.createdAt)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="mt-4">
        <Link
          href={`/programs/${application.programId}`}
          className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[var(--portal-ink)] hover:bg-slate-50"
        >
          {applicationDeadlinePassed ? "View program" : "Open program and update application"}
        </Link>
      </div>
    </div>
  );
}

function formatWorkflowStageStatusLabel(status: WorkflowStageStatus) {
  switch (status) {
    case "ACTIVE":
      return "In review";
    case "PENDING":
      return "Queued";
    case "FORWARDED":
      return "Forwarded";
    case "APPROVED":
      return "Approved";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "REJECTED":
      return "Rejected";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

function DeadlineDetail({ deadline }: { deadline: StudentDashboard["deadlines"][number] }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/programs/${deadline.programId}`} className="font-medium text-[var(--portal-teal)] underline-offset-4 hover:underline">
            {deadline.programTitle}
          </Link>
          <p className="mt-1 text-sm text-slate-500">
            {deadline.requirementLabel ? `${deadline.requirementLabel} · ` : ""}
            {deadline.title}
          </p>
          {deadline.programUniversity ? <p className="mt-1 text-xs text-slate-400">{deadline.programUniversity}</p> : null}
        </div>
        <StatusBadge label={deadline.priority} />
      </div>
      <p className="mt-4 text-sm text-slate-600">{formatIsoDate(deadline.date)}</p>
    </div>
  );
}

function MeetingPreview({ meeting }: { meeting: Booking }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--portal-ink)]">{meeting.mentorName}</p>
          <p className="mt-1 text-sm text-slate-500">{meeting.expertise}</p>
        </div>
        <StatusBadge label={meeting.status} />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        {formatIsoDate(meeting.date)} · {meeting.time}
      </p>
    </div>
  );
}

function SavedProgramDetail({ program }: { program: Program }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="font-medium text-[var(--portal-ink)]">{program.title}</p>
      <p className="mt-1 text-sm text-slate-500">{program.university}</p>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>{program.country}</span>
        {program.deadline ? <span>{formatIsoDate(program.deadline)}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge label={program.type} />
        {program.featured ? <StatusBadge label="Featured" /> : null}
      </div>
    </div>
  );
}

function NotificationDetail({ item }: { item: NotificationItem }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="font-medium text-[var(--portal-ink)]">{item.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
      <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
    </div>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      [option.label, option.helperText, ...(option.keywords ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [deferredQuery, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => {
            const nextOpen = !current;
            if (!nextOpen) {
              setQuery("");
            }
            return nextOpen;
          });
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className={selectedOption ? "truncate text-[var(--portal-ink)]" : "truncate text-slate-400"}>
            {selectedOption?.label || placeholder}
          </p>
          {selectedOption?.helperText ? <p className="truncate text-xs text-slate-500">{selectedOption.helperText}</p> : null}
        </div>
        <span className="ml-3 text-slate-500">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-black/10 px-4 py-3"
            placeholder={searchPlaceholder}
            autoFocus
          />

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-slate-500">
                No matches found.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                    option.value === value ? "bg-[var(--portal-panel)]" : "hover:bg-[var(--portal-panel)]"
                  }`}
                >
                  <p className="font-medium text-[var(--portal-ink)]">{option.label}</p>
                  {option.helperText ? <p className="text-xs text-slate-500">{option.helperText}</p> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
