"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bookmark, BookmarkCheck, CalendarRange, Clock3, ExternalLink, FileUp, GraduationCap, MapPin, Sparkles } from "lucide-react";
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
  existingFiles: {
    id: number;
    fileName: string;
    uploadedAt: string;
  }[];
};

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeUser, loading: authLoading } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<Record<string, PendingUpload[]>>({});

  async function loadProgram() {
    try {
      const response = await apiGet<Program>(`/programs/${params.id}`);
      setProgram(response);
    } catch (_error) {
      setProgram(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }

    setLoading(true);
    void loadProgram();
  }, [params.id, activeUser, authLoading]);

  const uploadRequirements = useMemo<UploadRequirement[]>(() => {
    if (!program) return [];

    const existingDocuments = program.myApplication?.documents ?? [];

    return program.deadlines.flatMap((deadline) =>
      deadline.requiredDocuments.map((requirementLabel) => {
        const existingFiles = existingDocuments.filter(
          (document) => document.deadlineId === deadline.id && document.requirementLabel === requirementLabel,
        );

        return {
          key: `${deadline.id}:${requirementLabel}`,
          deadlineId: deadline.id,
          deadlineTitle: deadline.title,
          deadlineDate: deadline.date,
          requirementLabel,
          existingFiles: existingFiles.map((document) => ({
            id: document.id,
            fileName: document.fileName,
            uploadedAt: document.uploadedAt,
          })),
        };
      }),
    );
  }, [program]);

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

      setPendingUploads((current) => ({
        ...current,
        [requirement.key]: [
          ...(current[requirement.key] || []),
          ...nextUploads,
        ],
      }));
      toast.success(
        nextUploads.length === 1
          ? `${requirement.requirementLabel} attached.`
          : `${nextUploads.length} files attached for ${requirement.requirementLabel}.`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function clearPendingUpload(requirementKey: string, fileIndex?: number) {
    setPendingUploads((current) => {
      const next = { ...current };
      if (typeof fileIndex !== "number") {
        delete next[requirementKey];
        return next;
      }

      const remaining = (next[requirementKey] || []).filter((_, index) => index !== fileIndex);
      if (remaining.length === 0) {
        delete next[requirementKey];
      } else {
        next[requirementKey] = remaining;
      }
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
    if (Object.keys(pendingUploads).length === 0) {
      toast.error("Attach at least one file first.");
      return;
    }

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

  if (authLoading || loading) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-white/50">Loading program...</div>;
  }

  if (!program) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-white/50">Program not found.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={program.type} />
                {program.featured ? <StatusBadge label="Featured" /> : null}
              </div>
              <h1 className="mt-4 text-4xl font-bold">{program.title}</h1>
              <p className="mt-2 text-white/50">{program.university}</p>
            </div>
            {activeUser?.role === "student" ? (
              <button
                onClick={() => void toggleSaved()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium"
              >
                {program.isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {program.isSaved ? "Saved" : "Save Program"}
              </button>
            ) : null}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <InfoTile icon={<MapPin size={18} />} label="Country" value={program.country} />
            <InfoTile icon={<GraduationCap size={18} />} label="Eligibility" value={program.eligibility} />
            <InfoTile icon={<Clock3 size={18} />} label="Duration" value={program.duration} />
            <InfoTile icon={<CalendarRange size={18} />} label="Program Starts" value={program.startDate ? formatIsoDate(program.startDate) : "To be announced"} />
            <InfoTile icon={<CalendarRange size={18} />} label="Program Ends" value={program.endDate ? formatIsoDate(program.endDate) : "To be announced"} />
          </div>

          {program.externalLink ? (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-[var(--portal-panel)] p-4">
              <p className="text-sm uppercase tracking-[0.16em] text-white/40">Official Program Page</p>
              <a
                href={program.externalLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--portal-teal)]"
              >
                Visit the official program page
                <ExternalLink size={16} />
              </a>
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Program Overview</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-white/60">{program.description}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {program.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/[0.05] px-3 py-1 text-sm text-white/60">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Deadlines and required documents</h2>
            <div className="mt-4 space-y-3">
              {program.deadlines.map((deadline) => (
                <div key={deadline.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{deadline.title}</p>
                      <p className="text-sm text-white/50">{formatIsoDate(deadline.date)}</p>
                    </div>
                    <StatusBadge label={deadline.priority} />
                  </div>
                  {deadline.requiredDocuments.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {deadline.requiredDocuments.map((item) => (
                        <span key={`${deadline.id}-${item}`} className="rounded-full bg-[var(--portal-panel)] px-3 py-1 text-sm text-white/60">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-white/50">No supporting upload is required for this milestone.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Application</h2>
            {activeUser?.role !== "student" ? (
              <p className="mt-3 text-sm leading-6 text-white/60">
                Switch to a student user from the navbar to apply to this program and see synced dashboard updates.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {program.myApplication ? (
                  <>
                    <StatusBadge label={program.myApplication.status} />
                    {program.myApplication.reviewerNotes ? (
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="text-sm font-medium text-white/50">Reviewer Notes</p>
                        <p className="mt-2 text-sm leading-6 text-white/60">{program.myApplication.reviewerNotes}</p>
                      </div>
                    ) : null}
                    {program.myApplication.nominationNotes ? (
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="text-sm font-medium text-white/50">Nomination Notes</p>
                        <p className="mt-2 text-sm leading-6 text-white/60">{program.myApplication.nominationNotes}</p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2">
                    <FileUp size={18} className="text-[var(--portal-teal)]" />
                    <h3 className="font-semibold">Required uploads</h3>
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    Upload the files requested by each deadline. The deadline stays visible next to every upload requirement.
                  </p>

                  <div className="mt-4 space-y-3">
                    {uploadRequirements.length === 0 ? (
                      <p className="rounded-2xl bg-white/[0.03] px-4 py-4 text-sm text-white/50">
                        No file uploads are required for this program at the moment.
                      </p>
                    ) : (
                      uploadRequirements.map((requirement) => {
                        const pendingUpload = pendingUploads[requirement.key] || [];
                        return (
                          <div key={requirement.key} className="rounded-2xl border border-slate-100 p-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-[var(--portal-ink)]">{requirement.requirementLabel}</p>
                                  <p className="text-sm text-white/50">
                                    {requirement.deadlineTitle} · upload by {formatIsoDate(requirement.deadlineDate)}
                                  </p>
                                </div>
                                {requirement.existingFiles.length > 0 ? <StatusBadge label="Uploaded" /> : <StatusBadge label="Pending" />}
                              </div>

                              {requirement.existingFiles.length > 0 ? (
                                <div className="space-y-2 text-sm text-white/50">
                                  {requirement.existingFiles.map((file) => (
                                    <p key={file.id}>
                                      Uploaded: {file.fileName}
                                      {file.uploadedAt ? ` · uploaded ${formatIsoDate(file.uploadedAt)}` : ""}
                                    </p>
                                  ))}
                                </div>
                              ) : null}

                              {pendingUpload.length > 0 ? (
                                <div className="space-y-2">
                                  {pendingUpload.map((file, index) => (
                                    <div key={`${file.fileName}-${index}`} className="flex items-center justify-between rounded-2xl bg-[var(--portal-panel)] px-4 py-3 text-sm">
                                      <span className="text-white/60">Ready to upload: {file.fileName}</span>
                                      <button
                                        type="button"
                                        onClick={() => clearPendingUpload(requirement.key, index)}
                                        className="font-medium text-rose-600"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              <label className="block cursor-pointer rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-4 py-4 transition hover:border-[var(--portal-teal)] hover:bg-[var(--portal-panel)]">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--portal-ink)]">
                                      {requirement.existingFiles.length > 0 || pendingUpload.length > 0 ? "Add more files" : "Upload file(s)"}
                                    </p>
                                    <p className="mt-1 text-xs text-white/50">
                                      Click to choose one or more files for {requirement.requirementLabel}.
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-700">
                                    Choose files
                                  </span>
                                </div>
                                <input
                                  type="file"
                                  multiple
                                  className="sr-only"
                                  onChange={(event) => {
                                    void onSelectUpload(requirement, event.target.files);
                                    event.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {activeUser?.role === "student" && program.myApplication ? (
                    <button
                      onClick={() => void uploadApplicationDocuments()}
                      disabled={uploadingDocuments}
                      className="mt-5 w-full rounded-full border border-white/10 px-6 py-3 font-semibold text-[var(--portal-ink)] disabled:opacity-70"
                    >
                      {uploadingDocuments ? "Uploading..." : "Upload / Replace Documents"}
                    </button>
                  ) : null}
                </div>

                {!program.myApplication ? (
                  <button
                    onClick={() => void submitApplication()}
                    disabled={submitting}
                    className="w-full rounded-full bg-[var(--portal-teal)] px-6 py-3 font-semibold text-white disabled:opacity-70"
                  >
                    {submitting ? "Submitting..." : "Apply to Program"}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Need guidance first?</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Book a mentor session to refine fit, application strategy, and documentation before you submit.
            </p>
            <Link href="/mentor" className="mt-4 inline-flex text-sm font-semibold text-[var(--portal-teal)]">
              Go to Mentor Booking
            </Link>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--portal-teal)]" />
              <h2 className="text-xl font-semibold">Program Assistant</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Open the dedicated assistant workspace for this program. You can switch between program assistants there, keep a full per-program conversation history, and run honest application reviews against the latest uploaded materials saved in the portal.
            </p>
            {activeUser?.role !== "student" ? (
              <p className="mt-4 rounded-2xl bg-white/[0.03] px-4 py-4 text-sm text-white/50">
                Switch to a student account to open the program assistant workspace.
              </p>
            ) : (
              <div className="mt-5 rounded-2xl border border-black/5 bg-[var(--portal-panel)] p-4">
                <p className="text-sm leading-6 text-white/60">
                  Use the workspace for two things:
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <li>1. Ask grounded questions about this specific program and its official page.</li>
                  <li>2. Review your current application against the latest documents already uploaded for this program.</li>
                </ul>
                <Link
                  href={`/assistant?programId=${program.id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white"
                >
                  Open {program.title} assistant
                  <ExternalLink size={16} />
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--portal-panel)] p-4">
      <div className="flex items-center gap-2 text-[var(--portal-teal)]">{icon}</div>
      <p className="mt-3 text-sm uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
