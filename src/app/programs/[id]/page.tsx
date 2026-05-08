"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  CalendarRange,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  MapPin,
  Paperclip,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import type { Application, Program } from "@/types";
import { formatIsoDate, getErrorMessage } from "@/lib/utils";

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

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeUser, loading: authLoading } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<Record<string, PendingUpload[]>>({});
  const [applyMode, setApplyMode] = useState(false);

  async function loadProgram() {
    try {
      const response = await apiGet<Program>(`/programs/${params.id}`);
      setProgram(response);
    } catch {
      setProgram(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void loadProgram();
  }, [params.id, activeUser, authLoading]);

  const uploadRequirements = useMemo<UploadRequirement[]>(() => {
    if (!program) return [];
    const existingDocuments = program.myApplication?.documents ?? [];
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
  }, [program]);

  // Group requirements by deadline for cleaner sidebar display
  const requirementsByDeadline = useMemo(() => {
    const map = new Map<number, { deadlineId: number; deadlineTitle: string; deadlineDate: string; requirements: UploadRequirement[] }>();
    for (const req of uploadRequirements) {
      if (!map.has(req.deadlineId)) {
        map.set(req.deadlineId, { deadlineId: req.deadlineId, deadlineTitle: req.deadlineTitle, deadlineDate: req.deadlineDate, requirements: [] });
      }
      map.get(req.deadlineId)!.requirements.push(req);
    }
    return Array.from(map.values());
  }, [uploadRequirements]);

  const hasPendingUploads = Object.keys(pendingUploads).length > 0;

  // At least one deadline must have ALL its requirements staged
  const canSubmitApplication = requirementsByDeadline.some((group) =>
    group.requirements.every((req) => (pendingUploads[req.key] ?? []).length > 0),
  );

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
      if (typeof fileIndex !== "number") { delete next[requirementKey]; return next; }
      const remaining = (next[requirementKey] || []).filter((_, i) => i !== fileIndex);
      if (remaining.length === 0) delete next[requirementKey]; else next[requirementKey] = remaining;
      return next;
    });
  }

  async function submitApplication() {
    if (!program) return;
    setSubmitting(true);
    try {
      const application = await apiPost<Application>("/applications", {
        programId: program.id,
        status: "Submitted",
        uploads: Object.values(pendingUploads).flat(),
      });
      setProgram({ ...program, myApplication: application });
      setPendingUploads({});
      toast.success("Application submitted.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadApplicationDocuments() {
    if (!program?.myApplication) return;
    if (!hasPendingUploads) { toast.error("Attach at least one file first."); return; }
    setUploadingDocuments(true);
    try {
      const updatedApplication = await apiPut<Application>(`/applications/${program.myApplication.id}/documents`, {
        uploads: Object.values(pendingUploads).flat(),
      });
      setProgram({ ...program, myApplication: updatedApplication });
      setPendingUploads({});
      toast.success("Documents uploaded.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingDocuments(false);
    }
  }

  async function toggleSaved() {
    if (!program) return;
    try {
      if (program.isSaved) {
        await apiDelete(`/saved-programs/${program.id}`);
        setProgram({ ...program, isSaved: false });
        toast.success("Removed from saved programs.");
      } else {
        await apiPost(`/saved-programs`, { programId: program.id });
        setProgram({ ...program, isSaved: true });
        toast.success("Saved to your dashboard.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (authLoading || loading) return <div className="px-6 py-8 text-slate-500">Loading program...</div>;
  if (!program) return <div className="px-6 py-8 text-slate-500">Program not found.</div>;

  const isStudent = activeUser?.role === "student";
  const application = program.myApplication;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px]">

        {/* ── LEFT: Program info ── */}
        <div className="space-y-5">

          {/* Header card */}
          <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={program.type} />
                {program.featured ? <StatusBadge label="Featured" /> : null}
              </div>
              <div className="flex items-center gap-2">
                {program.externalLink ? (
                  <a
                    href={program.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                  >
                    <ExternalLink size={13} />
                    Official page
                  </a>
                ) : null}
                {isStudent ? (
                  <button
                    onClick={() => void toggleSaved()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                  >
                    {program.isSaved ? <BookmarkCheck size={13} className="text-teal-600" /> : <Bookmark size={13} />}
                    {program.isSaved ? "Saved" : "Save"}
                  </button>
                ) : null}
              </div>
            </div>

            <h1 className="mt-4 text-3xl font-bold text-slate-900">{program.title}</h1>
            <p className="mt-1 text-base text-slate-500">{program.university}</p>

            {/* Key facts row */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoTile icon={<MapPin size={15} />} label="Country" value={program.country} />
              <InfoTile icon={<Clock3 size={15} />} label="Duration" value={program.duration} />
              <InfoTile icon={<CalendarRange size={15} />} label="Starts" value={program.startDate ? formatIsoDate(program.startDate) : "TBA"} />
              <InfoTile icon={<CalendarRange size={15} />} label="Ends" value={program.endDate ? formatIsoDate(program.endDate) : "TBA"} />
            </div>

            {/* Eligibility — full-width since it's long text */}
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <GraduationCap size={13} />
                Eligibility
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{program.eligibility}</p>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Program Overview</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{program.description}</p>
          </div>

          {/* Deadlines */}
          {program.deadlines.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Deadlines</h2>
              <div className="mt-4 space-y-3">
                {program.deadlines.map((deadline) => (
                  <div key={deadline.id} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{deadline.title}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{formatIsoDate(deadline.date)}</p>
                      </div>
                      <StatusBadge label={deadline.priority} />
                    </div>
                    {deadline.requiredDocuments.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {deadline.requiredDocuments.map((item) => (
                          <span key={`${deadline.id}-${item}`} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                            <Paperclip size={11} />
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* ── RIGHT: Application sidebar ── */}
        <aside className="space-y-5">

          {/* Application card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Card header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">Your Application</h2>
              {application ? <StatusBadge label={application.status} /> : null}
            </div>

            <div className="px-6 py-5">
              {!isStudent ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  Switch to a student account from the navbar to apply to this program.
                </p>
              ) : !application ? (
                /* ── Not yet applied ── */
                !applyMode ? (
                  /* Step 1: entry point */
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-slate-500">
                      {uploadRequirements.length > 0
                        ? "You'll need to upload the required documents for at least one deadline before your application can be submitted."
                        : "No documents required for this program."}
                    </p>
                    <button
                      onClick={() => setApplyMode(true)}
                      className="w-full rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
                    >
                      Apply to Program
                    </button>
                  </div>
                ) : (
                  /* Step 2: upload mode */
                  <div className="space-y-5">
                    {uploadRequirements.length > 0 ? (
                      <>
                        {/* Progress hint */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800">Upload required documents</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Complete all documents for at least one deadline to enable submission.
                          </p>
                        </div>

                        {/* Upload fields grouped by deadline */}
                        <div className="space-y-5">
                          {requirementsByDeadline.map((group) => {
                            const deadlineComplete = group.requirements.every(
                              (req) => (pendingUploads[req.key] ?? []).length > 0,
                            );
                            return (
                              <div key={group.deadlineId}>
                                <div className="mb-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {deadlineComplete
                                      ? <CheckCircle2 size={14} className="text-emerald-600" />
                                      : <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />
                                    }
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{group.deadlineTitle}</p>
                                  </div>
                                  <p className="text-xs text-slate-400">Due {formatIsoDate(group.deadlineDate)}</p>
                                </div>
                                <div className="space-y-2">
                                  {group.requirements.map((requirement) => {
                                    const pending = pendingUploads[requirement.key] || [];
                                    return (
                                      <div key={requirement.key} className="rounded-lg border border-slate-200 bg-white p-3">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-2">
                                            <FileText size={14} className={pending.length > 0 ? "text-teal-600" : "text-slate-400"} />
                                            <p className="text-sm font-semibold text-slate-800">{requirement.requirementLabel}</p>
                                          </div>
                                          {pending.length > 0
                                            ? <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">Ready</span>
                                            : <span className="text-xs text-slate-400">Required</span>
                                          }
                                        </div>
                                        {pending.map((file, index) => (
                                          <div key={`${file.fileName}-${index}`} className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Paperclip size={13} className="shrink-0 text-amber-600" />
                                              <p className="truncate text-sm font-medium text-slate-800">{file.fileName}</p>
                                            </div>
                                            <button type="button" onClick={() => clearPendingUpload(requirement.key, index)} className="shrink-0 text-slate-400 hover:text-rose-600">
                                              <X size={13} />
                                            </button>
                                          </div>
                                        ))}
                                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 transition hover:border-teal-400 hover:bg-teal-50">
                                          <p className="text-xs text-slate-500">{pending.length > 0 ? "Add another file" : `Attach ${requirement.requirementLabel}`}</p>
                                          <span className="shrink-0 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">Browse</span>
                                          <input type="file" multiple className="sr-only" onChange={(e) => { void onSelectUpload(requirement, e.target.files); e.currentTarget.value = ""; }} />
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => void submitApplication()}
                          disabled={submitting || !canSubmitApplication}
                          className="w-full rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {submitting ? "Submitting…" : canSubmitApplication ? "Submit Application" : "Complete a deadline to apply"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => void submitApplication()}
                        disabled={submitting}
                        className="w-full rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:opacity-70"
                      >
                        {submitting ? "Submitting…" : "Confirm Application"}
                      </button>
                    )}

                    {/* Cancel — go back to step 1 */}
                    <button
                      type="button"
                      onClick={() => { setApplyMode(false); setPendingUploads({}); }}
                      className="w-full rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                )
              ) : (
                /* ── Already applied ── */
                <div className="space-y-5">

                  {/* Reviewer / nomination notes */}
                  {application.reviewerNotes ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Reviewer Notes</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{application.reviewerNotes}</p>
                    </div>
                  ) : null}
                  {application.nominationNotes ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Nomination Notes</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{application.nominationNotes}</p>
                    </div>
                  ) : null}

                  {/* Documents — grouped by deadline */}
                  {uploadRequirements.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <UploadCloud size={16} className="text-teal-600" />
                        <h3 className="font-semibold text-slate-900">Required Documents</h3>
                      </div>

                      <div className="space-y-5">
                        {requirementsByDeadline.map((group) => (
                          <div key={group.deadlineId}>
                            {/* Deadline header */}
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{group.deadlineTitle}</p>
                              <p className="text-xs text-slate-400">Due {formatIsoDate(group.deadlineDate)}</p>
                            </div>

                            <div className="space-y-3">
                              {group.requirements.map((requirement) => {
                                const pending = pendingUploads[requirement.key] || [];
                                const hasUploaded = requirement.existingFiles.length > 0;
                                return (
                                  <div key={requirement.key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    {/* Document name + status */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                      <div className="flex items-center gap-2">
                                        <FileText size={15} className={hasUploaded ? "text-emerald-600" : "text-slate-400"} />
                                        <p className="font-semibold text-slate-800">{requirement.requirementLabel}</p>
                                      </div>
                                      <StatusBadge label={hasUploaded ? "Uploaded" : "Pending"} />
                                    </div>

                                    {/* Existing uploaded files — PROMINENT */}
                                    {requirement.existingFiles.map((file) => (
                                      <div key={file.id} className="mb-2 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-slate-900">{file.fileName}</p>
                                          {file.uploadedAt ? (
                                            <p className="text-xs text-slate-500">Uploaded {formatIsoDate(file.uploadedAt)}</p>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Pending (staged, not yet submitted) files */}
                                    {pending.map((file, index) => (
                                      <div key={`${file.fileName}-${index}`} className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Paperclip size={14} className="shrink-0 text-amber-600" />
                                          <p className="truncate text-sm font-medium text-slate-800">{file.fileName}</p>
                                          <span className="shrink-0 text-xs text-amber-700">Ready to upload</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => clearPendingUpload(requirement.key, index)}
                                          className="shrink-0 text-slate-400 hover:text-rose-600"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}

                                    {/* Upload input */}
                                    <label className="mt-1 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 transition hover:border-teal-400 hover:bg-teal-50">
                                      <p className="text-sm text-slate-500">
                                        {hasUploaded || pending.length > 0 ? "Replace or add another file" : `Choose file for ${requirement.requirementLabel}`}
                                      </p>
                                      <span className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                        Browse
                                      </span>
                                      <input
                                        type="file"
                                        multiple
                                        className="sr-only"
                                        onChange={(e) => { void onSelectUpload(requirement, e.target.files); e.currentTarget.value = ""; }}
                                      />
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Upload submit button — only shows when there are staged files */}
                      {hasPendingUploads ? (
                        <button
                          onClick={() => void uploadApplicationDocuments()}
                          disabled={uploadingDocuments}
                          className="mt-5 w-full rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:opacity-70"
                        >
                          {uploadingDocuments ? "Uploading…" : "Save Documents"}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                      No file uploads are required for this program.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mentor guidance */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Need guidance first?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Book a mentor session to refine your fit, strategy, and documentation before you submit.
            </p>
            <Link
              href="/mentor"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              Book a mentor session →
            </Link>
          </div>

          {/* Program Assistant */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal-600" />
              <h3 className="font-semibold text-slate-900">Program Assistant</h3>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Ask questions about this program or run an honest review of your uploaded application materials against the requirements.
            </p>
            {!isStudent ? (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                Switch to a student account to use the program assistant.
              </p>
            ) : (
              <Link
                href={`/assistant?programId=${program.id}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Open {program.title} Assistant
                <ExternalLink size={13} />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
