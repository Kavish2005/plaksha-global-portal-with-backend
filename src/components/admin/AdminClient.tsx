"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import type {
  AdminDashboard,
  Application,
  ApplicationDocumentAsset,
  ApplicationWorkflowStage,
  ApplicationStatus,
  ApprovalQueue,
  Booking,
  KnowledgeDocument,
  Mentor,
  Nomination,
  OpportunityDiscoveryDraft,
  OpportunityDiscoveryResponse,
  OpportunityDiscoveryResult,
  Program,
  WorkflowStageStatus,
} from "@/types";
import { FileText, Trash2, Upload } from "lucide-react";
import { formatIsoDate, getErrorMessage, toIsoDate } from "@/lib/utils";

export type AdminSectionKey = "overview" | "programs" | "mentors" | "deadlines" | "applications" | "discovery" | "assistant";

type ProgramFormState = {
  title: string;
  university: string;
  country: string;
  type: string;
  description: string;
  eligibility: string;
  duration: string;
  startDate: string;
  endDate: string;
  externalLink: string;
  featured: boolean;
  tags: string;
};

type MentorFormState = {
  name: string;
  email: string;
  expertise: string;
  bio: string;
  region: string;
};

type KnowledgeDocumentFormState = {
  title: string;
  content: string;
  sourceType: string;
};

type SearchableOption = {
  value: string;
  label: string;
  helperText?: string;
  keywords?: string[];
};

const emptyProgramForm: ProgramFormState = {
  title: "",
  university: "",
  country: "",
  type: "Exchange",
  description: "",
  eligibility: "",
  duration: "",
  startDate: "",
  endDate: "",
  externalLink: "",
  featured: false,
  tags: "",
};

const emptyMentorForm: MentorFormState = {
  name: "",
  email: "",
  expertise: "",
  bio: "",
  region: "",
};

const emptyKnowledgeDocumentForm: KnowledgeDocumentFormState = {
  title: "",
  content: "",
  sourceType: "text",
};

const DEMO_KNOWLEDGE_DOCUMENT: KnowledgeDocumentFormState = {
  title: "Visa & Travel Guide — Research Programs in Germany and Canada",
  sourceType: "process",
  content: `Students selected for DAAD RISE Germany or Mitacs Globalink should begin visa and travel preparation at least 8 weeks before their program start date.

GERMANY (Schengen Visa):
- Indian passport holders require a Schengen visa for stays under 90 days.
- Apply at the German consulate/embassy in your city (Delhi, Mumbai, Chennai, Kolkata, or Hyderabad).
- Required documents: acceptance letter from the German host institution, proof of travel insurance (min €30,000 coverage), return flight booking, bank statement (≥ €50/day or stipend letter from DAAD), accommodation confirmation, passport photos.
- Processing time: 4–6 weeks. Apply early — do not wait for visa before booking flights.
- DAAD provides a stipend letter that counts as proof of financial means.

CANADA (Temporary Resident Visa / eTA):
- Indian passport holders require a Temporary Resident Visa (TRV) for Canada.
- Apply online via the IRCC portal. Biometrics appointment required (book separately).
- Required documents: Mitacs acceptance letter, proof of sufficient funds (or Mitacs stipend letter), return travel booking, accommodation details, university enrollment proof.
- Processing time: 4–8 weeks. Apply as soon as your Mitacs offer letter arrives.
- Mitacs provides a standard support letter — request it from your Mitacs coordinator.

TRAVEL INSURANCE:
- Mandatory for Germany; strongly recommended for Canada.
- Recommended providers: HDFC Ergo, Bajaj Allianz, Care Health. Minimum coverage €30,000.
- Purchase before applying for visa, as proof of insurance is required.

ACCOMMODATION:
- DAAD RISE: The host lab usually helps identify university housing or shared flats (WGs). Students should confirm with their supervisor before arrival.
- Mitacs: Many Canadian universities have summer housing available. Book early — summer housing fills by March/April.

STIPEND AND BANKING:
- Both programs provide a monthly stipend in local currency. Carry a multi-currency travel card (Niyo, HDFC Forex) to avoid conversion fees.
- Notify your Indian bank of international travel to avoid blocked transactions.`,
};

const statusOptions: ApplicationStatus[] = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Nominated"];
const DISCOVERY_DRAFT_STORAGE_KEY = "admin-opportunity-discovery-draft";

// ── Admin data cache ──────────────────────────────────────────────────────────
// Persists fetched data in sessionStorage so navigating between admin sections
// (each a separate Next.js page that remounts AdminClient) feels instant.
const ADMIN_CACHE_KEY = "plaksha-admin-cache";
const CACHE_TTL_MS = 90_000; // 90 s — stale-while-revalidate window

type AdminCachePayload = {
  ts: number;
  dashboard: AdminDashboard | null;
  programs: Program[];
  mentors: Mentor[];
  nominations: Nomination[];
  knowledgeDocuments: KnowledgeDocument[];
};

function readAdminCache(): AdminCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminCachePayload;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function writeAdminCache(payload: Omit<AdminCachePayload, "ts">) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch { /* quota exceeded — skip silently */ }
}

export function clearAdminCache() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(ADMIN_CACHE_KEY); } catch { /* */ }
}

