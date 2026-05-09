"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { apiDelete, apiGet, apiPut } from "@/services/api";
import { readCache, writeCache, clearCache } from "@/lib/pageCache";
import type {
  Application,
  ApplicationDocumentAsset,
  Booking,
  Program,
  ReviewerDashboard,
  StudentDashboard,
  WorkflowStageStatus,
} from "@/types";
import { Bell, CalendarDays, FileText, Users } from "lucide-react";
import { formatDateTime, formatIsoDate, getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

const STUDENT_DASH_CACHE_KEY = "plaksha-student-dashboard";
const REVIEWER_DASH_CACHE_KEY = "plaksha-reviewer-dashboard";
const DASH_TTL = 60_000; // 60 s — short enough to stay reasonably fresh

export default function Dashboard() {
  const { activeUser, loading: authLoading } = useAuth();
  const isOfficeUser = activeUser?.role === "admin";
  const isMentorUser = activeUser?.role === "mentor";
  const isReviewerUser = activeUser?.role === "reviewer";

  const cachedStudent = isReviewerUser || isOfficeUser || isMentorUser
    ? null
    : readCache<StudentDashboard>(STUDENT_DASH_CACHE_KEY, DASH_TTL);
  const cachedReviewer = isReviewerUser
    ? readCache<ReviewerDashboard>(REVIEWER_DASH_CACHE_KEY, DASH_TTL)
    : null;

  const [dashboard, setDashboard] = useState<StudentDashboard | null>(cachedStudent);
  const [reviewerDashboard, setReviewerDashboard] = useState<ReviewerDashboard | null>(cachedReviewer);
  const [loading, setLoading] = useState(!cachedStudent && !cachedReviewer);

  useEffect(() => {
    async function loadDashboard() {
      if (authLoading) return;
      if (isOfficeUser || isMentorUser) { setLoading(false); return; }

      // If we had a cache hit, skip the loading spinner but still refresh.
      const hasCached = isReviewerUser ? !!cachedReviewer : !!cachedStudent;
      if (!hasCached) setLoading(true);

      try {
        if (isReviewerUser) {
          const response = await apiGet<ReviewerDashboard>("/reviewer/tasks");
          setReviewerDashboard(response);
          setDashboard(null);
          writeCache(REVIEWER_DASH_CACHE_KEY, response);
        } else {
          const response = await apiGet<StudentDashboard>("/dashboard/me");
          setDashboard(response);
          setReviewerDashboard(null);
          writeCache(STUDENT_DASH_CACHE_KEY, response);
        }
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [activeUser, authLoading, isMentorUser, isOfficeUser, isReviewerUser]);

  async function cancelBooking(bookingId: number) {
    try {
      await apiDelete<{ id: number }>(`/bookings/${bookingId}`);
      toast.success("Booking cancelled.");
      clearCache(STUDENT_DASH_CACHE_KEY);
      const response = await apiGet<StudentDashboard>("/dashboard/me");
      setDashboard(response);
      writeCache(STUDENT_DASH_CACHE_KEY, response);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (authLoading) {
    return <div className="w-full px-6 py-8 text-slate-500">Loading dashboard...</div>;
  }

  if (isOfficeUser) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Student dashboard is role-specific</h1>
          <p className="mt-3 text-slate-500">
            You&apos;re currently browsing as an admin user. Switch to a student from the navbar or head to the admin panel to manage programs and approvals.
          </p>
        </div>
      </div>
    );
  }

  if (isMentorUser) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Mentor Workspace</p>
          <h1 className="mt-2 text-3xl font-bold">Your advising dashboard lives in the mentor workspace</h1>
          <p className="mt-3 text-slate-500">
            Use the mentor section to manage your availability and review meetings booked with you by students.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/admin/mentors"
              className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Open mentor workspace
            </a>
            <a
              href="/mentor"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
    return <div className="w-full px-8 py-8 text-slate-500">Loading dashboard...</div>;
  }

  const { applications, meetings, savedPrograms, notifications } = dashboard;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">

      {/* Page header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Student Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {activeUser?.name ? `Welcome back, ${activeUser.name.split(" ")[0]}` : "Your Global Engagement Dashboard"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Track your applications, upcoming mentor meetings, and saved programs.
        </p>
      </div>

      {/* My Applications */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">My Applications</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{applications.length}</span>
          </div>
          <Link href="/programs" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Browse programs →
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm text-slate-500">No applications yet.</p>
            <Link href="/programs" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
              Explore available programs →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {applications.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Status Updates */}
      {notifications.length > 0 ? (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={18} className="text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Recent Status Updates</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{notifications.length}</span>
          </div>
          <div className="space-y-3">
            {notifications.map((notification) => {
              const content = (
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100">
                    <Bell size={13} className="text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{notification.message}</p>
                    <p className="mt-1.5 text-xs text-slate-400">{formatDateTime(notification.createdAt)}</p>
                  </div>
                  {notification.applicationId ? (
                    <span className="shrink-0 text-xs font-semibold text-teal-700">View →</span>
                  ) : null}
                </div>
              );

              return notification.applicationId ? (
                <Link
                  key={notification.id}
                  href={`/dashboard/applications/${notification.applicationId}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                >
                  {content}
                </Link>
              ) : (
                <div key={notification.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Upcoming Mentor Meetings */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Upcoming Mentor Meetings</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{meetings.length}</span>
          </div>
          <Link href="/mentor" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Book a session →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {meetings.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              No meetings scheduled yet.{" "}
              <Link href="/mentor" className="font-semibold text-teal-700 hover:text-teal-800">
                Book a mentor session →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {meetings.map((meeting) => (
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  onCancel={() => void cancelBooking(meeting.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved Programs */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Saved Programs</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{savedPrograms.length}</span>
          </div>
          <Link href="/programs" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Browse all →
          </Link>
        </div>

        {savedPrograms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm text-slate-500">No saved programs yet.</p>
            <Link href="/programs" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
              Explore programs →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {savedPrograms.map((program) => (
              <SavedProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  const currentStage = application.currentWorkflowStage;

  return (
    <Link
      href={`/dashboard/applications/${application.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 group-hover:text-teal-800">{application.programTitle}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">{application.programUniversity}</p>
        </div>
        <StatusBadge label={application.status} />
      </div>

      {currentStage ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">Stage: </span>
            {currentStage.stageLabel}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">Submitted {formatIsoDate(application.createdAt)}</p>
        <span className="text-xs font-semibold text-teal-700 group-hover:underline">View application →</span>
      </div>
    </Link>
  );
}

function MeetingRow({ meeting, onCancel }: { meeting: Booking; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{meeting.mentorName}</p>
        <p className="mt-0.5 text-sm text-slate-500">{meeting.expertise}</p>
        <p className="mt-1 text-xs text-slate-400">
          {formatIsoDate(meeting.date)} · {meeting.time}
        </p>
        {meeting.topic ? <p className="mt-1 text-xs text-slate-500">{meeting.topic}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge label={meeting.status} />
        {meeting.status !== "Cancelled" ? (
          <button
            onClick={onCancel}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SavedProgramCard({ program }: { program: Program }) {
  return (
    <Link
      href={`/programs/${program.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-900 group-hover:text-teal-800">{program.title}</p>
        <StatusBadge label={program.type} />
      </div>
      <p className="mt-1 text-sm text-slate-500">{program.university}</p>
      <p className="mt-0.5 text-xs text-slate-400">{program.country}</p>
      {program.deadline ? (
        <p className="mt-3 text-xs text-slate-500">
          Deadline: <span className="font-medium text-slate-700">{formatIsoDate(program.deadline)}</span>
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">{program.duration}</span>
        <span className="text-xs font-semibold text-teal-700 group-hover:underline">View Program →</span>
      </div>
    </Link>
  );
}

/* ─── Reviewer dashboard (unchanged) ─── */

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
      setPreviewDocument(null);
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
    return { ...previewDocument, canInlinePreview };
  }, [previewDocument]);

  if (loading || !dashboard) {
    return <div className="w-full px-8 py-8 text-slate-500">Loading reviewer workspace...</div>;
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      {previewableDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-lg font-semibold text-slate-900">{previewableDocument.fileName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {previewableDocument.requirementLabel}
                  {previewableDocument.deadlineTitle ? ` · ${previewableDocument.deadlineTitle}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openApplicationDocument(previewableDocument.id, "download")}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 p-4">
              {previewableDocument.canInlinePreview ? (
                <iframe
                  title={previewableDocument.fileName}
                  src={previewableDocument.fileData}
                  className="h-full w-full rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-center">
                  <p className="text-lg font-semibold text-slate-900">Preview not supported for this file type</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    This document can still be downloaded and opened locally. Use the download action above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Reviewer Workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Advisory review requests</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          OGE has asked for your input on these applications. Review the materials and send your recommendation back to the office. You cannot route applications — OGE controls all stage transitions.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Requests</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{dashboard.tasks.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned to you</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{dashboard.tasks.length}</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {dashboard.tasks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            No review requests are assigned to you right now.
          </div>
        ) : (
          dashboard.tasks.map((task) => {
            const reqId = task.reviewRequest.id;
            const responseText = responseDrafts[reqId] || "";

            return (
              <div key={reqId} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{task.stage.stageLabel}</p>
                    <h2 className="mt-1.5 text-xl font-semibold text-slate-900">{task.application.programTitle}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-700">{task.application.studentName}</p>
                    <p className="text-sm text-slate-500">{task.application.programUniversity}</p>
                  </div>
                  <StatusBadge label={task.reviewRequest.status} />
                </div>

                {task.reviewRequest.instructions ? (
                  <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">OGE instructions for you</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{task.reviewRequest.instructions}</p>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-100 p-5">
                      <h3 className="text-base font-semibold text-slate-900">Student uploads</h3>
                      {task.application.documents.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {task.application.documents.map((document) => (
                            <div
                              key={document.id}
                              className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-900">
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
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                >
                                  {documentActionLoadingId === document.id ? "Loading..." : "Preview"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void openApplicationDocument(document.id, "download")}
                                  disabled={documentActionLoadingId === document.id}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-400">No documents uploaded for this application yet.</p>
                      )}
                    </div>

                    {task.application.statement ? (
                      <div className="rounded-xl border border-slate-100 p-5">
                        <h3 className="text-base font-semibold text-slate-900">Personal statement</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-500">{task.application.statement}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-100 p-5">
                    <h3 className="text-base font-semibold text-slate-900">Your response to OGE</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Write your recommendation, questions, or concerns below. Your response goes directly back to the Global Engagement Office.
                    </p>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseDrafts((current) => ({ ...current, [reqId]: e.target.value }))}
                      className="mt-4 min-h-[128px] w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      placeholder="Write your recommendation or input here..."
                    />
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => void respondToRequest(reqId, "RESPONDED")}
                        disabled={submittingActionKey === `req:${reqId}:RESPONDED`}
                        className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                      >
                        {submittingActionKey === `req:${reqId}:RESPONDED` ? "Sending..." : "Send recommendation to OGE"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void respondToRequest(reqId, "INFO_REQUESTED")}
                        disabled={submittingActionKey === `req:${reqId}:INFO_REQUESTED`}
                        className="rounded-lg border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                      >
                        {submittingActionKey === `req:${reqId}:INFO_REQUESTED` ? "Sending..." : "Request more information from OGE"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void respondToRequest(reqId, "REJECTED_RECOMMENDATION")}
                        disabled={submittingActionKey === `req:${reqId}:REJECTED_RECOMMENDATION`}
                        className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
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

function formatWorkflowStageStatusLabel(status: WorkflowStageStatus) {
  switch (status) {
    case "ACTIVE": return "In review";
    case "PENDING": return "Queued";
    case "FORWARDED": return "Forwarded";
    case "APPROVED": return "Approved";
    case "CHANGES_REQUESTED": return "Changes requested";
    case "REJECTED": return "Rejected";
    case "COMPLETED": return "Completed";
    default: return status;
  }
}
