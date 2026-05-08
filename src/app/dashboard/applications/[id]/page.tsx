"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Paperclip,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { apiGet, apiPut } from "@/services/api";
import type { Application, Program, StudentDashboard } from "@/types";
import { formatDateTime, formatIsoDate, getErrorMessage } from "@/lib/utils";

type PendingUpload = {
  deadlineId: number;
  requirementLabel: string;
  fileName: string;
  mimeType: string;
  fileData: string;
};

type UploadRequirement = {
  key: string;
  deadlineId: number;
  deadlineTitle: string;
  deadlineDate: string;
  requirementLabel: string;
  existingFiles: { id: number; fileName: string; uploadedAt: string }[];
};

function formatStageStatus(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "In review",
    PENDING: "Queued",
    FORWARDED: "Forwarded",
    APPROVED: "Approved",
    CHANGES_REQUESTED: "Changes requested",
    REJECTED: "Rejected",
    COMPLETED: "Completed",
  };
  return map[status] ?? status;
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeUser, loading: authLoading } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<Record<string, PendingUpload[]>>({});
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  const applicationId = Number(params.id);

  async function loadData() {
    setLoading(true);
    try {
      const dashboard = await apiGet<StudentDashboard>("/dashboard/me");
      const application = dashboard.applications.find((a) => a.id === applicationId);
      if (!application) {
        setLoading(false);
        return;
      }
      const prog = await apiGet<Program>(`/programs/${application.programId}`);
      setProgram(prog);
    } catch {
      setProgram(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [applicationId, activeUser, authLoading]);

  const application = program?.myApplication ?? null;

  const uploadRequirements = useMemo<UploadRequirement[]>(() => {
    if (!program || !application) return [];
    const existingDocuments = application.documents ?? [];
    return program.deadlines.flatMap((deadline) =>
      deadline.requiredDocuments.map((requirementLabel) => {
        const existingFiles = existingDocuments.filter(
          (d) => d.deadlineId === deadline.id && d.requirementLabel === requirementLabel,
        );
        return {
          key: `${deadline.id}:${requirementLabel}`,
          deadlineId: deadline.id,
          deadlineTitle: deadline.title,
          deadlineDate: deadline.date,
          requirementLabel,
          existingFiles: existingFiles.map((d) => ({ id: d.id, fileName: d.fileName, uploadedAt: d.uploadedAt })),
        };
      }),
    );
  }, [program, application]);

  const requirementsByDeadline = useMemo(() => {
    const map = new Map<number, { deadlineId: number; deadlineTitle: string; deadlineDate: string; requirements: UploadRequirement[] }>();
    for (const req of uploadRequirements) {
      if (!map.has(req.deadlineId)) {
        map.set(req.deadlineId, {
          deadlineId: req.deadlineId,
          deadlineTitle: req.deadlineTitle,
          deadlineDate: req.deadlineDate,
          requirements: [],
        });
      }
      map.get(req.deadlineId)!.requirements.push(req);
    }
    return Array.from(map.values());
  }, [uploadRequirements]);

  const hasPendingUploads = Object.keys(pendingUploads).length > 0;

  async function readFileAsDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.readAsDataURL(file);
    });
  }

  async function onSelectUpload(requirement: UploadRequirement, files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    try {
      const nextUploads = await Promise.all(
        Array.from(files).map(async (file) => ({
          deadlineId: requirement.deadlineId,
          requirementLabel: requirement.requirementLabel,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileData: await readFileAsDataUrl(file),
        })),
      );
      setPendingUploads((curr) => ({ ...curr, [requirement.key]: [...(curr[requirement.key] || []), ...nextUploads] }));
      toast.success(nextUploads.length === 1 ? `${requirement.requirementLabel} attached.` : `${nextUploads.length} files attached.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function clearPendingUpload(requirementKey: string, fileIndex?: number) {
    setPendingUploads((curr) => {
      const next = { ...curr };
      if (typeof fileIndex !== "number") {
        delete next[requirementKey];
        return next;
      }
      const remaining = (next[requirementKey] || []).filter((_, i) => i !== fileIndex);
      if (remaining.length === 0) delete next[requirementKey];
      else next[requirementKey] = remaining;
      return next;
    });
  }

  async function uploadApplicationDocuments() {
    if (!application) return;
    if (!hasPendingUploads) {
      toast.error("Attach at least one file first.");
      return;
    }
    setUploadingDocuments(true);
    try {
      const updatedApplication = await apiPut<Application>(`/applications/${application.id}/documents`, {
        uploads: Object.values(pendingUploads).flat(),
      });
      setProgram((prev) => (prev ? { ...prev, myApplication: updatedApplication } : prev));
      setPendingUploads({});
      toast.success("Documents uploaded.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingDocuments(false);
    }
  }

  if (authLoading || loading) {
    return <div className="px-6 py-8 text-slate-500">Loading application...</div>;
  }

  if (!program || !application) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-teal-700">
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">Application not found.</p>
        </div>
      </div>
    );
  }

  const currentStage = application.currentWorkflowStage;
  const uploadedCount = uploadRequirements.filter((r) => r.existingFiles.length > 0).length;
  const totalCount = uploadRequirements.length;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">

      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-teal-700"
      >
        <ArrowLeft size={14} />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">My Application</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{application.programTitle}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{application.programUniversity}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge label={application.status} />
            <Link
              href={`/programs/${program.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
            >
              <ExternalLink size={12} />
              View Program
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Submitted {formatIsoDate(application.createdAt)}
          {totalCount > 0 ? ` · ${uploadedCount} of ${totalCount} documents uploaded` : ""}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px]">

        {/* Left: Status and timeline */}
        <div className="space-y-5">

          {/* Current stage highlight */}
          {currentStage ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Current Stage</p>
              <p className="mt-1.5 text-base font-bold text-slate-900">{currentStage.stageLabel}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {currentStage.studentVisibleUpdate || "Your application is currently under review by the Global Engagement Office."}
              </p>
            </div>
          ) : null}

          {/* Reviewer / nomination notes */}
          {application.reviewerNotes ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Reviewer Notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{application.reviewerNotes}</p>
            </div>
          ) : null}

          {application.nominationNotes ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Nomination Notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{application.nominationNotes}</p>
            </div>
          ) : null}

          {/* Workflow timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Review Progress</h2>

            {application.workflowStages.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                No workflow stages have been assigned to this application yet. The Global Engagement Office will update you once review begins.
              </p>
            ) : (
              <div className="mt-5 space-y-0">
                {application.workflowStages.map((stage, index) => {
                  const isActive = currentStage?.id === stage.id;
                  const isDone = ["FORWARDED", "APPROVED", "COMPLETED"].includes(stage.status);
                  const isNeedsAction = stage.status === "CHANGES_REQUESTED";
                  const isLast = index === application.workflowStages.length - 1;

                  return (
                    <div key={stage.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                            isActive
                              ? "bg-teal-600 ring-2 ring-teal-200"
                              : isNeedsAction
                                ? "bg-amber-500"
                                : isDone
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                          }`}
                        />
                        {!isLast ? <div className="mt-1 h-full min-h-[32px] w-px bg-slate-200" /> : null}
                      </div>
                      <div className="pb-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-semibold ${isActive ? "text-teal-800" : "text-slate-900"}`}>
                            {stage.stageLabel}
                          </p>
                          <StatusBadge label={formatStageStatus(stage.status)} />
                        </div>
                        {stage.studentVisibleUpdate ? (
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{stage.studentVisibleUpdate}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-400">
                          {stage.completedAt
                            ? `Updated ${formatDateTime(stage.completedAt)}`
                            : `Opened ${formatDateTime(stage.createdAt)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Documents + quick actions */}
        <div className="self-start space-y-5">

          {/* Document uploads */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                <UploadCloud size={16} className="text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Required Documents</p>
                <p className="text-xs text-slate-500">
                  {totalCount === 0
                    ? "No uploads required"
                    : `${uploadedCount} of ${totalCount} uploaded`}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {uploadRequirements.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  No file uploads are required for this program.
                </p>
              ) : (
                <>
                  {requirementsByDeadline.map((group) => (
                    <div key={group.deadlineId}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{group.deadlineTitle}</p>
                        <p className="text-xs text-slate-400">Due {formatIsoDate(group.deadlineDate)}</p>
                      </div>
                      <div className="space-y-3">
                        {group.requirements.map((req) => {
                          const pending = pendingUploads[req.key] || [];
                          const hasUploaded = req.existingFiles.length > 0;
                          return (
                            <div key={req.key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileText size={14} className={hasUploaded ? "text-emerald-600" : "text-slate-400"} />
                                  <p className="text-sm font-semibold text-slate-800">{req.requirementLabel}</p>
                                </div>
                                <StatusBadge label={hasUploaded ? "Uploaded" : "Pending"} />
                              </div>

                              {/* Existing uploaded files */}
                              {req.existingFiles.map((file) => (
                                <div
                                  key={file.id}
                                  className="mb-2 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5"
                                >
                                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{file.fileName}</p>
                                    {file.uploadedAt ? (
                                      <p className="text-xs text-slate-500">Uploaded {formatIsoDate(file.uploadedAt)}</p>
                                    ) : null}
                                  </div>
                                </div>
                              ))}

                              {/* Staged (not yet saved) files */}
                              {pending.map((file, index) => (
                                <div
                                  key={`${file.fileName}-${index}`}
                                  className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Paperclip size={13} className="shrink-0 text-amber-600" />
                                    <p className="truncate text-sm font-medium text-slate-800">{file.fileName}</p>
                                    <span className="shrink-0 text-xs text-amber-700">Ready to upload</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => clearPendingUpload(req.key, index)}
                                    className="shrink-0 text-slate-400 hover:text-rose-600"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ))}

                              {/* Upload input */}
                              <label className="mt-1 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 transition hover:border-teal-400 hover:bg-teal-50">
                                <p className="text-sm text-slate-500">
                                  {hasUploaded || pending.length > 0 ? "Replace or add another file" : "Choose file"}
                                </p>
                                <span className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                  Browse
                                </span>
                                <input
                                  type="file"
                                  multiple
                                  className="sr-only"
                                  onChange={(e) => {
                                    void onSelectUpload(req, e.target.files);
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {hasPendingUploads ? (
                    <button
                      onClick={() => void uploadApplicationDocuments()}
                      disabled={uploadingDocuments}
                      className="w-full rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:opacity-70"
                    >
                      {uploadingDocuments ? "Uploading…" : "Save Documents"}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-semibold text-slate-900">Quick Actions</p>
            <div className="mt-3 space-y-2">
              <Link
                href={`/programs/${program.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
              >
                View Program Details
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                href="/mentor"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
              >
                Book Mentor Session
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                href={`/assistant?programId=${program.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-teal-600" />
                  Open Program Assistant
                </span>
                <span className="text-slate-400">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
