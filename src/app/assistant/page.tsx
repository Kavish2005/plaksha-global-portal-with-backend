"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarRange, ExternalLink, FileText, FileUp, Search, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { apiDelete, apiGet, apiPost } from "@/services/api";
import type { ChatInteraction, Program, ProgramAssistantReply, ProgramReviewReport } from "@/types";
import { formatIsoDate, getErrorMessage } from "@/lib/utils";

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
  mode: "qa" | "review";
  createdAt?: string;
  reviewReport?: ProgramReviewReport | null;
};

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
};

function cleanAssistantMarkdown(text: string) {
  return String(text || "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export default function ProgramAssistantPage() {
  const searchParams = useSearchParams();
  const { activeUser, loading: authLoading } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programSearch, setProgramSearch] = useState("");
  const deferredProgramSearch = useDeferredValue(programSearch);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<Record<string, PendingUpload[]>>({});
  const conversationViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadPrograms() {
      if (authLoading) return;
      if (activeUser?.role !== "student") {
        setLoadingPrograms(false);
        setLoadingWorkspace(false);
        return;
      }

      setLoadingPrograms(true);
      try {
        const response = await apiGet<Program[]>("/programs");
        setPrograms(response);

        const queryProgramId = Number(searchParams.get("programId"));
        const initialId =
          response.find((program) => program.id === queryProgramId)?.id ??
          response[0]?.id ??
          null;
        setSelectedProgramId(initialId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoadingPrograms(false);
      }
    }

    void loadPrograms();
  }, [activeUser?.role, authLoading, searchParams]);

  useEffect(() => {
    async function loadWorkspace(programId: number) {
      setLoadingWorkspace(true);
      try {
        const [program, history] = await Promise.all([
          apiGet<Program>(`/programs/${programId}`),
          apiGet<ChatInteraction[]>(`/programs/${programId}/assistant/history`),
        ]);

        setSelectedProgram(program);
        setMessages(flattenHistory(history));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoadingWorkspace(false);
      }
    }

    if (!selectedProgramId || activeUser?.role !== "student") {
      setSelectedProgram(null);
      setMessages([]);
      setLoadingWorkspace(false);
      return;
    }

    void loadWorkspace(selectedProgramId);
  }, [activeUser?.role, selectedProgramId]);

  const filteredPrograms = useMemo(() => {
    const needle = deferredProgramSearch.trim().toLowerCase();
    if (!needle) return programs;

    return programs.filter((program) => {
      const haystack = [program.title, program.university, program.country, program.type, ...program.tags].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [deferredProgramSearch, programs]);

  useEffect(() => {
    const viewport = conversationViewportRef.current;
    if (!viewport) return;

    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, selectedProgramId, loadingWorkspace]);

  useEffect(() => {
    if (!selectedProgramId) return;

    try {
      const stored = window.sessionStorage.getItem(`assistant-pending-uploads:${selectedProgramId}`);
      if (!stored) {
        setPendingUploads({});
        return;
      }

      const parsed = JSON.parse(stored) as Record<string, PendingUpload[]>;
      setPendingUploads(parsed || {});
    } catch {
      setPendingUploads({});
    }
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedProgramId) return;

    if (Object.keys(pendingUploads).length === 0) {
      window.sessionStorage.removeItem(`assistant-pending-uploads:${selectedProgramId}`);
      return;
    }

    window.sessionStorage.setItem(`assistant-pending-uploads:${selectedProgramId}`, JSON.stringify(pendingUploads));
  }, [pendingUploads, selectedProgramId]);

  const uploadRequirements = useMemo<UploadRequirement[]>(() => {
    if (!selectedProgram) return [];

    return selectedProgram.deadlines.flatMap((deadline) =>
      deadline.requiredDocuments.map((requirementLabel) => ({
        key: `${deadline.id}:${requirementLabel}`,
        deadlineId: deadline.id,
        deadlineTitle: deadline.title,
        deadlineDate: deadline.date,
        requirementLabel,
      })),
    );
  }, [selectedProgram]);

  const missingAssistantRequirements = useMemo(
    () => uploadRequirements.filter((requirement) => (pendingUploads[requirement.key] || []).length === 0),
    [pendingUploads, uploadRequirements],
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

      setPendingUploads((current) => ({
        ...current,
        [requirement.key]: [
          ...(current[requirement.key] || []),
          ...nextUploads,
        ],
      }));
      toast.success(
        nextUploads.length === 1
          ? `${requirement.requirementLabel} attached for assistant review.`
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

  async function sendProgramAssistant(mode: "qa" | "review") {
    if (!selectedProgram) return;

    const message =
      mode === "qa"
        ? assistantInput.trim()
        : assistantInput.trim() ||
          "Please review my current application honestly and tell me exactly where I stand for this program, what is missing, and what I should improve.";

    if (mode === "qa" && !message) {
      toast.error("Ask a question about this program first.");
      return;
    }

    setAssistantLoading(true);
    try {
      const reply = await apiPost<ProgramAssistantReply>(`/programs/${selectedProgram.id}/assistant`, {
        mode,
        message,
        pendingUploads: Object.values(pendingUploads).flat(),
      });

      setMessages((current) => [
        ...current,
        { role: "user", content: message, mode },
        {
          role: "assistant",
          content: reply.reply,
          mode,
          createdAt: reply.interaction.createdAt,
          reviewReport: reply.reviewReport ?? null,
        },
      ]);

      if (mode === "qa") {
        setAssistantInput("");
      }

      const refreshedProgram = await apiGet<Program>(`/programs/${selectedProgram.id}`);
      setSelectedProgram(refreshedProgram);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAssistantLoading(false);
    }
  }

  async function resetConversation() {
    if (!selectedProgram) return;

    try {
      await apiDelete<{ deletedCount: number; message: string }>(`/programs/${selectedProgram.id}/assistant/history`);
      setMessages([]);
      toast.success(`Reset ${selectedProgram.title} conversation.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (authLoading || loadingPrograms) {
    return <div className="mx-auto max-w-7xl px-6 py-16 text-white/50">Loading assistant workspace...</div>;
  }

  if (activeUser?.role !== "student") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Program Assistant</p>
          <h1 className="mt-2 text-3xl font-bold">This workspace is student-specific</h1>
          <p className="mt-3 text-white/60">
            Switch to a student account to ask program questions and request application reviews grounded in your uploaded materials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Program Assistant</p>
        <h1 className="mt-2 text-4xl font-bold">Program-specific application and Q&A workspace</h1>
        <p className="mt-3 max-w-4xl text-white/60">
          Switch between programs, ask grounded questions, and request honest application reviews. Every answer re-checks the latest program data, official program link context, and your uploaded application documents saved in the portal.
        </p>
      </div>

      <div className="mt-10 space-y-8">
        <section className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-[var(--portal-teal)]" />
            <h2 className="text-xl font-semibold">Choose a program assistant</h2>
          </div>
          <p className="mt-2 text-sm text-white/50">Search once, then switch between Stanford, NTU, ETH Zurich, and any other program assistant instantly.</p>

          <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
            <input
              value={programSearch}
              onChange={(event) => setProgramSearch(event.target.value)}
              placeholder="Search by title, university, country"
              className="rounded-2xl border border-white/10 px-4 py-3"
            />
            <select
              value={selectedProgramId ?? ""}
              onChange={(event) => setSelectedProgramId(event.target.value ? Number(event.target.value) : null)}
              className="rounded-2xl border border-white/10 px-4 py-3"
            >
              {filteredPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title} · {program.university}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-sm text-white/50">{filteredPrograms.length} matching programs.</p>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-6 shadow-sm">
          {loadingWorkspace || !selectedProgram ? (
            <p className="text-white/50">Loading selected program...</p>
          ) : (
            <>
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={selectedProgram.type} />
                    {selectedProgram.featured ? <StatusBadge label="Featured" /> : null}
                  </div>
                  <h2 className="mt-4 text-3xl font-bold">{selectedProgram.title}</h2>
                  <p className="mt-2 text-white/50">
                    {selectedProgram.university} · {selectedProgram.country}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/programs/${selectedProgram.id}`}
                    className="rounded-full bg-[var(--portal-teal)] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Open program page
                  </Link>
                  {selectedProgram.externalLink ? (
                    <a
                      href={selectedProgram.externalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-[var(--portal-ink)]"
                    >
                      Official program page
                      <ExternalLink size={15} />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[0.28fr_0.28fr_0.44fr]">
                <InfoTile icon={<CalendarRange size={16} />} label="Timeline">
                  {selectedProgram.startDate ? `${formatIsoDate(selectedProgram.startDate)} to ` : ""}
                  {selectedProgram.endDate ? formatIsoDate(selectedProgram.endDate) : "Dates not listed"}
                </InfoTile>
                <InfoTile icon={<FileText size={16} />} label="Application status">
                  {selectedProgram.myApplication?.status || "Not submitted yet"}
                </InfoTile>
                <div className="rounded-2xl border border-black/5 bg-[var(--portal-panel)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Current document requirements</p>
                  <div className="mt-3 space-y-3">
                    {selectedProgram.deadlines.length > 0 ? (
                      selectedProgram.deadlines.map((deadline) => (
                        <div key={deadline.id}>
                          <p className="text-sm font-medium">
                            {deadline.title} · {formatIsoDate(deadline.date)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {deadline.requiredDocuments.length > 0 ? (
                              deadline.requiredDocuments.map((item) => (
                                <span key={`${deadline.id}-${item}`} className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-white/60">
                                  {item}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-white/50">No file upload required for this deadline.</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-white/50">No active deadlines listed for this program.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-black/5 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2">
                  <FileUp size={18} className="text-[var(--portal-teal)]" />
                  <h3 className="text-lg font-semibold">Assistant uploads</h3>
                </div>
                <p className="mt-2 text-sm text-white/50">
                  Upload resume, LOR, transcript, or any required files here for assistant review. These files are used by this assistant workspace even if you haven&apos;t submitted them through the application form yet.
                </p>

                <div className="mt-4 rounded-2xl bg-[var(--portal-panel)] p-4 text-sm text-white/60">
                  {missingAssistantRequirements.length > 0 ? (
                    <span>
                      Missing from assistant uploads:{" "}
                      {missingAssistantRequirements.map((requirement) => requirement.requirementLabel).join(", ")}
                    </span>
                  ) : (
                    <span>All currently required files are attached in this assistant workspace.</span>
                  )}
                </div>

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
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-[var(--portal-ink)]">{requirement.requirementLabel}</p>
                              <p className="text-sm text-white/50">
                                {requirement.deadlineTitle} · upload by {formatIsoDate(requirement.deadlineDate)}
                              </p>
                            </div>
                            <StatusBadge label={pendingUpload.length > 0 ? "Attached here" : "Missing here"} />
                          </div>

                          {pendingUpload.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {pendingUpload.map((file, index) => (
                                <div key={`${file.fileName}-${index}`} className="flex items-center justify-between rounded-2xl bg-[var(--portal-panel)] px-4 py-3 text-sm">
                                  <span className="text-white/60">Ready for assistant review: {file.fileName}</span>
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

                          <label className="mt-3 block cursor-pointer rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-4 py-4 transition hover:border-[var(--portal-teal)] hover:bg-[var(--portal-panel)]">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-[var(--portal-ink)]">
                                  {pendingUpload.length > 0 ? "Add more files for assistant" : "Upload file(s) for assistant"}
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
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white/[0.04] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--portal-teal)]" />
            <h2 className="text-xl font-semibold">Live assistant conversation</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Use <span className="font-semibold">Ask About This Program</span> for eligibility, structure, and deadlines, or{" "}
            <span className="font-semibold">Review My Application</span> for a candid assessment of your current uploaded materials for the selected program.
          </p>

          <div className="mt-4 rounded-2xl border border-black/5 bg-[var(--portal-panel)] p-4 text-sm text-white/60">
            Before every answer, the assistant re-checks the latest saved application documents for the selected program, so newer uploads and replacements are included automatically.
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/50">
              Want a clean slate? Reset only this program&apos;s assistant thread without affecting your other program conversations.
            </p>
            <button
              onClick={() => void resetConversation()}
              disabled={!selectedProgram || assistantLoading}
              className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-70"
            >
              Reset conversation
            </button>
          </div>

          <div
            ref={conversationViewportRef}
            className="mt-5 h-[34rem] overflow-y-auto rounded-[1.5rem] border border-black/5 bg-white/[0.03]/80 p-4"
          >
            <div className="space-y-3">
              {loadingWorkspace ? (
                <p className="text-white/50">Loading conversation...</p>
              ) : messages.length === 0 ? (
                <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-6 text-center text-sm text-white/50">
                  Start the first conversation for this program. Your history will stay separate for each program assistant.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${message.mode}-${message.createdAt ?? index}`}
                    className={`rounded-2xl px-4 py-4 text-sm leading-7 ${
                      message.role === "assistant" ? "bg-white/[0.04] text-slate-700 shadow-sm" : "ml-auto max-w-[90%] bg-slate-200 text-[var(--portal-ink)]"
                    }`}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                      {message.role === "assistant"
                        ? message.mode === "review"
                          ? "Application Review"
                          : "Program Answer"
                        : "You"}
                    </p>
                    {message.role === "assistant" && message.mode === "review" && message.reviewReport ? (
                      <ProgramReviewReportCard report={message.reviewReport} />
                    ) : null}
                    <p className="whitespace-pre-wrap">{cleanAssistantMarkdown(message.content)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <textarea
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              placeholder="Ask about labs, deadlines, eligibility, competitiveness, or request an application review."
              className="min-h-32 w-full rounded-2xl border border-white/10 px-4 py-3"
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void sendProgramAssistant("qa")}
                disabled={!selectedProgram || assistantLoading}
                className="rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
              >
                {assistantLoading ? "Thinking..." : "Ask About This Program"}
              </button>
              <button
                onClick={() => void sendProgramAssistant("review")}
                disabled={!selectedProgram || assistantLoading}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-[var(--portal-ink)] disabled:opacity-70"
              >
                {assistantLoading ? "Reviewing..." : "Review My Application"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function flattenHistory(history: ChatInteraction[]): AssistantMessage[] {
  return history.flatMap((entry) => {
    const mode = entry.assistantMode === "review" ? "review" : "qa";
    return [
      {
        role: "user" as const,
        content: entry.cleanQuery || entry.query,
        mode,
        createdAt: entry.createdAt,
      },
      {
        role: "assistant" as const,
        content: entry.response,
        mode,
        createdAt: entry.createdAt,
        reviewReport: entry.reviewReport ?? null,
      },
    ];
  });
}

function ProgramReviewReportCard({ report }: { report: ProgramReviewReport }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  function downloadReport() {
    const sections = [
      `Overall score: ${report.overallScore.toFixed(1)} / 5`,
      `Overall label: ${report.overallLabel}`,
      "",
      "Current standing",
      report.competitivenessVerdict,
      "",
      "Why this rubric was used",
      report.rubricRationale,
      "",
      "Confidence note",
      report.confidenceNote,
      "",
      "Category scores",
      ...report.categories.map(
        (category) =>
          `- ${category.name}: ${category.score.toFixed(1)} / 5 (${category.weightLabel})\n  ${category.rationale}`,
      ),
      "",
      "What is helping",
      ...report.strengths.map((item) => `- ${item}`),
      "",
      "What needs work",
      ...report.gaps.map((item) => `- ${item}`),
      "",
      "Highest-priority improvements",
      ...report.priorityActions.map(
        (item, index) => `${index + 1}. ${item.action} [${item.urgency}]\n   Why it matters: ${item.whyItMatters}`,
      ),
      "",
      "Bottom line",
      report.bottomLine,
    ].filter(Boolean);

    const blob = new Blob([sections.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "program-review-report.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 rounded-2xl border border-[var(--portal-teal)]/10 bg-[var(--portal-panel)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Structured review report</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--portal-ink)]">{report.overallLabel}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60">{report.bottomLine || report.competitivenessVerdict}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-2xl px-4 py-3 text-center ${scoreColorClasses(report.overallScore)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">Overall score</p>
              <p className="mt-1 text-2xl font-bold">{report.overallScore.toFixed(1)} / 5</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[var(--portal-ink)]"
            >
              View review report
            </button>
            <button
              type="button"
              onClick={downloadReport}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[var(--portal-ink)]"
            >
              Download report
            </button>
          </div>
        </div>
      </div>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex h-[min(86vh,52rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Application review report</p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--portal-ink)]">{report.overallLabel}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={downloadReport}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[var(--portal-ink)]"
                >
                  Download report
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/60"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className={`rounded-2xl px-5 py-4 text-center ${scoreColorClasses(report.overallScore)}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">Overall score</p>
                  <p className="mt-1 text-3xl font-bold">{report.overallScore.toFixed(1)} / 5</p>
                </div>
                {report.bottomLine ? <p className="max-w-3xl text-sm leading-7 text-white/60">{report.bottomLine}</p> : null}
              </div>

              {report.categories.length > 0 ? (
                <div className="mt-6 grid gap-3 xl:grid-cols-2">
                  {report.categories.map((category) => (
                    <div key={category.name} className="rounded-2xl border border-black/5 bg-white/[0.04] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--portal-ink)]">{category.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/40">{category.weightLabel}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${scoreColorClasses(category.score)}`}>
                          {category.score.toFixed(1)} / 5
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/60">{category.rationale}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">What is helping</p>
                  {report.strengths.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                      {report.strengths.map((item) => (
                        <li key={item} className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-900">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-white/50">No clear strengths were identified from the current evidence.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-black/5 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">What needs work</p>
                  {report.gaps.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                      {report.gaps.map((item) => (
                        <li key={item} className="rounded-xl bg-rose-50 px-3 py-2 text-rose-900">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-white/50">No major gaps were identified from the current evidence.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-black/5 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Highest-priority improvements</p>
                {report.priorityActions.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {report.priorityActions.map((item, index) => (
                      <div key={`${item.action}-${index}`} className="rounded-2xl bg-[var(--portal-panel)] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/[0.04] px-2 py-1 text-xs font-semibold text-white/60">Priority {index + 1}</span>
                          <span className="rounded-full border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700">{item.urgency}</span>
                        </div>
                        <p className="mt-2 font-semibold text-[var(--portal-ink)]">{item.action}</p>
                        <p className="mt-1 text-sm leading-6 text-white/60">{item.whyItMatters}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-white/50">No ranked action list was returned for this review.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function scoreColorClasses(score: number) {
  if (score >= 4) return "bg-emerald-50 text-emerald-800";
  if (score >= 3) return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-800";
}

function InfoTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-[var(--portal-teal)]">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{children}</p>
    </div>
  );
}
