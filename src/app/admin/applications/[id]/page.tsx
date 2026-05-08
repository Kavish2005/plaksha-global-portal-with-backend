"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import StatusBadge from "@/components/StatusBadge";
import { apiGet, apiPost, apiPut } from "@/services/api";
import type {
  Application,
  ApplicationDocumentAsset,
  ApplicationWorkflowStage,
  Deadline,
  Program,
  WorkflowStageStatus,
} from "@/types";
import { formatIsoDate, getErrorMessage } from "@/lib/utils";

type MissingDocument = { deadlineId: number; deadlineTitle: string; deadlineDate: string; requirementLabel: string };

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const applicationId = Number(params.id);

  const [application, setApplication] = useState<Application | null>(null);
  const [programDeadlines, setProgramDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDocument, setPreviewDocument] = useState<ApplicationDocumentAsset | null>(null);
  const [documentActionLoadingId, setDocumentActionLoadingId] = useState<number | null>(null);
  const [submittingActionKey, setSubmittingActionKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"notes" | "request" | "decision">("notes");
  const [expandedMoveForm, setExpandedMoveForm] = useState(false);

  const [stageDraft, setStageDraft] = useState({ internalNotes: "", studentVisibleUpdate: "" });
  const [sendReviewDraft, setSendReviewDraft] = useState({ toEmail: "", toName: "", toRoleLabel: "", instructions: "" });
  const [moveNextDraft, setMoveNextDraft] = useState({ nextStageLabel: "", studentVisibleUpdate: "" });
  const [seedDraft, setSeedDraft] = useState({
    stageLabel: "Global Engagement review",
    reviewerEmail: "",
    reviewerName: "",
    reviewerRoleLabel: "Global Engagement Office",
    instructions: "Review the application and record the office decision.",
    studentVisibleUpdate: "Your application is now with the Global Engagement Office for review.",
  });

  async function loadApplication() {
    setLoading(true);
    try {
      const data = await apiGet<Application>(`/applications/${applicationId}`);
      setApplication(data);
      const activeStage = getActiveStage(data);
      if (activeStage) {
        setStageDraft({
          internalNotes: activeStage.internalNotes || "",
          studentVisibleUpdate: activeStage.studentVisibleUpdate || "",
        });
      }
      try {
        const prog = await apiGet<Program>(`/programs/${data.programId}`);
        setProgramDeadlines(prog.deadlines || []);
      } catch {
        setProgramDeadlines([]);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplication();
  }, [applicationId]);

  function getActiveStage(app: Application): ApplicationWorkflowStage | null {
    return (
      app.workflowStages
        .slice()
        .sort((a, b) => b.order - a.order)
        .find((s) => ["ACTIVE", "PENDING", "CHANGES_REQUESTED"].includes(s.status)) || null
    );
  }

  const activeStage = useMemo(() => (application ? getActiveStage(application) : null), [application]);

  const missingDocuments = useMemo<MissingDocument[]>(() => {
    if (!application || programDeadlines.length === 0) return [];
    const uploaded = new Set(
      application.documents.map((d) => `${d.deadlineId}::${d.requirementLabel}`)
    );
    const missing: MissingDocument[] = [];
    for (const deadline of programDeadlines) {
      for (const req of deadline.requiredDocuments) {
        if (!uploaded.has(`${deadline.id}::${req}`)) {
          missing.push({
            deadlineId: deadline.id,
            deadlineTitle: deadline.title,
            deadlineDate: deadline.date,
            requirementLabel: req,
          });
        }
      }
    }
    return missing;
  }, [application, programDeadlines]);

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

  async function saveStageNotes(stage: ApplicationWorkflowStage) {
    try {
      setSubmittingActionKey(`${stage.id}:save`);
      await apiPut(`/workflow-stages/${stage.id}`, {
        status: stage.status,
        internalNotes: stageDraft.internalNotes,
        studentVisibleUpdate: stageDraft.studentVisibleUpdate,
      });
      toast.success("Notes saved.");
      await loadApplication();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingActionKey(null);
    }
  }

  async function ogeStageDecision(stage: ApplicationWorkflowStage, status: WorkflowStageStatus) {
    try {
      setSubmittingActionKey(`${stage.id}:${status}`);
      await apiPut(`/workflow-stages/${stage.id}`, {
        status,
        internalNotes: stageDraft.internalNotes,
        studentVisibleUpdate: stageDraft.studentVisibleUpdate,
      });
      toast.success("Stage updated.");
      await loadApplication();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingActionKey(null);
    }
  }

  async function sendReviewRequestToStakeholder() {
    if (!activeStage) {
      toast.error("No active stage. Start a workflow stage first.");
      return;
    }
    if (!sendReviewDraft.toEmail.trim() || !sendReviewDraft.instructions.trim()) {
      toast.error("Email address and instructions are required.");
      return;
    }
    try {
      setSubmittingActionKey(`sendReview`);
      await apiPost(`/applications/${applicationId}/workflow/send-review-request`, {
        toEmail: sendReviewDraft.toEmail.trim(),
        toName: sendReviewDraft.toName.trim(),
        toRoleLabel: sendReviewDraft.toRoleLabel.trim(),
        instructions: sendReviewDraft.instructions.trim(),
      });
      toast.success("Review request sent.");
      setSendReviewDraft({ toEmail: "", toName: "", toRoleLabel: "", instructions: "" });
      await loadApplication();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingActionKey(null);
    }
  }

  async function moveToNextStage() {
    if (!moveNextDraft.nextStageLabel.trim()) {
      toast.error("Enter the next stage label before moving forward.");
      return;
    }
    try {
      setSubmittingActionKey(`move`);
      await apiPost(`/applications/${applicationId}/workflow/forward`, {
        stageLabel: moveNextDraft.nextStageLabel.trim(),
        reviewerEmail: activeStage?.reviewerEmail || "",
        reviewerName: activeStage?.reviewerName || "",
        reviewerRoleLabel: activeStage?.reviewerRoleLabel || "",
        instructions: `OGE moved the application to ${moveNextDraft.nextStageLabel.trim()}.`,
        internalNotes: stageDraft.internalNotes,
        studentVisibleUpdate:
          moveNextDraft.studentVisibleUpdate.trim() ||
          `Your application has moved to the next stage: ${moveNextDraft.nextStageLabel.trim()}.`,
        moveToNextStage: true,
      });
      toast.success("Application moved to next stage.");
      setMoveNextDraft({ nextStageLabel: "", studentVisibleUpdate: "" });
      setExpandedMoveForm(false);
      await loadApplication();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingActionKey(null);
    }
  }

  async function startStage() {
    if (!seedDraft.stageLabel.trim() || !seedDraft.reviewerEmail.trim() || !seedDraft.instructions.trim()) {
      toast.error("Stage label, email, and instructions are required.");
      return;
    }
    try {
      setSubmittingActionKey(`start`);
      await apiPost(`/applications/${applicationId}/workflow/start`, {
        stageLabel: seedDraft.stageLabel.trim(),
        reviewerEmail: seedDraft.reviewerEmail.trim(),
        reviewerName: seedDraft.reviewerName.trim(),
        reviewerRoleLabel: seedDraft.reviewerRoleLabel.trim(),
        instructions: seedDraft.instructions.trim(),
        studentVisibleUpdate: seedDraft.studentVisibleUpdate.trim(),
      });
      toast.success("Workflow stage opened.");
      await loadApplication();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingActionKey(null);
    }
  }

  async function nominateApplication() {
    if (!application) return;
    const latestStage = application.workflowStages
      .slice()
      .sort((a, b) => {
        if (b.order !== a.order) return b.order - a.order;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      })[0];
    const notes = latestStage ? stageDraft.internalNotes : "";
    try {
      setSubmittingActionKey(`nominate`);
      await apiPost("/nominations", { applicationId, notes });
      toast.success("Final nomination recorded.");
      await loadApplication();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingActionKey(null);
    }
  }

  if (loading) {
    return <div className="w-full px-6 py-8 text-slate-400">Loading application...</div>;
  }

  if (!application) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">Application not found.</p>
          <Link href="/admin/applications" className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">
            ← Back to applications
          </Link>
        </div>
      </div>
    );
  }

  const sortedStages = application.workflowStages.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      {/* Document preview modal */}
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
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
                  className="h-full w-full rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
                  <p className="text-lg font-semibold text-slate-900">Preview not supported for this file type</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Download the file to open it locally.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Back link */}
      <Link href="/admin/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700">
        ← Back to applications
      </Link>

      {/* Page header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{application.programTitle}</h1>
          <p className="mt-1 text-slate-500">{application.studentName} · {application.studentEmail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={application.status} />
          {activeStage ? <StatusBadge label={activeStage.stageLabel} /> : null}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column — workflow + action panel */}
        <div className="space-y-6">
          {/* Workflow timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Workflow timeline</h2>
            {sortedStages.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sortedStages.map((stage) => {
                  const isActive = ["ACTIVE", "PENDING", "CHANGES_REQUESTED"].includes(stage.status);
                  const isDone = stage.status === "COMPLETED" || stage.status === "FORWARDED" || stage.status === "APPROVED";
                  const isRejected = stage.status === "REJECTED";
                  const dotColor = isActive
                    ? "bg-teal-500 ring-4 ring-teal-100"
                    : isDone
                    ? "bg-green-500"
                    : isRejected
                    ? "bg-rose-400"
                    : stage.status === "CHANGES_REQUESTED"
                    ? "bg-amber-400"
                    : "bg-slate-300";
                  return (
                    <div key={stage.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${dotColor}`} />
                        <div className="mt-1 w-px flex-1 bg-slate-100" />
                      </div>
                      <div className="pb-4 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{stage.stageLabel}</span>
                          <StatusBadge label={stage.status.replaceAll("_", " ")} />
                        </div>
                        {stage.reviewerName || stage.reviewerEmail ? (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {stage.reviewerName ? `${stage.reviewerName} · ` : ""}{stage.reviewerEmail}
                          </p>
                        ) : null}
                        {stage.internalNotes ? (
                          <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span className="font-medium text-slate-700">Notes: </span>{stage.internalNotes}
                          </p>
                        ) : null}
                        {stage.studentVisibleUpdate ? (
                          <p className="mt-1.5 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
                            <span className="font-medium">Student update: </span>{stage.studentVisibleUpdate}
                          </p>
                        ) : null}
                        {stage.reviewRequests && stage.reviewRequests.length > 0 ? (
                          <div className="mt-2 space-y-1.5">
                            {stage.reviewRequests.map((req) => (
                              <div key={req.id} className="rounded-lg border border-slate-100 px-3 py-2 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-slate-700">{req.toName || req.toEmail}</span>
                                  <StatusBadge label={req.status} />
                                </div>
                                {req.reviewerNotes ? (
                                  <p className="mt-1 text-slate-500">Response: {req.reviewerNotes}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-400">{formatIsoDate(stage.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No workflow stages started yet.</p>
            )}
          </div>

          {/* Action panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">OGE actions</h2>

            {activeStage ? (
              <div className="mt-4">
                {/* Tab bar */}
                <div className="flex gap-1 rounded-2xl bg-slate-50 p-1">
                  {(["notes", "request", "decision"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        tab === t
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {t === "notes" ? "Notes & Update" : t === "request" ? "Send Request" : "Decisions"}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="mt-4">
                  {tab === "notes" ? (
                    <div className="space-y-3">
                      <textarea
                        value={stageDraft.internalNotes}
                        onChange={(e) => setStageDraft((d) => ({ ...d, internalNotes: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                        rows={3}
                        placeholder="Internal office notes (not visible to student)"
                      />
                      <textarea
                        value={stageDraft.studentVisibleUpdate}
                        onChange={(e) => setStageDraft((d) => ({ ...d, studentVisibleUpdate: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                        rows={2}
                        placeholder="Student-facing update (shown on their dashboard)"
                      />
                      <button
                        type="button"
                        onClick={() => void saveStageNotes(activeStage)}
                        disabled={submittingActionKey === `${activeStage.id}:save`}
                        className="rounded-full bg-[var(--portal-teal)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {submittingActionKey === `${activeStage.id}:save` ? "Saving..." : "Save notes"}
                      </button>
                    </div>
                  ) : tab === "request" ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={sendReviewDraft.toEmail}
                          onChange={(e) => setSendReviewDraft((d) => ({ ...d, toEmail: e.target.value }))}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none md:col-span-2"
                          placeholder="Stakeholder email"
                          type="email"
                        />
                        <input
                          value={sendReviewDraft.toName}
                          onChange={(e) => setSendReviewDraft((d) => ({ ...d, toName: e.target.value }))}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                          placeholder="Name"
                        />
                        <input
                          value={sendReviewDraft.toRoleLabel}
                          onChange={(e) => setSendReviewDraft((d) => ({ ...d, toRoleLabel: e.target.value }))}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                          placeholder="Role / office"
                        />
                      </div>
                      <textarea
                        value={sendReviewDraft.instructions}
                        onChange={(e) => setSendReviewDraft((d) => ({ ...d, instructions: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                        rows={3}
                        placeholder="What should this stakeholder review or provide input on?"
                      />
                      <button
                        type="button"
                        onClick={() => void sendReviewRequestToStakeholder()}
                        disabled={submittingActionKey === "sendReview"}
                        className="rounded-full bg-[var(--portal-gold)] px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                      >
                        {submittingActionKey === "sendReview" ? "Sending..." : "Send review request"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Move to next stage */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedMoveForm((v) => !v)}
                          className="rounded-full border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700"
                        >
                          {expandedMoveForm ? "Cancel" : "Move to next stage →"}
                        </button>
                        {expandedMoveForm ? (
                          <div className="mt-3 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <input
                              value={moveNextDraft.nextStageLabel}
                              onChange={(e) => setMoveNextDraft((d) => ({ ...d, nextStageLabel: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                              placeholder="Next stage label (e.g. 'Faculty Review')"
                            />
                            <textarea
                              value={moveNextDraft.studentVisibleUpdate}
                              onChange={(e) => setMoveNextDraft((d) => ({ ...d, studentVisibleUpdate: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                              rows={2}
                              placeholder="Student-facing update for this transition (optional)"
                            />
                            <button
                              type="button"
                              onClick={() => void moveToNextStage()}
                              disabled={submittingActionKey === "move"}
                              className="rounded-full bg-[var(--portal-teal)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {submittingActionKey === "move" ? "Moving..." : "Confirm move"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void ogeStageDecision(activeStage, "CHANGES_REQUESTED")}
                          disabled={submittingActionKey === `${activeStage.id}:CHANGES_REQUESTED`}
                          className="rounded-full border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60"
                        >
                          {submittingActionKey === `${activeStage.id}:CHANGES_REQUESTED` ? "Saving..." : "Request changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void ogeStageDecision(activeStage, "REJECTED")}
                          disabled={submittingActionKey === `${activeStage.id}:REJECTED`}
                          className="rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 disabled:opacity-60"
                        >
                          {submittingActionKey === `${activeStage.id}:REJECTED` ? "Saving..." : "Reject"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void nominateApplication()}
                          disabled={submittingActionKey === "nominate"}
                          className="rounded-full border border-[var(--portal-gold)] px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                        >
                          {submittingActionKey === "nominate" ? "Recording..." : "Nominate"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-500">No active stage. Open the first review stage to begin the workflow.</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={seedDraft.stageLabel}
                    onChange={(e) => setSeedDraft((d) => ({ ...d, stageLabel: e.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    placeholder="Stage label"
                  />
                  <input
                    value={seedDraft.reviewerRoleLabel}
                    onChange={(e) => setSeedDraft((d) => ({ ...d, reviewerRoleLabel: e.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    placeholder="Role / office"
                  />
                  <input
                    value={seedDraft.reviewerEmail}
                    onChange={(e) => setSeedDraft((d) => ({ ...d, reviewerEmail: e.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none md:col-span-2"
                    placeholder="OGE responsible email"
                  />
                </div>
                <textarea
                  value={seedDraft.studentVisibleUpdate}
                  onChange={(e) => setSeedDraft((d) => ({ ...d, studentVisibleUpdate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                  rows={2}
                  placeholder="Student-facing update for opening this stage (optional)"
                />
                <button
                  type="button"
                  onClick={() => void startStage()}
                  disabled={submittingActionKey === "start"}
                  className="rounded-full bg-[var(--portal-teal)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submittingActionKey === "start" ? "Opening..." : "Open first stage"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column — documents + metadata */}
        <div className="space-y-6 self-start">
          {/* Documents */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Documents</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {application.documents.length} uploaded
              </span>
            </div>

            {/* Uploaded */}
            {application.documents.length > 0 ? (
              <div className="mt-4 space-y-2">
                {application.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{doc.requirementLabel}</p>
                      <p className="truncate text-xs text-slate-500">{doc.fileName}</p>
                      {doc.deadlineTitle ? (
                        <p className="mt-0.5 truncate text-xs text-slate-400">{doc.deadlineTitle}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => void openApplicationDocument(doc.id, "preview")}
                        disabled={documentActionLoadingId === doc.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-200 hover:text-teal-700 disabled:opacity-60"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => void openApplicationDocument(doc.id, "download")}
                        disabled={documentActionLoadingId === doc.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-200 hover:text-teal-700 disabled:opacity-60"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No documents uploaded yet.</p>
            )}

            {/* Missing */}
            {missingDocuments.length > 0 ? (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Missing</p>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                    {missingDocuments.length}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {missingDocuments.map((item) => (
                    <div
                      key={`${item.deadlineId}::${item.requirementLabel}`}
                      className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-rose-800">{item.requirementLabel}</p>
                      <p className="mt-0.5 text-xs text-rose-600">
                        {item.deadlineTitle} · due {formatIsoDate(item.deadlineDate)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : programDeadlines.length > 0 ? (
              <p className="mt-3 text-xs font-medium text-teal-600">All required documents submitted</p>
            ) : null}
          </div>

          {/* Application metadata */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Submitted</dt>
                <dd className="font-medium text-slate-800">{formatIsoDate(application.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Status</dt>
                <dd><StatusBadge label={application.status} /></dd>
              </div>
              {activeStage ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Active stage</dt>
                  <dd className="font-medium text-slate-800">{activeStage.stageLabel}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Total stages</dt>
                <dd className="font-medium text-slate-800">{application.workflowStages.length}</dd>
              </div>
              {application.nominations.length > 0 ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Nominated</dt>
                  <dd className="font-medium text-teal-700">{formatIsoDate(application.nominations[0]?.createdAt)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* Nominations */}
          {application.nominations.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Nominations</h2>
              <div className="mt-4 space-y-3">
                {application.nominations.map((nomination) => (
                  <div key={nomination.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{nomination.adminName}</p>
                    <p className="text-xs text-slate-500">{formatIsoDate(nomination.createdAt)}</p>
                    {nomination.notes ? <p className="mt-2 text-sm text-slate-600">{nomination.notes}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