export default function AdminClient({ section }: { section: AdminSectionKey }) {
  const router = useRouter();
  const { activeUser, loading: authLoading } = useAuth();
  const isMentorUser = activeUser?.role === "mentor";
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueue | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [mentorMeetings, setMentorMeetings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormState>(emptyProgramForm);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const [editingMentorId, setEditingMentorId] = useState<number | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [mentorForm, setMentorForm] = useState<MentorFormState>(emptyMentorForm);
  const [knowledgeDocumentForm, setKnowledgeDocumentForm] = useState<KnowledgeDocumentFormState>(emptyKnowledgeDocumentForm);
  const [knowledgeFileName, setKnowledgeFileName] = useState("");

  const [availabilityMentorId, setAvailabilityMentorId] = useState<number | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState(toIsoDate(new Date()));
  const [availabilitySlot, setAvailabilitySlot] = useState("10:00 AM");
  const [availabilityBatchStartTime, setAvailabilityBatchStartTime] = useState("09:00");
  const [availabilityBatchEndTime, setAvailabilityBatchEndTime] = useState("17:00");
  const [availabilityBatchInterval, setAvailabilityBatchInterval] = useState("30");
  const [availabilitySlots, setAvailabilitySlots] = useState<Array<{ id: number; time: string; available: boolean; date: string }>>([]);

  const [deadlineProgramId, setDeadlineProgramId] = useState<number | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const [deadlineTitle, setDeadlineTitle] = useState("Application deadline");
  const [deadlineDate, setDeadlineDate] = useState(toIsoDate(new Date()));
  const [deadlineOfficialDate, setDeadlineOfficialDate] = useState("");
  const [deadlinePriority, setDeadlinePriority] = useState("High");
  const [deadlineRequiredDocuments, setDeadlineRequiredDocuments] = useState<string[]>([""]);

  const [applicationFilter, setApplicationFilter] = useState({ student: "", program: "", status: "" });

  useEffect(() => {
    if (section !== "programs") return;
    if (typeof window === "undefined") return;

    const storedDraft = window.sessionStorage.getItem(DISCOVERY_DRAFT_STORAGE_KEY);
    if (!storedDraft) return;

    try {
      const draft = JSON.parse(storedDraft) as OpportunityDiscoveryDraft;
      setEditingProgramId(null);
      setSelectedProgramId(null);
      setProgramForm({
        title: draft.title || "",
        university: draft.university || "",
        country: draft.country || "",
        type: draft.type || "Exchange",
        description: draft.description || "",
        eligibility: draft.eligibility || "",
        duration: draft.duration || "",
        startDate: draft.startDate || "",
        endDate: draft.endDate || "",
        externalLink: draft.externalLink || "",
        featured: false,
        tags: Array.isArray(draft.tags) ? draft.tags.join(", ") : "",
      });
      window.sessionStorage.removeItem(DISCOVERY_DRAFT_STORAGE_KEY);
      toast.success("Discovery result copied into the program form.");
    } catch (_error) {
      window.sessionStorage.removeItem(DISCOVERY_DRAFT_STORAGE_KEY);
    }
  }, [section]);

  function applyData(
    nextDashboard: AdminDashboard | null,
    nextPrograms: Program[],
    nextMentors: Mentor[],
    nextNominations: Nomination[],
    nextKnowledgeDocuments: KnowledgeDocument[],
  ) {
    setDashboard(nextDashboard);
    setApprovalQueue(nextDashboard?.queue ?? null);
    setPrograms(nextPrograms);
    setMentors(nextMentors);
    setApplications(nextDashboard?.allApplications ?? []);
    setNominations(nextNominations);
    setKnowledgeDocuments(nextKnowledgeDocuments);
  }

  async function loadAllData({ invalidate = false }: { invalidate?: boolean } = {}) {
    // Restore from cache immediately so the UI appears without a loading spinner.
    const cache = invalidate ? null : readAdminCache();
    if (cache && !isMentorUser) {
      applyData(cache.dashboard, cache.programs, cache.mentors, cache.nominations, cache.knowledgeDocuments);
      setLoading(false);
      // Refresh in background — update UI silently when done.
      void (async () => {
        try {
          const [nextDashboard, nextPrograms, nextMentors, nextNominations, nextKnowledgeDocuments] = await Promise.all([
            apiGet<AdminDashboard>("/admin/dashboard"),
            apiGet<Program[]>("/programs"),
            apiGet<Mentor[]>("/mentors"),
            apiGet<Nomination[]>("/nominations"),
            apiGet<KnowledgeDocument[]>("/chat/documents"),
          ]);
          applyData(nextDashboard, nextPrograms, nextMentors, nextNominations, nextKnowledgeDocuments);
          writeAdminCache({ dashboard: nextDashboard, programs: nextPrograms, mentors: nextMentors, nominations: nextNominations, knowledgeDocuments: nextKnowledgeDocuments });
        } catch { /* background refresh failed — cached data still shown */ }
      })();
      return;
    }

    setLoading(true);
    try {
      // Dashboard now returns queue + allApplications — no separate /approval-queue or /applications calls needed.
      const [nextDashboard, nextPrograms, nextMentors, nextNominations, nextKnowledgeDocuments] = await Promise.all([
        isMentorUser ? Promise.resolve(null) : apiGet<AdminDashboard>("/admin/dashboard"),
        apiGet<Program[]>("/programs"),
        apiGet<Mentor[]>("/mentors"),
        isMentorUser ? Promise.resolve([]) : apiGet<Nomination[]>("/nominations"),
        apiGet<KnowledgeDocument[]>("/chat/documents"),
      ]);

      applyData(nextDashboard, nextPrograms, nextMentors, nextNominations, nextKnowledgeDocuments);
      if (!isMentorUser) {
        writeAdminCache({ dashboard: nextDashboard, programs: nextPrograms, mentors: nextMentors, nominations: nextNominations, knowledgeDocuments: nextKnowledgeDocuments });
      }

      if (!availabilityMentorId) {
        if (isMentorUser) {
          const ownMentor = nextMentors.find((mentor) => mentor.email === activeUser?.email);
          if (ownMentor) {
            setAvailabilityMentorId(ownMentor.id);
            if (!selectedMentorId) {
              setSelectedMentorId(ownMentor.id);
            }
          }
        } else if (nextMentors[0]) {
          setAvailabilityMentorId(nextMentors[0].id);
          if (!selectedMentorId) {
            setSelectedMentorId(nextMentors[0].id);
          }
        }
      }

      if (!deadlineProgramId && nextPrograms[0]) {
        setDeadlineProgramId(nextPrograms[0].id);
      }

      if (!selectedProgramId && nextPrograms[0]) {
        setSelectedProgramId(nextPrograms[0].id);
      }

      if (!selectedMentorId && nextMentors[0]) {
        setSelectedMentorId(nextMentors[0].id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (activeUser?.role !== "admin" && activeUser?.role !== "mentor") {
      setLoading(false);
      return;
    }
    void loadAllData({ invalidate: false });
  }, [activeUser, authLoading, isMentorUser]);

  useEffect(() => {
    async function loadMentorMeetings() {
      if (activeUser?.role !== "mentor") {
        setMentorMeetings([]);
        return;
      }

      try {
        const response = await apiGet<Booking[]>("/mentors/me/meetings");
        setMentorMeetings(response);
      } catch (_error) {
        setMentorMeetings([]);
      }
    }

    void loadMentorMeetings();
  }, [activeUser]);

  useEffect(() => {
    async function loadAvailability() {
      if (!availabilityMentorId) return;
      try {
        const response = await apiGet<{ mentorId: number; date: string; slots: Array<{ id: number; time: string; available: boolean; date: string }> }>(
          `/mentors/${availabilityMentorId}/availability`,
          { date: availabilityDate },
        );
        setAvailabilitySlots(response.slots);
      } catch (_error) {
        setAvailabilitySlots([]);
      }
    }

    if (activeUser?.role === "admin" || activeUser?.role === "mentor") {
      void loadAvailability();
    }
  }, [activeUser, availabilityDate, availabilityMentorId]);

  function resetProgramForm() {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
  }

  function resetMentorForm() {
    setEditingMentorId(null);
    setMentorForm(emptyMentorForm);
  }

  async function submitProgram() {
    try {
      const payload = {
        ...programForm,
        tags: programForm.tags.split(",").map((item) => item.trim()).filter(Boolean),
        startDate: programForm.startDate || undefined,
        endDate: programForm.endDate || undefined,
        externalLink: programForm.externalLink || undefined,
      };
      if (editingProgramId) {
        await apiPut(`/programs/${editingProgramId}`, payload);
        toast.success("Program updated.");
      } else {
        const created = await apiPost<Program>(`/programs`, payload);
        toast.success("Program created.");
        setSelectedProgramId(created.id);
      }
      resetProgramForm();
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteProgram(programId: number) {
    try {
      await apiDelete(`/programs/${programId}`);
      toast.success("Program deleted.");
      if (selectedProgramId === programId) {
        setSelectedProgramId(null);
      }
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) || programs[0] || null,
    [programs, selectedProgramId],
  );

  const selectedMentor = useMemo(
    () => mentors.find((mentor) => mentor.id === selectedMentorId) || mentors[0] || null,
    [mentors, selectedMentorId],
  );

  useEffect(() => {
    if (selectedProgram?.id) {
      setDeadlineProgramId(selectedProgram.id);
    }
  }, [selectedProgram]);

  async function submitMentor() {
    try {
      if (editingMentorId) {
        await apiPut(`/mentors/${editingMentorId}`, mentorForm);
        toast.success("Mentor updated.");
      } else {
        await apiPost(`/mentors`, mentorForm);
        toast.success("Mentor created.");
      }
      resetMentorForm();
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteMentor(mentorId: number) {
    try {
      await apiDelete(`/mentors/${mentorId}`);
      toast.success("Mentor deleted.");
      if (selectedMentorId === mentorId) {
        setSelectedMentorId(null);
      }
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function createAvailability() {
    try {
      await apiPost("/availability", {
        mentorId: availabilityMentorId,
        date: availabilityDate,
        slot: availabilitySlot,
      });
      toast.success("Availability slot created.");
      const response = await apiGet<{ slots: Array<{ id: number; time: string; available: boolean; date: string }> }>(
        `/mentors/${availabilityMentorId}/availability`,
        { date: availabilityDate },
      );
      setAvailabilitySlots(response.slots);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function createAvailabilityBatch() {
    try {
      const response = await apiPost<{ createdCount: number; skippedCount: number }>("/availability", {
        mentorId: availabilityMentorId,
        date: availabilityDate,
        startTime: availabilityBatchStartTime,
        endTime: availabilityBatchEndTime,
        intervalMinutes: Number(availabilityBatchInterval),
      });

      if (response.createdCount > 0 && response.skippedCount > 0) {
        toast.success(`Created ${response.createdCount} slots and skipped ${response.skippedCount} existing ones.`);
      } else if (response.createdCount > 0) {
        toast.success(`Created ${response.createdCount} availability slots.`);
      } else {
        toast.success("All slots in that time range already existed.");
      }

      const refreshedAvailability = await apiGet<{ slots: Array<{ id: number; time: string; available: boolean; date: string }> }>(
        `/mentors/${availabilityMentorId}/availability`,
        { date: availabilityDate },
      );
      setAvailabilitySlots(refreshedAvailability.slots);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteAvailability(slotId: number) {
    try {
      await apiDelete(`/availability/${slotId}`);
      toast.success("Availability slot removed.");
      const response = await apiGet<{ slots: Array<{ id: number; time: string; available: boolean; date: string }> }>(
        `/mentors/${availabilityMentorId}/availability`,
        { date: availabilityDate },
      );
      setAvailabilitySlots(response.slots);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function createDeadline() {
    try {
      const payload = {
        programId: deadlineProgramId,
        title: deadlineTitle,
        date: deadlineDate,
        officialDeadline: deadlineOfficialDate || undefined,
        priority: deadlinePriority,
        requiredDocuments: deadlineRequiredDocuments.map((item) => item.trim()).filter(Boolean),
      };

      if (editingDeadlineId) {
        await apiPut(`/deadlines/${editingDeadlineId}`, payload);
        toast.success("Deadline updated.");
      } else {
        await apiPost("/deadlines", payload);
        toast.success("Deadline created.");
      }

      setEditingDeadlineId(null);
      setDeadlineTitle("Application deadline");
      setDeadlineDate(toIsoDate(new Date()));
      setDeadlineOfficialDate("");
      setDeadlinePriority("High");
      setDeadlineRequiredDocuments([""]);
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteDeadline(deadlineId: number) {
    try {
      await apiDelete(`/deadlines/${deadlineId}`);
      toast.success("Deadline deleted.");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function updateWorkflowStage(
    stageId: number,
    payload: {
      status: WorkflowStageStatus;
      internalNotes: string;
      studentVisibleUpdate: string;
    },
  ) {
    try {
      await apiPut(`/workflow-stages/${stageId}`, payload);
      toast.success("Workflow stage updated.");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function forwardWorkflowStage(
    applicationId: number,
    payload: {
      stageLabel: string;
      reviewerEmail: string;
      reviewerName: string;
      reviewerRoleLabel: string;
      instructions: string;
      internalNotes: string;
      studentVisibleUpdate: string;
      moveToNextStage?: boolean;
    },
  ) {
    try {
      await apiPost(`/applications/${applicationId}/workflow/forward`, payload);
      toast.success("Application forwarded and email queued.");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function startWorkflowStage(
    applicationId: number,
    payload: {
      stageLabel: string;
      reviewerEmail: string;
      reviewerName: string;
      reviewerRoleLabel: string;
      instructions: string;
      studentVisibleUpdate: string;
    },
  ) {
    try {
      await apiPost(`/applications/${applicationId}/workflow/start`, payload);
      toast.success("Workflow stage opened and email queued.");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function sendWorkflowReviewRequest(
    applicationId: number,
    payload: { toEmail: string; toName: string; toRoleLabel: string; instructions: string },
  ) {
    try {
      await apiPost(`/applications/${applicationId}/workflow/send-review-request`, payload);
      toast.success("Review request sent and email queued.");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function recordNomination(applicationId: number, notes: string) {
    try {
      await apiPost("/nominations", {
        applicationId,
        notes,
      });
      toast.success("Final nomination recorded.");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function uploadKnowledgeDocument() {
    try {
      await apiPost<KnowledgeDocument>("/chat/documents", knowledgeDocumentForm);
      toast.success("Assistant reference document uploaded.");
      setKnowledgeDocumentForm(emptyKnowledgeDocumentForm);
      setKnowledgeFileName("");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteKnowledgeDocument(documentId: number) {
    try {
      await apiDelete(`/chat/documents/${documentId}`);
      toast.success("Assistant reference document removed.");
      await loadAllData({ invalidate: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function loadKnowledgeFile(file: File | null) {
    if (!file) return;

    try {
      const content = await file.text();
      setKnowledgeFileName(file.name);
      setKnowledgeDocumentForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
        sourceType: file.name.endsWith(".md") ? "markdown" : file.name.endsWith(".json") ? "json" : "text",
        content,
      }));
    } catch (_error) {
      toast.error("Could not read that file. Try a plain text, markdown, CSV, or JSON document.");
    }
  }

  if (authLoading) {
    return <LoadingState label="Loading admin workspace..." />;
  }

  if (activeUser?.role !== "admin" && activeUser?.role !== "mentor") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Office access only</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with an approved Global Engagement Office or mentor account to access the internal workspace.
          </p>
        </div>
      </div>
    );
  }

  if (loading || (!isMentorUser && (!dashboard || !approvalQueue))) {
    return <LoadingState label="Loading admin workspace..." />;
  }

  if (isMentorUser && section !== "overview" && section !== "mentors" && section !== "assistant") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Mentor access</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mentor accounts can manage their own availability, upload assistant documents, and review meetings booked by students from the mentor workspace.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {!isMentorUser && section === "overview" ? (
        <OverviewSection dashboard={dashboard!} applications={applications} />
      ) : null}

      {isMentorUser && section === "overview" ? (
        <MentorOverviewSection
          meetings={mentorMeetings}
          mentors={mentors}
          currentUserEmail={activeUser?.email || null}
        />
      ) : null}

      {!isMentorUser && section === "programs" ? (
        <ProgramsSection programs={programs} />
      ) : null}

      {section === "mentors" ? (
        <MentorsSection
          mentors={mentors}
          isMentorUser={isMentorUser}
          currentUserEmail={activeUser?.email || null}
        />
      ) : null}

      {!isMentorUser && section === "deadlines" ? <ProgramsRedirectSection /> : null}

      {!isMentorUser && section === "applications" ? (
        <ApplicationsSection
          applications={applications}
          applicationFilter={applicationFilter}
          onApplicationFilterChange={setApplicationFilter}
        />
      ) : null}

      {!isMentorUser && section === "discovery" ? (
        <DiscoverySection
          onPrepareProgramDraft={(draft) => {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(DISCOVERY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
            }
            router.push("/admin/programs");
          }}
        />
      ) : null}

      {section === "assistant" ? (
        <AssistantSection
          isMentorUser={isMentorUser}
          documents={knowledgeDocuments}
          form={knowledgeDocumentForm}
          fileName={knowledgeFileName}
          onFormChange={setKnowledgeDocumentForm}
          onUpload={uploadKnowledgeDocument}
          onDelete={deleteKnowledgeDocument}
          onFileSelect={loadKnowledgeFile}
        />
      ) : null}
    </section>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="w-full px-6 py-8 text-slate-400">{label}</div>;
}

function AdminSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function OverviewSection({
  dashboard,
  applications,
}: {
  dashboard: AdminDashboard;
  applications: Application[];
}) {
  const unprocessed = useMemo(
    () =>
      applications
        .filter((a) => a.workflowStages.length === 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [applications],
  );

  return (
    <>
      <div className="grid gap-6 md:grid-cols-5">
        <MetricCard label="Programs" value={dashboard.totalPrograms} />
        <MetricCard label="Mentors" value={dashboard.totalMentors} />
        <MetricCard label="Applications" value={dashboard.totalApplications} />
        <MetricCard label="Pending Reviews" value={dashboard.pendingReviews} />
        <MetricCard label="Upcoming Deadlines" value={dashboard.upcomingDeadlines.length} />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <AdminSection
          eyebrow="Action needed"
          title="Awaiting review"
          description="Applications submitted by students that haven't been assigned to a workflow stage yet."
        >
          {unprocessed.length === 0 ? (
            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4">
              <p className="text-sm font-medium text-teal-800">All caught up — no applications waiting to be processed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unprocessed.map((application) => (
                <Link
                  key={application.id}
                  href={`/admin/applications/${application.id}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 transition hover:border-amber-200 hover:bg-amber-100"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{application.programTitle}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{application.studentName} · {application.studentEmail}</p>
                    <p className="mt-1 text-xs text-slate-400">Submitted {formatIsoDate(application.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-700 group-hover:underline">Review →</span>
                </Link>
              ))}
              <Link href="/admin/applications" className="block text-center text-sm font-medium text-slate-500 hover:text-teal-700">
                View all applications →
              </Link>
            </div>
          )}
        </AdminSection>

        <AdminSection
          eyebrow="Deadlines"
          title="Upcoming deadlines"
          description="Plaksha nomination deadlines alongside the official university dates. Set both when adding a deadline in Programs."
        >
          {dashboard.upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming deadlines.</p>
          ) : (
            <div className="space-y-3">
              {dashboard.upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{deadline.programTitle}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{deadline.title}</p>
                    </div>
                    <StatusBadge label={deadline.priority} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-teal-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Plaksha deadline</p>
                      <p className="mt-0.5 text-sm font-medium text-teal-900">{formatIsoDate(deadline.date)}</p>
                    </div>
                    {deadline.officialDeadline ? (
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">University deadline</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-700">{formatIsoDate(deadline.officialDeadline)}</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2">
                        <p className="text-xs text-slate-400">No university deadline set</p>
                        <Link href="/admin/programs" className="mt-0.5 block text-xs font-medium text-teal-600 hover:underline">Set in Programs →</Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </>
  );
}

function ProgramsSection({ programs }: { programs: Program[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");

  const countries = useMemo(
    () => ["All", ...Array.from(new Set(programs.map((p) => p.country))).sort()],
    [programs],
  );
  const types = ["All", "Exchange", "Research", "Internship", "Summer School"];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return programs.filter((p) => {
      if (typeFilter !== "All" && p.type !== typeFilter) return false;
      if (countryFilter !== "All" && p.country !== countryFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.university.toLowerCase().includes(q) && !p.country.toLowerCase().includes(q) && !p.tags.some((t) => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [programs, search, typeFilter, countryFilter]);

  return (
    <AdminSection
      eyebrow="Programs"
      title="All programs"
      description="Click a program to edit it, manage its deadlines, or delete it. Use Add Program to create a new one."
    >
      {/* Search + filters bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm min-w-48">
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programs, universities, tags…"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none">
          {types.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
        </select>
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none">
          {countries.map((c) => <option key={c} value={c}>{c === "All" ? "All Countries" : c}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-3">
          <p className="text-sm text-slate-500">{filtered.length} of {programs.length} program{programs.length === 1 ? "" : "s"}</p>
          <Link
            href="/admin/programs/new"
            className="rounded-full bg-[var(--portal-teal)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            + Add Program
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((program) => (
          <Link
            key={program.id}
            href={`/admin/programs/${program.id}`}
            className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 group-hover:text-teal-800">{program.title}</p>
                <p className="mt-0.5 truncate text-sm text-slate-500">{program.university} · {program.country}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge label={program.type} />
                {program.featured ? <StatusBadge label="Featured" /> : null}
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">{program.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">{program.deadlines.length} deadline{program.deadlines.length === 1 ? "" : "s"}</span>
              <span className="text-xs font-semibold text-teal-700 group-hover:underline">Edit →</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-xl border border-slate-100 p-6 text-sm text-slate-500">
            {programs.length === 0 ? "No programs yet. Add the first one." : "No programs match your search."}
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

function DiscoverySection({
  onPrepareProgramDraft,
}: {
  onPrepareProgramDraft: (draft: OpportunityDiscoveryDraft) => void;
}) {
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [opportunityTypeFilter, setOpportunityTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [studentLevelFilter, setStudentLevelFilter] = useState("");
  const [discovery, setDiscovery] = useState<OpportunityDiscoveryResponse | null>(null);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);

  const topicOptions: SearchableOption[] = [
    { value: "AI", label: "Artificial Intelligence" },
    { value: "Robotics", label: "Robotics" },
    { value: "Data Science", label: "Data Science" },
    { value: "Computer Science", label: "Computer Science" },
    { value: "Design", label: "Design" },
    { value: "Entrepreneurship", label: "Entrepreneurship" },
    { value: "Research", label: "General Research" },
  ];

  const opportunityTypeOptions: SearchableOption[] = [
    { value: "Research", label: "Research Opportunity" },
    { value: "Summer School", label: "Summer School" },
    { value: "Exchange", label: "Exchange Program" },
    { value: "Fellowship", label: "Fellowship" },
    { value: "Internship", label: "Internship" },
  ];

  const regionOptions: SearchableOption[] = [
    { value: "Europe", label: "Europe" },
    { value: "Asia", label: "Asia" },
    { value: "North America", label: "North America" },
    { value: "Global", label: "Global / Any Region" },
  ];

  const studentLevelOptions: SearchableOption[] = [
    { value: "Undergraduate", label: "Undergraduate" },
    { value: "Graduate", label: "Graduate" },
    { value: "Any level", label: "Any Level" },
  ];

  const builtFilterRequest = useMemo(() => {
    const parts = [
      opportunityTypeFilter || "opportunities",
      topicFilter ? `in ${topicFilter}` : "",
      regionFilter && regionFilter !== "Global" ? `in ${regionFilter}` : "",
      studentLevelFilter && studentLevelFilter !== "Any level" ? `for ${studentLevelFilter.toLowerCase()} students` : "",
    ].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }, [opportunityTypeFilter, regionFilter, studentLevelFilter, topicFilter]);

  function resetAll() {
    setQuery("");
    setTopicFilter("");
    setOpportunityTypeFilter("");
    setRegionFilter("");
    setStudentLevelFilter("");
    setDiscovery(null);
  }

  async function runDiscovery() {
    const normalizedQuery = query.trim() || builtFilterRequest;
    if (!normalizedQuery) {
      toast.error("Add a short request or choose a few filters so we know what to look for.");
      return;
    }
    setLoadingDiscovery(true);
    try {
      const response = await apiPost<OpportunityDiscoveryResponse>("/admin/opportunity-discovery", {
        query: normalizedQuery,
      });
      setDiscovery(response);
      if (response.results.length === 0) {
        toast.success("Discovery finished, but no credible opportunities were returned.");
      } else {
        toast.success(`Found ${response.results.length} opportunity suggestions.`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingDiscovery(false);
    }
  }

  const searchForm = (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SearchableSelect value={topicFilter} onChange={setTopicFilter} options={topicOptions} placeholder="Topic or interest area" searchPlaceholder="Search topic" allowClear />
        <SearchableSelect value={opportunityTypeFilter} onChange={setOpportunityTypeFilter} options={opportunityTypeOptions} placeholder="Opportunity type" searchPlaceholder="Search type" allowClear />
        <SearchableSelect value={regionFilter} onChange={setRegionFilter} options={regionOptions} placeholder="Region" searchPlaceholder="Search region" allowClear />
        <SearchableSelect value={studentLevelFilter} onChange={setStudentLevelFilter} options={studentLevelOptions} placeholder="Student level" searchPlaceholder="Search level" allowClear />
      </div>

      {builtFilterRequest ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Suggested search</p>
          <p className="mt-1 text-slate-700">{builtFilterRequest}</p>
        </div>
      ) : null}

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
        placeholder="Optional: describe what you're looking for in your own words..."
      />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => void runDiscovery()}
          disabled={loadingDiscovery}
          className="rounded-full bg-[var(--portal-teal)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingDiscovery ? "Researching…" : "Discover Opportunities"}
        </button>
        <button onClick={resetAll} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Reset
        </button>
      </div>
    </div>
  );

  return (
    <AdminSection
      eyebrow="Discovery"
      title="Explore external opportunities"
      description="Search for new global opportunities for students. Use filters for a guided search, or describe what you need in plain language."
    >
      {!discovery ? (
        /* ── Pre-search: two-column form + tips ── */
        <div className="grid gap-8 xl:grid-cols-[480px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">What would you like to find?</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Use the filters below or type a plain-language request.
            </p>
            <div className="mt-5">{searchForm}</div>
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8">
            {loadingDiscovery ? (
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500" />
                <p className="mt-4 text-sm font-medium text-slate-600">Researching opportunities…</p>
                <p className="mt-1 text-xs text-slate-400">This usually takes 15–30 seconds.</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">Results appear here</p>
                <p className="mt-2 text-sm text-slate-400">Try searches like:</p>
                <div className="mt-4 flex flex-col gap-2">
                  {[
                    "Research in AI for undergraduates in Europe",
                    "Summer school options in robotics, Asia",
                    "Fellowship programs in computer science",
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setQuery(example)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-500 hover:border-teal-300 hover:text-teal-700"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Post-search: compact recap + 2-col results grid ── */
        <div className="space-y-6">
          {/* Compact search recap bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Searched for</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                {discovery.normalizedRequest}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {discovery.results.length} result{discovery.results.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={resetAll}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                New search
              </button>
            </div>
          </div>

          {discovery.overview ? (
            <p className="text-sm text-slate-500">{discovery.overview}</p>
          ) : null}

          {discovery.results.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {discovery.results.map((result, index) => (
                <OpportunityResultCard
                  key={result.id}
                  index={index}
                  result={result}
                  onPrepareProgramDraft={onPrepareProgramDraft}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              <p>We couldn't find strong matches. Try narrowing by topic, region, or type.</p>
              <button onClick={resetAll} className="mt-4 text-sm font-semibold text-teal-600 hover:underline">
                Try a new search →
              </button>
            </div>
          )}
        </div>
      )}
    </AdminSection>
  );
}

function OpportunityResultCard({
  index,
  result,
  onPrepareProgramDraft,
}: {
  index: number;
  result: OpportunityDiscoveryResult;
  onPrepareProgramDraft: (draft: OpportunityDiscoveryDraft) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const tierTone =
    result.confidenceTier === "best_match"
      ? "bg-emerald-50 text-emerald-700"
      : result.confidenceTier === "strong_match"
        ? "bg-teal-50 text-teal-700"
        : "bg-amber-50 text-amber-700";

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      {/* Top row: badges + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            #{index + 1}
          </span>
          <StatusBadge label={result.opportunityType} />
          {result.country ? <StatusBadge label={result.country} /> : null}
          {result.confidenceLabel ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tierTone}`}>
              {result.confidenceLabel}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            ↗ Source
          </a>
          <button
            onClick={() => onPrepareProgramDraft(result.draftProgram)}
            className="rounded-full bg-[var(--portal-teal)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            + Add to Programs
          </button>
        </div>
      </div>

      {/* Title + institution */}
      <p className="mt-3 font-semibold leading-snug text-slate-900">{result.title}</p>
      <p className="mt-0.5 text-sm text-slate-500">{result.institution}</p>

      {/* Summary */}
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{result.summary}</p>

      {/* Quick facts */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Timing</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{result.timing}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Deadline</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{result.deadline}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Source</p>
          <p className="mt-1 line-clamp-1 text-xs text-slate-600">{result.sourceLabel}</p>
        </div>
      </div>

      {/* Expandable details */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 self-start text-xs font-semibold text-teal-600 hover:underline"
      >
        {expanded ? "Hide details ↑" : "Why it fits · Eligibility ↓"}
      </button>

      {expanded ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Why it fits</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{result.fitReason}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Eligibility</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{result.eligibility}</p>
          </div>
        </div>
      ) : null}

      {/* Tags */}
      {result.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.tags.map((tag) => (
            <span
              key={`${result.id}-${tag}`}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function toTimeMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = m[3].toUpperCase();
  if (mer === "AM" && h === 12) h = 0;
  if (mer === "PM" && h !== 12) h += 12;
  return h * 60 + min;
}

function MeetingRow({ meeting }: { meeting: Booking }) {
  const statusColor =
    meeting.status === "Confirmed"
      ? "bg-teal-50 text-teal-700"
      : meeting.status === "Pending"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  const initial = meeting.studentName?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 transition hover:bg-white">
      <span className="w-16 shrink-0 text-sm font-bold text-teal-700">{meeting.time}</span>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
        {meeting.status}
      </span>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{meeting.studentName}</p>
        <p className="truncate text-xs text-slate-400">{meeting.studentEmail}</p>
      </div>
      {meeting.topic ? (
        <p className="hidden max-w-[220px] shrink-0 truncate text-sm text-slate-400 md:block">
          {meeting.topic}
        </p>
      ) : null}
    </div>
  );
}

type AvailabilitySlot = { id: number; time: string; available: boolean; date: string };

function MentorOverviewSection({
  meetings,
  mentors,
  currentUserEmail,
}: {
  meetings: Booking[];
  mentors: Mentor[];
  currentUserEmail: string | null;
}) {
  const ownMentor = mentors.find((m) => m.email === currentUserEmail) || null;
  const today = toIsoDate(new Date());
  const [search, setSearch] = useState("");
  const [todaySlots, setTodaySlots] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    if (!ownMentor) return;
    apiGet<{ slots: AvailabilitySlot[] }>(`/mentors/${ownMentor.id}/availability`, { date: today })
      .then((res) => setTodaySlots(res.slots ?? []))
      .catch(() => setTodaySlots([]));
  }, [ownMentor?.id, today]);

  const tomorrowDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }, []);

  const weekEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toIsoDate(d);
  }, []);

  const twoWeeksEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toIsoDate(d);
  }, []);

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.date >= today)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return toTimeMinutes(a.time) - toTimeMinutes(b.time);
        }),
    [meetings, today],
  );

  const todayMeetings = useMemo(
    () => upcomingMeetings.filter((m) => m.date === today),
    [upcomingMeetings, today],
  );

  const thisWeekCount = useMemo(
    () => upcomingMeetings.filter((m) => m.date > today && m.date <= weekEnd).length,
    [upcomingMeetings, today, weekEnd],
  );

  // Merge today's slots with booking info
  const todaySchedule = useMemo(() => {
    const sorted = [...todaySlots].sort((a, b) => toTimeMinutes(a.time) - toTimeMinutes(b.time));
    return sorted.map((slot) => ({
      ...slot,
      booking: todayMeetings.find((m) => m.time === slot.time) ?? null,
    }));
  }, [todaySlots, todayMeetings]);

  const filteredMeetings = useMemo(() => {
    if (!search.trim()) return upcomingMeetings;
    const q = search.toLowerCase();
    return upcomingMeetings.filter(
      (m) =>
        m.studentName?.toLowerCase().includes(q) ||
        m.studentEmail?.toLowerCase().includes(q) ||
        m.topic?.toLowerCase().includes(q),
    );
  }, [upcomingMeetings, search]);

  const groupedMeetings = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const m of filteredMeetings) {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push(m);
    }
    return [...map.entries()]
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredMeetings]);

  function getDateBadge(dateStr: string): { label: string; className: string } | null {
    if (dateStr === today) return { label: "Today", className: "bg-teal-100 text-teal-700" };
    if (dateStr === tomorrowDate) return { label: "Tomorrow", className: "bg-blue-50 text-blue-600" };
    if (dateStr <= weekEnd) return { label: "This week", className: "bg-slate-200 text-slate-600" };
    if (dateStr <= twoWeeksEnd) return { label: "Next week", className: "bg-slate-100 text-slate-500" };
    return null;
  }

  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <AdminSection
      eyebrow="Dashboard"
      title={`Welcome back${ownMentor ? `, ${ownMentor.name.split(" ")[0]}` : ""}`}
      description="Your advising schedule and upcoming student meetings."
    >
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Today's bookings",
            value: todayMeetings.length,
            sub: todayMeetings.length === 0 ? "No meetings today" : `${todaySlots.filter(s => s.available).length} slots still open`,
            accent: todayMeetings.length > 0,
          },
          {
            label: "This week",
            value: thisWeekCount,
            sub: "Meetings in next 7 days",
            accent: false,
          },
          {
            label: "Total upcoming",
            value: upcomingMeetings.length,
            sub: "All booked meetings",
            accent: false,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 shadow-sm ${stat.accent ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className={`mt-2 text-4xl font-bold ${stat.accent ? "text-teal-700" : "text-slate-900"}`}>
              {stat.value}
            </p>
            <p className="mt-1 truncate text-sm text-slate-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column: today's schedule | upcoming meetings */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">

        {/* Today's schedule */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Today&apos;s schedule</h2>
              <p className="text-xs text-slate-400">{todayLabel}</p>
            </div>
            {ownMentor ? (
              <Link
                href={`/admin/mentors/${ownMentor.id}`}
                className="shrink-0 text-xs font-semibold text-teal-600 hover:underline"
              >
                Edit slots →
              </Link>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "460px" }}>
            {todaySchedule.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm font-medium text-slate-500">No slots set for today.</p>
                {ownMentor ? (
                  <Link
                    href={`/admin/mentors/${ownMentor.id}`}
                    className="mt-3 text-sm font-semibold text-teal-600 hover:underline"
                  >
                    Add availability →
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((slot) => (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      slot.booking
                        ? "border-amber-100 bg-amber-50"
                        : "border-teal-100 bg-teal-50"
                    }`}
                  >
                    {/* Time */}
                    <span className={`w-16 shrink-0 text-sm font-bold ${slot.booking ? "text-amber-700" : "text-teal-700"}`}>
                      {slot.time}
                    </span>

                    {/* Status dot */}
                    <div className={`h-2 w-2 shrink-0 rounded-full ${slot.booking ? "bg-amber-400" : "bg-teal-400"}`} />

                    {slot.booking ? (
                      /* Booked — show student info */
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                            {slot.booking.studentName?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <p className="truncate text-sm font-semibold text-slate-900">{slot.booking.studentName}</p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{slot.booking.studentEmail}</p>
                        {slot.booking.topic ? (
                          <p className="mt-0.5 truncate text-xs text-slate-500">{slot.booking.topic}</p>
                        ) : null}
                      </div>
                    ) : (
                      /* Available */
                      <span className="text-sm text-teal-600">Open</span>
                    )}

                    {/* Status badge */}
                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      slot.booking ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"
                    }`}>
                      {slot.booking ? "Booked" : "Free"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming meetings — searchable, grouped */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">All upcoming meetings</h2>
              <p className="text-xs text-slate-400">
                {upcomingMeetings.length} meeting{upcomingMeetings.length !== 1 ? "s" : ""} scheduled
              </p>
            </div>
            <input
              type="search"
              placeholder="Search name, email, or topic…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-teal-400 focus:bg-white"
            />
          </div>

          {groupedMeetings.length === 0 ? (
            <div className="p-10 text-center">
              {search ? (
                <p className="text-sm text-slate-500">No meetings match &ldquo;{search}&rdquo;.</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-500">No upcoming meetings booked yet.</p>
                  <p className="mt-1 text-xs text-slate-400">Students will appear here once they book a slot.</p>
                  {ownMentor ? (
                    <Link href={`/admin/mentors/${ownMentor.id}`} className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:underline">
                      Set up availability →
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: "460px" }}>
              {groupedMeetings.map((group) => {
                const badge = getDateBadge(group.date);
                const isToday = group.date === today;
                const dateDisplay = new Date(`${group.date}T00:00:00`).toLocaleDateString("en-GB", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                });
                return (
                  <div key={group.date}>
                    <div className={`sticky top-0 z-10 flex items-center gap-2.5 px-5 py-2.5 ${isToday ? "bg-teal-50" : "bg-slate-50"}`}>
                      <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-teal-700" : "text-slate-500"}`}>
                        {dateDisplay}
                      </span>
                      {badge ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-slate-400">
                        {group.items.length} meeting{group.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1 px-4 py-2">
                      {group.items.map((m) => (
                        <MeetingRow key={m.id} meeting={m} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manage availability CTA */}
      {ownMentor ? (
        <Link
          href={`/admin/mentors/${ownMentor.id}`}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-3 text-sm font-semibold text-teal-600 hover:bg-slate-50"
        >
          + Add or manage availability slots
        </Link>
      ) : null}
    </AdminSection>
  );
}

function MentorsSection({
  mentors,
  isMentorUser,
  currentUserEmail,
}: {
  mentors: Mentor[];
  isMentorUser: boolean;
  currentUserEmail: string | null;
}) {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");

  const baseMentors = isMentorUser
    ? mentors.filter((m) => m.email === currentUserEmail)
    : mentors;

  const regions = useMemo(
    () => ["All", ...Array.from(new Set(mentors.map((m) => m.region))).sort()],
    [mentors],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return baseMentors.filter((m) => {
      const matchesRegion = regionFilter === "All" || m.region === regionFilter;
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.expertise.toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q);
      return matchesRegion && matchesSearch;
    });
  }, [baseMentors, search, regionFilter]);

  return (
    <AdminSection
      eyebrow="Mentors"
      title={isMentorUser ? "Your mentor profile" : "Mentor management"}
      description={
        isMentorUser
          ? "Manage your availability and view upcoming student meetings."
          : "Add advisors, update profiles, and manage availability slots."
      }
    >
      {!isMentorUser ? (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 min-w-[180px]">
            <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              placeholder="Search mentors…"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none"
          >
            {regions.map((r) => (
              <option key={r} value={r}>{r === "All" ? "All Regions" : r}</option>
            ))}
          </select>
          <p className="text-sm text-slate-500 shrink-0">
            <span className="font-semibold text-slate-800">{filtered.length}</span>
            {" of "}
            <span className="font-semibold text-slate-800">{mentors.length}</span>
            {" mentor"}{mentors.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/admin/mentors/new"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--portal-teal)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 shrink-0"
          >
            + Add Mentor
          </Link>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-500">
            {mentors.length === 0 ? "No mentors registered yet." : "No mentors match your search."}
          </p>
          {!isMentorUser && mentors.length === 0 ? (
            <Link
              href="/admin/mentors/new"
              className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:underline"
            >
              Add the first mentor →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((mentor) => (
            <Link
              key={mentor.id}
              href={`/admin/mentors/${mentor.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
                  {mentor.name.charAt(0)}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {mentor.region}
                </span>
              </div>
              <p className="mt-3 font-semibold text-slate-900 group-hover:text-teal-700">{mentor.name}</p>
              <p className="mt-0.5 text-sm text-slate-500">{mentor.expertise}</p>
              <p className="mt-1 text-xs text-slate-400">{mentor.email}</p>
              {mentor.bio ? (
                <p className="mt-3 line-clamp-2 text-sm text-slate-400">{mentor.bio}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </AdminSection>
  );
}

function ProgramsRedirectSection() {
  return (
    <AdminSection
      eyebrow="Deadlines"
      title="Deadline management has moved"
      description="Deadlines are now managed inside the Programs workspace so each program and its milestones stay together in one compact flow."
    >
      <p className="rounded-xl bg-[var(--portal-panel)] px-5 py-5 text-sm text-slate-500">
        Open the Programs tab, search for a program, and manage that program&apos;s deadlines directly from its detail panel.
      </p>
    </AdminSection>
  );
}

function ApplicationsSection({
  applications,
  applicationFilter,
  onApplicationFilterChange,
}: {
  applications: Application[];
  applicationFilter: { student: string; program: string; status: string };
  onApplicationFilterChange: React.Dispatch<React.SetStateAction<{ student: string; program: string; status: string }>>;
}) {
  const studentOptions = useMemo(
    () => Array.from(new Set(applications.map((a) => a.studentName))).sort(),
    [applications],
  );
  const programOptions = useMemo(
    () => Array.from(new Set(applications.map((a) => a.programTitle))).sort(),
    [applications],
  );
  const deferredStudentFilter = useDeferredValue(applicationFilter.student);
  const deferredProgramFilter = useDeferredValue(applicationFilter.program);
  const deferredStatusFilter = useDeferredValue(applicationFilter.status);
  const filteredApplications = useMemo(
    () =>
      applications.filter((a) => {
        const studentMatch = deferredStudentFilter ? a.studentName.toLowerCase().includes(deferredStudentFilter.toLowerCase()) : true;
        const programMatch = deferredProgramFilter ? a.programTitle.toLowerCase().includes(deferredProgramFilter.toLowerCase()) : true;
        const statusMatch = deferredStatusFilter ? a.status === deferredStatusFilter : true;
        return studentMatch && programMatch && statusMatch;
      }),
    [applications, deferredProgramFilter, deferredStatusFilter, deferredStudentFilter],
  );

  return (
    <AdminSection
      eyebrow="Applications"
      title="All applications"
      description="Click any application to open the full workflow management view with documents, stage controls, and communications."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <SearchableSelect
          value={applicationFilter.student}
          onChange={(value) => onApplicationFilterChange((prev) => ({ ...prev, student: value }))}
          options={studentOptions.map((s) => ({ value: s, label: s }))}
          placeholder="Filter by student"
          searchPlaceholder="Search student"
          allowClear
        />
        <SearchableSelect
          value={applicationFilter.program}
          onChange={(value) => onApplicationFilterChange((prev) => ({ ...prev, program: value }))}
          options={programOptions.map((p) => ({ value: p, label: p }))}
          placeholder="Filter by program"
          searchPlaceholder="Search program"
          allowClear
        />
        <SearchableSelect
          value={applicationFilter.status}
          onChange={(value) => onApplicationFilterChange((prev) => ({ ...prev, status: value }))}
          options={statusOptions.map((s) => ({ value: s, label: s }))}
          placeholder="All statuses"
          searchPlaceholder="Search status"
          allowClear
        />
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Showing {filteredApplications.length} application{filteredApplications.length === 1 ? "" : "s"}.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredApplications.map((application) => {
          const activeStage = application.workflowStages
            .slice()
            .sort((a, b) => b.order - a.order)
            .find((s) => ["ACTIVE", "PENDING", "CHANGES_REQUESTED"].includes(s.status)) || null;
          return (
            <Link
              key={application.id}
              href={`/admin/applications/${application.id}`}
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 group-hover:text-teal-800">{application.programTitle}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{application.studentName}</p>
                  <p className="truncate text-xs text-slate-400">{application.studentEmail}</p>
                </div>
                <StatusBadge label={application.status} />
              </div>
              {activeStage ? (
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Stage: </span>{activeStage.stageLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{activeStage.status.replaceAll("_", " ")}</p>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">No workflow stage started</p>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-400">Submitted {formatIsoDate(application.createdAt)}</p>
                <span className="text-xs font-semibold text-teal-700 group-hover:underline">Manage →</span>
              </div>
            </Link>
          );
        })}
        {filteredApplications.length === 0 ? (
          <p className="col-span-full rounded-xl border border-slate-100 p-6 text-sm text-slate-500">
            No applications match the current filters.
          </p>
        ) : null}
      </div>
    </AdminSection>
  );
}

const DOC_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  text:     { bg: "bg-slate-100",   text: "text-slate-600",  label: "Text note" },
  markdown: { bg: "bg-teal-50",     text: "text-teal-700",   label: "Markdown" },
  policy:   { bg: "bg-slate-100",   text: "text-slate-600",  label: "Policy" },
  faq:      { bg: "bg-amber-50",    text: "text-amber-700",  label: "FAQ" },
  process:  { bg: "bg-teal-50",     text: "text-teal-700",   label: "Process guide" },
  json:     { bg: "bg-emerald-50",  text: "text-emerald-700",label: "Structured JSON" },
};

function DocTypeBadge({ type }: { type: string }) {
  const style = DOC_TYPE_STYLES[type] ?? { bg: "bg-slate-100", text: "text-slate-600", label: type };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function AssistantSection({
  isMentorUser,
  documents,
  form,
  fileName,
  onFormChange,
  onUpload,
  onDelete,
  onFileSelect,
}: {
  isMentorUser: boolean;
  documents: KnowledgeDocument[];
  form: KnowledgeDocumentFormState;
  fileName: string;
  onFormChange: React.Dispatch<React.SetStateAction<KnowledgeDocumentFormState>>;
  onUpload: () => Promise<void>;
  onDelete: (documentId: number) => Promise<void>;
  onFileSelect: (file: File | null) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [docSearch, setDocSearch] = useState("");

  async function handleUpload() {
    setUploading(true);
    try { await onUpload(); } finally { setUploading(false); }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filteredDocs = docSearch.trim()
    ? documents.filter((d) =>
        d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
        d.uploadedByName.toLowerCase().includes(docSearch.toLowerCase()) ||
        d.sourceType.toLowerCase().includes(docSearch.toLowerCase()),
      )
    : documents;

  return (
    <AdminSection
      eyebrow="Assistant"
      title={isMentorUser ? "Mentor knowledge documents" : "Assistant knowledge base"}
      description={
        isMentorUser
          ? "Upload advising notes, FAQs, or process references so the assistant can answer students with more mentor-specific context."
          : "Upload office guides, policies, and program reference notes so the assistant answers from live portal data plus approved documents."
      }
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">

        {/* ── Upload panel ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload document</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Plain text, markdown, CSV, or JSON. The assistant searches these alongside live portal data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFormChange(() => DEMO_KNOWLEDGE_DOCUMENT)}
                className="shrink-0 rounded-full border border-dashed border-teal-400 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
              >
                ✦ Fill demo data
              </button>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Document title</label>
              <input
                value={form.title}
                onChange={(e) => onFormChange((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
                placeholder="e.g. Europe Mobility Advising Notes"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Document type</label>
              <SearchableSelect
                value={form.sourceType}
                onChange={(value) => onFormChange((prev) => ({ ...prev, sourceType: value || "text" }))}
                options={[
                  { value: "text",     label: "Text note" },
                  { value: "markdown", label: "Markdown" },
                  { value: "policy",   label: "Policy" },
                  { value: "faq",      label: "FAQ" },
                  { value: "process",  label: "Process guide" },
                  { value: "json",     label: "Structured JSON" },
                ]}
                placeholder="Select type"
                searchPlaceholder="Search type"
              />
            </div>

            {/* File upload zone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Upload file (optional)</label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center transition hover:border-teal-300 hover:bg-teal-50">
                <Upload size={20} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Click to choose a file</span>
                <span className="text-xs text-slate-400">.txt · .md · .csv · .json</span>
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.csv,.json,text/plain,text/markdown,application/json,text/csv"
                  className="hidden"
                  onChange={(e) => { void onFileSelect(e.target.files?.[0] ?? null); }}
                />
              </label>
              {fileName ? (
                <div className="flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                  <FileText size={13} className="shrink-0 text-teal-600" />
                  <p className="truncate text-xs font-medium text-teal-700">{fileName}</p>
                </div>
              ) : null}
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => onFormChange((prev) => ({ ...prev, content: e.target.value }))}
                className="min-h-40 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
                placeholder="Paste policy notes, partner guidance, FAQs, or reference material here…"
              />
            </div>

            <button
              onClick={() => void handleUpload()}
              disabled={uploading || !form.title.trim() || !form.content.trim()}
              className="w-full rounded-xl bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Add to Knowledge Base"}
            </button>
          </div>
        </div>

        {/* ── Document library ── */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Library header */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Knowledge base</h3>
              <p className="text-xs text-slate-400">
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </p>
            </div>
            {documents.length > 0 ? (
              <input
                type="search"
                placeholder="Search documents…"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-48 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-teal-400 focus:bg-white"
              />
            ) : null}
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50" style={{ maxHeight: "600px" }}>
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <FileText size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {docSearch ? `No documents match "${docSearch}"` : "No documents yet"}
                </p>
                {!docSearch ? (
                  <p className="max-w-xs text-xs text-slate-400">
                    Upload office guides or advisor notes to improve how the chatbot answers student questions.
                  </p>
                ) : null}
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isExpanded = expandedIds.has(doc.id);
                const roleStyle = doc.uploadedByRole === "admin"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-teal-50 text-teal-700";
                return (
                  <div key={doc.id} className="group p-5 transition hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                          <DocTypeBadge type={doc.sourceType} />
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{doc.uploadedByName}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleStyle}`}>
                            {doc.uploadedByRole}
                          </span>
                          <span>·</span>
                          <span>Updated {formatIsoDate(doc.updatedAt)}</span>
                        </div>

                        {doc.excerpt ? (
                          <div className="mt-3">
                            <p className={`text-sm leading-6 text-slate-500 ${isExpanded ? "" : "line-clamp-2"}`}>
                              {doc.excerpt}
                            </p>
                            {doc.excerpt.length > 120 ? (
                              <button
                                onClick={() => toggleExpand(doc.id)}
                                className="mt-1 text-xs font-semibold text-teal-600 hover:underline"
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {/* Delete */}
                      {doc.canManage ? (
                        <button
                          onClick={() => void handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="mt-0.5 shrink-0 rounded-lg border border-rose-100 p-2 text-rose-400 opacity-0 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:opacity-40"
                          title="Delete document"
                        >
                          {deletingId === doc.id
                            ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                            : <Trash2 size={15} />
                          }
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminSection>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function QueueSummary({ title, items }: { title: string; items: Application[] }) {
  const previewItems = items.slice(0, 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {previewItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Program</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{item.programTitle}</p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Student</p>
            <p className="mt-0.5 text-sm text-slate-600">{item.studentName}</p>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">No applications in this lane.</p>
        ) : items.length > previewItems.length ? (
          <p className="text-xs text-slate-400">Showing latest {previewItems.length} of {items.length}.</p>
        ) : null}
      </div>
    </div>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  allowClear = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  allowClear?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

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
          if (disabled) return;
          setOpen((current) => {
            const nextOpen = !current;
            if (!nextOpen) {
              setQuery("");
            }
            return nextOpen;
          });
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left disabled:cursor-not-allowed disabled:bg-slate-50"
        disabled={disabled}
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
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none"
            placeholder={searchPlaceholder}
            autoFocus
          />

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-left text-sm text-slate-500"
              >
                Clear selection
              </button>
            ) : null}

            {filteredOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
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

function parseDisplayTimeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "AM") {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function ApprovalColumn({
  title,
  items,
}: {
  title: string;
  items: Application[];
}) {
  const previewItems = items.slice(0, 1);

  return (
    <div className="rounded-xl border border-slate-100 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-slate-500">{items.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {previewItems.map((item) => (
          <div key={item.id} className="rounded-2xl bg-[var(--portal-panel)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Program</p>
            <p className="font-medium">{item.programTitle}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">Student</p>
            <p className="text-sm text-slate-500">{item.studentName}</p>
            {item.currentWorkflowStage ? (
              <p className="mt-3 text-xs text-slate-500">
                Current stage: {item.currentWorkflowStage.stageLabel} ·{" "}
                {item.currentWorkflowStage.reviewerRoleLabel || item.currentWorkflowStage.reviewerEmail}
              </p>
            ) : null}
          </div>
        ))}
        {items.length > previewItems.length ? (
          <p className="text-xs text-slate-500">Showing the latest application in this status lane.</p>
        ) : null}
      </div>
    </div>
  );
}
