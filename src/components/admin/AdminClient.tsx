"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import type {
  AdminDashboard,
  Application,
  ApplicationDocumentAsset,
  ApplicationStatus,
  ApprovalQueue,
  Booking,
  KnowledgeDocument,
  Mentor,
  Nomination,
  Program,
} from "@/types";
import { formatIsoDate, getErrorMessage, toIsoDate } from "@/lib/utils";

export type AdminSectionKey = "overview" | "programs" | "mentors" | "deadlines" | "applications" | "assistant";

type ProgramFormState = {
  title: string;
  university: string;
  country: string;
  type: string;
  description: string;
  eligibility: string;
  duration: string;
  endDate: string;
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
  endDate: "",
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

const statusOptions: ApplicationStatus[] = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Nominated"];

export default function AdminClient({ section }: { section: AdminSectionKey }) {
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
  const [deadlinePriority, setDeadlinePriority] = useState("High");
  const [deadlineRequiredDocuments, setDeadlineRequiredDocuments] = useState<string[]>([""]);

  const [applicationFilter, setApplicationFilter] = useState({ student: "", program: "", status: "" });

  async function loadAllData() {
    setLoading(true);
    try {
      const [nextDashboard, nextQueue, nextPrograms, nextMentors, nextApplications, nextNominations, nextKnowledgeDocuments] = await Promise.all([
        isMentorUser ? Promise.resolve(null) : apiGet<AdminDashboard>("/admin/dashboard"),
        isMentorUser ? Promise.resolve(null) : apiGet<ApprovalQueue>("/admin/approval-queue"),
        apiGet<Program[]>("/programs"),
        apiGet<Mentor[]>("/mentors"),
        isMentorUser ? Promise.resolve([]) : apiGet<Application[]>("/applications"),
        isMentorUser ? Promise.resolve([]) : apiGet<Nomination[]>("/nominations"),
        apiGet<KnowledgeDocument[]>("/chat/documents"),
      ]);

      setDashboard(nextDashboard);
      setApprovalQueue(nextQueue);
      setPrograms(nextPrograms);
      setMentors(nextMentors);
      setApplications(nextApplications);
      setNominations(nextNominations);
      setKnowledgeDocuments(nextKnowledgeDocuments);

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
    void loadAllData();
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
        endDate: programForm.endDate || undefined,
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
      await loadAllData();
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
      await loadAllData();
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
      await loadAllData();
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
      await loadAllData();
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
      setDeadlinePriority("High");
      setDeadlineRequiredDocuments([""]);
      await loadAllData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteDeadline(deadlineId: number) {
    try {
      await apiDelete(`/deadlines/${deadlineId}`);
      toast.success("Deadline deleted.");
      await loadAllData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function updateApplicationStatus(applicationId: number, status: ApplicationStatus) {
    try {
      await apiPut(`/applications/${applicationId}/status`, { status });
      toast.success("Application status updated.");
      await loadAllData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function saveReviewNotes(application: Application) {
    try {
      await apiPut(`/applications/${application.id}/review-notes`, {
        reviewerNotes: application.reviewerNotes,
        nominationNotes: application.nominationNotes,
      });
      toast.success("Review notes saved.");
      await loadAllData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function nominateApplication(application: Application) {
    try {
      await apiPost("/nominations", {
        applicationId: application.id,
        notes: application.nominationNotes || "Nominated by Global Engagement Office.",
      });
      toast.success("Application nominated.");
      await loadAllData();
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
      await loadAllData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteKnowledgeDocument(documentId: number) {
    try {
      await apiDelete(`/chat/documents/${documentId}`);
      toast.success("Assistant reference document removed.");
      await loadAllData();
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
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Office access only</h1>
          <p className="mt-3 text-slate-600">
            Sign in with an approved Global Engagement Office or mentor account to access the internal workspace.
          </p>
        </div>
      </div>
    );
  }

  if (loading || (!isMentorUser && (!dashboard || !approvalQueue))) {
    return <LoadingState label="Loading admin workspace..." />;
  }

  if (isMentorUser && section !== "mentors" && section !== "assistant") {
    return (
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Mentor access</h1>
        <p className="mt-3 text-slate-600">
          Mentor accounts can manage their own availability, upload assistant documents, and review meetings booked by students from the mentor workspace.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {!isMentorUser && section === "overview" ? (
        <OverviewSection dashboard={dashboard} approvalQueue={approvalQueue} nominations={nominations} />
      ) : null}

      {!isMentorUser && section === "programs" ? (
        <ProgramsSection
          programs={programs}
          selectedProgram={selectedProgram}
          programForm={programForm}
          editingProgramId={editingProgramId}
          editingDeadlineId={editingDeadlineId}
          deadlineTitle={deadlineTitle}
          deadlineDate={deadlineDate}
          deadlinePriority={deadlinePriority}
          deadlineRequiredDocuments={deadlineRequiredDocuments}
          onProgramFormChange={setProgramForm}
          onSelectedProgramIdChange={setSelectedProgramId}
          onEditingDeadlineIdChange={setEditingDeadlineId}
          onDeadlineTitleChange={setDeadlineTitle}
          onDeadlineDateChange={setDeadlineDate}
          onDeadlinePriorityChange={setDeadlinePriority}
          onDeadlineRequiredDocumentsChange={setDeadlineRequiredDocuments}
          onSubmit={submitProgram}
          onCreateDeadline={createDeadline}
          onDeleteDeadline={deleteDeadline}
          onReset={resetProgramForm}
          onEdit={(program) => {
            setEditingProgramId(program.id);
            setSelectedProgramId(program.id);
            setProgramForm({
              title: program.title,
              university: program.university,
              country: program.country,
              type: program.type,
              description: program.description,
              eligibility: program.eligibility,
              duration: program.duration,
              endDate: program.endDate || "",
              featured: program.featured,
              tags: program.tags.join(", "),
            });
          }}
          onDelete={deleteProgram}
        />
      ) : null}

      {section === "mentors" ? (
        <MentorsSection
          mentors={mentors}
          currentUserEmail={activeUser?.email || null}
          isMentorUser={isMentorUser}
          selectedMentor={selectedMentor}
          mentorMeetings={mentorMeetings}
          mentorForm={mentorForm}
          editingMentorId={editingMentorId}
          availabilityMentorId={availabilityMentorId}
          availabilityDate={availabilityDate}
          availabilitySlot={availabilitySlot}
          availabilityBatchStartTime={availabilityBatchStartTime}
          availabilityBatchEndTime={availabilityBatchEndTime}
          availabilityBatchInterval={availabilityBatchInterval}
          availabilitySlots={availabilitySlots}
          onMentorFormChange={setMentorForm}
          onSubmit={submitMentor}
          onReset={resetMentorForm}
          onEdit={(mentor) => {
            setEditingMentorId(mentor.id);
            setSelectedMentorId(mentor.id);
            setMentorForm({
              name: mentor.name,
              email: mentor.email,
              expertise: mentor.expertise,
              bio: mentor.bio,
              region: mentor.region,
            });
          }}
          onDelete={deleteMentor}
          onSelectedMentorIdChange={setSelectedMentorId}
          onAvailabilityMentorIdChange={setAvailabilityMentorId}
          onAvailabilityDateChange={setAvailabilityDate}
          onAvailabilitySlotChange={setAvailabilitySlot}
          onAvailabilityBatchStartTimeChange={setAvailabilityBatchStartTime}
          onAvailabilityBatchEndTimeChange={setAvailabilityBatchEndTime}
          onAvailabilityBatchIntervalChange={setAvailabilityBatchInterval}
          onCreateAvailability={createAvailability}
          onCreateAvailabilityBatch={createAvailabilityBatch}
          onDeleteAvailability={deleteAvailability}
        />
      ) : null}

      {!isMentorUser && section === "deadlines" ? <ProgramsRedirectSection /> : null}

      {!isMentorUser && section === "applications" ? (
        <ApplicationsSection
          approvalQueue={approvalQueue}
          applications={applications}
          applicationFilter={applicationFilter}
          nominations={nominations}
          onApplicationFilterChange={setApplicationFilter}
          onApplicationsChange={setApplications}
          onStatusChange={updateApplicationStatus}
          onSaveNotes={saveReviewNotes}
          onNominate={nominateApplication}
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
  return <div className="mx-auto max-w-7xl px-6 py-16 text-slate-500">{label}</div>;
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
    <section className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-3xl text-slate-600">{description}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function OverviewSection({
  dashboard,
  approvalQueue,
  nominations,
}: {
  dashboard: AdminDashboard;
  approvalQueue: ApprovalQueue;
  nominations: Nomination[];
}) {
  const recentDeadlines = dashboard.upcomingDeadlines.slice(0, 3);
  const recentNominations = nominations.slice(0, 3);

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
          eyebrow="Overview"
          title="Upcoming deadlines"
          description="A compact snapshot of the nearest milestone dates so the overview stays readable even when the portal grows."
        >
          <div className="space-y-3">
            {recentDeadlines.map((deadline) => (
              <div key={deadline.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                <div>
                  <p className="font-semibold">{deadline.programTitle}</p>
                  <p className="text-sm text-slate-500">{deadline.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">{formatIsoDate(deadline.date)}</p>
                  <div className="mt-2">
                    <StatusBadge label={deadline.priority} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {dashboard.upcomingDeadlines.length > recentDeadlines.length ? (
            <p className="mt-4 text-sm text-slate-500">
              Showing the next {recentDeadlines.length} deadlines in overview. Manage the full set from Programs.
            </p>
          ) : null}
        </AdminSection>

        <AdminSection
          eyebrow="Queue"
          title="Approval snapshot"
          description="Only the most recent application in each status lane is shown here so the overview remains compact."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <QueueSummary title="Submitted" items={approvalQueue.submitted} />
            <QueueSummary title="Under Review" items={approvalQueue.underReview} />
            <QueueSummary title="Approved" items={approvalQueue.approved} />
            <QueueSummary title="Nominated" items={approvalQueue.nominated} />
          </div>
        </AdminSection>
      </div>

      <AdminSection
        eyebrow="Recent Nominations"
        title="Nomination log"
        description="A short list of the latest nominations, not the full historical log."
      >
        <div className="space-y-3">
          {recentNominations.map((nomination) => (
            <div key={nomination.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">{nomination.application?.programTitle}</p>
                  <p className="text-sm text-slate-500">{nomination.application?.studentName}</p>
                </div>
                <p className="text-sm text-slate-500">{formatIsoDate(nomination.createdAt)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{nomination.notes}</p>
            </div>
          ))}
        </div>
        {nominations.length > recentNominations.length ? (
          <p className="mt-4 text-sm text-slate-500">
            Showing the latest {recentNominations.length} nominations in overview.
          </p>
        ) : null}
      </AdminSection>
    </>
  );
}

function ProgramsSection({
  programs,
  selectedProgram,
  programForm,
  editingProgramId,
  editingDeadlineId,
  deadlineTitle,
  deadlineDate,
  deadlinePriority,
  deadlineRequiredDocuments,
  onProgramFormChange,
  onSelectedProgramIdChange,
  onEditingDeadlineIdChange,
  onDeadlineTitleChange,
  onDeadlineDateChange,
  onDeadlinePriorityChange,
  onDeadlineRequiredDocumentsChange,
  onSubmit,
  onCreateDeadline,
  onDeleteDeadline,
  onReset,
  onEdit,
  onDelete,
}: {
  programs: Program[];
  selectedProgram: Program | null;
  programForm: ProgramFormState;
  editingProgramId: number | null;
  editingDeadlineId: number | null;
  deadlineTitle: string;
  deadlineDate: string;
  deadlinePriority: string;
  deadlineRequiredDocuments: string[];
  onProgramFormChange: React.Dispatch<React.SetStateAction<ProgramFormState>>;
  onSelectedProgramIdChange: React.Dispatch<React.SetStateAction<number | null>>;
  onEditingDeadlineIdChange: React.Dispatch<React.SetStateAction<number | null>>;
  onDeadlineTitleChange: React.Dispatch<React.SetStateAction<string>>;
  onDeadlineDateChange: React.Dispatch<React.SetStateAction<string>>;
  onDeadlinePriorityChange: React.Dispatch<React.SetStateAction<string>>;
  onDeadlineRequiredDocumentsChange: React.Dispatch<React.SetStateAction<string[]>>;
  onSubmit: () => Promise<void>;
  onCreateDeadline: () => Promise<void>;
  onDeleteDeadline: (deadlineId: number) => Promise<void>;
  onReset: () => void;
  onEdit: (program: Program) => void;
  onDelete: (programId: number) => Promise<void>;
}) {
  const programOptions = useMemo<SearchableOption[]>(
    () =>
      programs.map((program) => ({
        value: String(program.id),
        label: program.title,
        helperText: `${program.university} · ${program.country}`,
        keywords: [program.type, ...program.tags],
      })),
    [programs],
  );

  return (
    <AdminSection
      eyebrow="Programs"
      title="Programs management"
      description="Create programs from the left, then search and focus on one selected program at a time for editing, deletion, and deadline management."
    >
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
          <h3 className="text-xl font-semibold">{editingProgramId ? "Edit program" : "Create program"}</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={programForm.title} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, title: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Title" />
            <input value={programForm.university} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, university: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="University" />
            <input value={programForm.country} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, country: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Country" />
            <SearchableSelect
              value={programForm.type}
              onChange={(value) => onProgramFormChange((prev) => ({ ...prev, type: value || "Exchange" }))}
              options={[
                { value: "Exchange", label: "Exchange" },
                { value: "Research", label: "Research" },
                { value: "Internship", label: "Internship" },
                { value: "Summer School", label: "Summer School" },
              ]}
              placeholder="Program type"
              searchPlaceholder="Search program type"
            />
          </div>
          <textarea value={programForm.description} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, description: e.target.value }))} className="mt-3 min-h-28 w-full rounded-2xl border border-black/10 px-4 py-3" placeholder="Description" />
          <textarea value={programForm.eligibility} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, eligibility: e.target.value }))} className="mt-3 min-h-20 w-full rounded-2xl border border-black/10 px-4 py-3" placeholder="Eligibility" />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input value={programForm.duration} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, duration: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Duration" />
            <input
              type="date"
              value={programForm.endDate}
              onChange={(e) => onProgramFormChange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Program end date"
            />
          </div>
          <div className="mt-3">
            <input value={programForm.tags} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, tags: e.target.value }))} className="w-full rounded-2xl border border-black/10 px-4 py-3" placeholder="Tags, comma separated" />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={programForm.featured} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, featured: e.target.checked }))} />
            Featured on homepage
          </label>
          <div className="mt-5 flex gap-3">
            <button onClick={() => void onSubmit()} className="rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white">
              {editingProgramId ? "Update Program" : "Create Program"}
            </button>
            {editingProgramId ? (
              <button onClick={onReset} className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 p-6">
            <SearchableSelect
              value={selectedProgram ? String(selectedProgram.id) : ""}
              onChange={(value) => onSelectedProgramIdChange(value ? Number(value) : null)}
              options={programOptions}
              placeholder="Select a program"
              searchPlaceholder="Search by title, university, country, or tag"
            />
            <p className="mt-3 text-sm text-slate-500">
              Search once, then focus on a single selected program for editing, deletion, and deadlines.
            </p>
          </div>

          {selectedProgram ? (
            <div className="rounded-3xl border border-slate-100 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold">{selectedProgram.title}</p>
                    <StatusBadge label={selectedProgram.type} />
                    {selectedProgram.featured ? <StatusBadge label="Featured" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedProgram.university} · {selectedProgram.country}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{selectedProgram.description}</p>
                  <p className="mt-3 text-sm text-slate-500">
                    Eligibility: {selectedProgram.eligibility}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Duration: {selectedProgram.duration}</p>
                  {selectedProgram.endDate ? <p className="mt-1 text-sm text-slate-500">Program runs until: {formatIsoDate(selectedProgram.endDate)}</p> : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => onEdit(selectedProgram)} className="rounded-full border border-black/10 px-4 py-2 text-sm">
                    Edit
                  </button>
                  <button
                    onClick={() => void onDelete(selectedProgram.id)}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-3xl bg-[var(--portal-panel)] p-5">
                  <h4 className="text-lg font-semibold">{editingDeadlineId ? "Edit selected deadline" : "Add deadline to selected program"}</h4>
                  <div className="mt-4 grid gap-3">
                    <input
                      value={deadlineTitle}
                      onChange={(e) => onDeadlineTitleChange(e.target.value)}
                      className="rounded-2xl border border-black/10 px-4 py-3"
                      placeholder="Deadline title"
                    />
                    <div className="space-y-3 rounded-2xl border border-black/5 bg-white/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-700">Required files</p>
                        <button
                          type="button"
                          onClick={() =>
                            onDeadlineRequiredDocumentsChange((prev) => [...prev, ""])
                          }
                          className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                          Add another file
                        </button>
                      </div>
                      <div className="space-y-2">
                        {deadlineRequiredDocuments.map((requiredDocument, index) => (
                          <div key={`required-document-${index}`} className="flex items-center gap-2">
                            <input
                              value={requiredDocument}
                              onChange={(e) =>
                                onDeadlineRequiredDocumentsChange((prev) =>
                                  prev.map((item, itemIndex) => (itemIndex === index ? e.target.value : item)),
                                )
                              }
                              className="w-full rounded-2xl border border-black/10 px-4 py-3"
                              placeholder={`Required file ${index + 1} (e.g. Transcript, Resume, LOR)`}
                            />
                            {deadlineRequiredDocuments.length > 1 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onDeadlineRequiredDocumentsChange((prev) => {
                                    const nextItems = prev.filter((_, itemIndex) => itemIndex !== index);
                                    return nextItems.length > 0 ? nextItems : [""];
                                  })
                                }
                                className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => onDeadlineDateChange(e.target.value)}
                      className="rounded-2xl border border-black/10 px-4 py-3"
                    />
                    <SearchableSelect
                      value={deadlinePriority}
                      onChange={(value) => onDeadlinePriorityChange(value || "High")}
                      options={[
                        { value: "High", label: "High" },
                        { value: "Medium", label: "Medium" },
                        { value: "Low", label: "Low" },
                      ]}
                      placeholder="Priority"
                      searchPlaceholder="Search priority"
                    />
                  </div>
                  <button
                    onClick={() => void onCreateDeadline()}
                    className="mt-4 rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white"
                  >
                    {editingDeadlineId ? "Update Deadline" : "Add Deadline"}
                  </button>
                  {editingDeadlineId ? (
                    <button
                      onClick={() => {
                        onEditingDeadlineIdChange(null);
                        onDeadlineTitleChange("Application deadline");
                        onDeadlineDateChange(toIsoDate(new Date()));
                        onDeadlinePriorityChange("High");
                        onDeadlineRequiredDocumentsChange([""]);
                      }}
                      className="mt-3 rounded-full border border-black/10 px-5 py-3 text-sm font-semibold"
                    >
                      Cancel Deadline Edit
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold">Deadlines for {selectedProgram.title}</h4>
                    <span className="text-sm text-slate-500">{selectedProgram.deadlines.length}</span>
                  </div>
                  {selectedProgram.deadlines.length === 0 ? (
                    <p className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500">
                      No deadlines added for this program yet.
                    </p>
                  ) : (
                    selectedProgram.deadlines.map((deadline) => (
                      <div key={deadline.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold">{deadline.title}</p>
                          <p className="text-sm text-slate-500">{formatIsoDate(deadline.date)}</p>
                          {deadline.requiredDocuments.length > 0 ? (
                            <p className="mt-2 text-sm text-slate-500">
                              Required uploads: {deadline.requiredDocuments.join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge label={deadline.priority} />
                          <button
                            onClick={() => {
                              onEditingDeadlineIdChange(deadline.id);
                              onDeadlineTitleChange(deadline.title);
                              onDeadlineDateChange(deadline.date);
                              onDeadlinePriorityChange(deadline.priority);
                              onDeadlineRequiredDocumentsChange(
                                deadline.requiredDocuments.length > 0 ? deadline.requiredDocuments : [""],
                              );
                            }}
                            className="rounded-full border border-black/10 px-4 py-2 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void onDeleteDeadline(deadline.id)}
                            className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-3xl border border-slate-100 p-6 text-sm text-slate-500">
              No programs match the current search.
            </p>
          )}
        </div>
      </div>
    </AdminSection>
  );
}

function MentorsSection({
  mentors,
  currentUserEmail,
  isMentorUser,
  selectedMentor,
  mentorMeetings,
  mentorForm,
  editingMentorId,
  availabilityMentorId,
  availabilityDate,
  availabilitySlot,
  availabilityBatchStartTime,
  availabilityBatchEndTime,
  availabilityBatchInterval,
  availabilitySlots,
  onMentorFormChange,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
  onSelectedMentorIdChange,
  onAvailabilityMentorIdChange,
  onAvailabilityDateChange,
  onAvailabilitySlotChange,
  onAvailabilityBatchStartTimeChange,
  onAvailabilityBatchEndTimeChange,
  onAvailabilityBatchIntervalChange,
  onCreateAvailability,
  onCreateAvailabilityBatch,
  onDeleteAvailability,
}: {
  mentors: Mentor[];
  currentUserEmail: string | null;
  isMentorUser: boolean;
  selectedMentor: Mentor | null;
  mentorMeetings: Booking[];
  mentorForm: MentorFormState;
  editingMentorId: number | null;
  availabilityMentorId: number | null;
  availabilityDate: string;
  availabilitySlot: string;
  availabilityBatchStartTime: string;
  availabilityBatchEndTime: string;
  availabilityBatchInterval: string;
  availabilitySlots: Array<{ id: number; time: string; available: boolean; date: string }>;
  onMentorFormChange: React.Dispatch<React.SetStateAction<MentorFormState>>;
  onSubmit: () => Promise<void>;
  onReset: () => void;
  onEdit: (mentor: Mentor) => void;
  onDelete: (mentorId: number) => Promise<void>;
  onSelectedMentorIdChange: React.Dispatch<React.SetStateAction<number | null>>;
  onAvailabilityMentorIdChange: React.Dispatch<React.SetStateAction<number | null>>;
  onAvailabilityDateChange: React.Dispatch<React.SetStateAction<string>>;
  onAvailabilitySlotChange: React.Dispatch<React.SetStateAction<string>>;
  onAvailabilityBatchStartTimeChange: React.Dispatch<React.SetStateAction<string>>;
  onAvailabilityBatchEndTimeChange: React.Dispatch<React.SetStateAction<string>>;
  onAvailabilityBatchIntervalChange: React.Dispatch<React.SetStateAction<string>>;
  onCreateAvailability: () => Promise<void>;
  onCreateAvailabilityBatch: () => Promise<void>;
  onDeleteAvailability: (slotId: number) => Promise<void>;
}) {
  const visibleMentors = isMentorUser ? mentors.filter((mentor) => mentor.email === currentUserEmail) : mentors;
  const mentorOptions = useMemo<SearchableOption[]>(
    () =>
      visibleMentors.map((mentor) => ({
        value: String(mentor.id),
        label: mentor.name,
        helperText: `${mentor.email} · ${mentor.region}`,
        keywords: [mentor.expertise],
      })),
    [visibleMentors],
  );
  const [showAllAvailabilitySlots, setShowAllAvailabilitySlots] = useState(false);
  const sortedAvailabilitySlots = useMemo(
    () => [...availabilitySlots].sort((left, right) => parseDisplayTimeToMinutes(left.time) - parseDisplayTimeToMinutes(right.time)),
    [availabilitySlots],
  );
  const previewAvailabilitySlots = showAllAvailabilitySlots ? sortedAvailabilitySlots : sortedAvailabilitySlots.slice(0, 4);
  const availableSlotCount = sortedAvailabilitySlots.filter((slot) => slot.available).length;
  const bookedSlotCount = sortedAvailabilitySlots.length - availableSlotCount;

  return (
    <AdminSection
      eyebrow="Mentors"
      title={isMentorUser ? "Your mentor calendar" : "Mentor and availability management"}
      description={
        isMentorUser
          ? "Update your own availability and review upcoming meetings booked by students."
          : "Maintain advisor profiles and directly control which slots appear in the student booking flow."
      }
    >
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          {!isMentorUser ? (
            <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
              <h3 className="text-xl font-semibold">{editingMentorId ? "Edit mentor" : "Create mentor"}</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <input value={mentorForm.name} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, name: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Mentor name" />
                <input value={mentorForm.email} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, email: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Mentor email" />
                <input value={mentorForm.expertise} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, expertise: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Expertise" />
                <input value={mentorForm.region} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, region: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Support domain / region" />
              </div>
              <textarea value={mentorForm.bio} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, bio: e.target.value }))} className="mt-3 min-h-24 w-full rounded-2xl border border-black/10 px-4 py-3" placeholder="Bio" />
              <div className="mt-5 flex gap-3">
                <button onClick={() => void onSubmit()} className="rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white">
                  {editingMentorId ? "Update Mentor" : "Create Mentor"}
                </button>
                {editingMentorId ? (
                  <button onClick={onReset} className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold">
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
            <h3 className="text-xl font-semibold">Availability controls</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <SearchableSelect
                value={availabilityMentorId ? String(availabilityMentorId) : ""}
                onChange={(value) => onAvailabilityMentorIdChange(value ? Number(value) : null)}
                options={visibleMentors.map((mentor) => ({
                  value: String(mentor.id),
                  label: mentor.name,
                  helperText: mentor.email,
                  keywords: [mentor.region, mentor.expertise],
                }))}
                placeholder="Select mentor"
                searchPlaceholder="Search mentor"
                disabled={isMentorUser}
              />
              <input type="date" value={availabilityDate} onChange={(e) => onAvailabilityDateChange(e.target.value)} className="rounded-2xl border border-black/10 px-4 py-3" />
              <input value={availabilitySlot} onChange={(e) => onAvailabilitySlotChange(e.target.value)} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="10:00 AM" />
            </div>
            <button onClick={() => void onCreateAvailability()} className="mt-4 rounded-full bg-[var(--portal-gold)] px-5 py-3 text-sm font-semibold text-[var(--portal-ink)]">
              Add Slot
            </button>

            <div className="mt-6 rounded-3xl border border-white/70 bg-white/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-[var(--portal-ink)]">Batch create slots</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Generate a full block of availability in one go. A 30-minute interval is the best default for standard mentor sessions.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  type="time"
                  value={availabilityBatchStartTime}
                  onChange={(e) => onAvailabilityBatchStartTimeChange(e.target.value)}
                  className="rounded-2xl border border-black/10 px-4 py-3"
                />
                <input
                  type="time"
                  value={availabilityBatchEndTime}
                  onChange={(e) => onAvailabilityBatchEndTimeChange(e.target.value)}
                  className="rounded-2xl border border-black/10 px-4 py-3"
                />
                <SearchableSelect
                  value={availabilityBatchInterval}
                  onChange={(value) => onAvailabilityBatchIntervalChange(value || "30")}
                  options={[
                    { value: "30", label: "30 minutes" },
                    { value: "45", label: "45 minutes" },
                    { value: "60", label: "60 minutes" },
                  ]}
                  placeholder="Interval"
                  searchPlaceholder="Search interval"
                />
              </div>

              <button
                onClick={() => void onCreateAvailabilityBatch()}
                className="mt-4 rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white"
              >
                Generate Slots For This Day
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
                <span className="font-medium text-[var(--portal-ink)]">{sortedAvailabilitySlots.length} total slots</span>
                <StatusBadge label={`${availableSlotCount} Available`} />
                {bookedSlotCount > 0 ? <StatusBadge label={`${bookedSlotCount} Booked`} /> : null}
              </div>

              {previewAvailabilitySlots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{slot.time}</span>
                    <StatusBadge label={slot.available ? "Available" : "Booked"} />
                  </div>
                  {slot.available ? (
                    <button onClick={() => void onDeleteAvailability(slot.id)} className="text-sm text-rose-600">
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}

              {sortedAvailabilitySlots.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setShowAllAvailabilitySlots((current) => !current)}
                  className="w-full rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-white"
                >
                  {showAllAvailabilitySlots
                    ? "Show fewer slots"
                    : `Show all ${sortedAvailabilitySlots.length} slots for this day`}
                </button>
              ) : null}
            </div>
          </div>

          {isMentorUser ? (
            <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
              <h3 className="text-xl font-semibold">Scheduled meetings</h3>
              <div className="mt-5 space-y-3">
                {mentorMeetings.length === 0 ? (
                  <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No student meetings scheduled yet.</p>
                ) : (
                  mentorMeetings.map((meeting) => (
                    <div key={meeting.id} className="rounded-2xl bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{meeting.studentName}</p>
                          <p className="text-sm text-slate-500">{meeting.studentEmail}</p>
                        </div>
                        <StatusBadge label={meeting.status} />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {formatIsoDate(meeting.date)} · {meeting.time}
                      </p>
                      {meeting.topic ? <p className="mt-2 text-sm text-slate-500">{meeting.topic}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 p-6">
            <SearchableSelect
              value={selectedMentor ? String(selectedMentor.id) : ""}
              onChange={(value) => {
                const nextMentorId = value ? Number(value) : null;
                onSelectedMentorIdChange(nextMentorId);
                onAvailabilityMentorIdChange(nextMentorId);
              }}
              options={mentorOptions}
              placeholder="Select a mentor"
              searchPlaceholder="Search by mentor name, email, region, or expertise"
            />
            <p className="mt-3 text-sm text-slate-500">
              Search once, then focus on one mentor profile at a time for quick edits.
            </p>
          </div>

          {selectedMentor ? (
            <div className="rounded-3xl border border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{selectedMentor.name}</p>
                    <StatusBadge label={selectedMentor.region} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{selectedMentor.email}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedMentor.expertise}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{selectedMentor.bio}</p>
                </div>
                {!isMentorUser ? (
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => onEdit(selectedMentor)} className="rounded-full border border-black/10 px-4 py-2 text-sm">
                      Edit
                    </button>
                    <button onClick={() => void onDelete(selectedMentor.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600">
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="rounded-3xl border border-slate-100 p-6 text-sm text-slate-500">
              No mentors match the current search.
            </p>
          )}
        </div>
      </div>
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
      <p className="rounded-3xl bg-[var(--portal-panel)] px-5 py-5 text-sm text-slate-600">
        Open the Programs tab, search for a program, and manage that program&apos;s deadlines directly from its detail panel.
      </p>
    </AdminSection>
  );
}

function ApplicationsSection({
  approvalQueue,
  applications,
  applicationFilter,
  nominations,
  onApplicationFilterChange,
  onApplicationsChange,
  onStatusChange,
  onSaveNotes,
  onNominate,
}: {
  approvalQueue: ApprovalQueue;
  applications: Application[];
  applicationFilter: { student: string; program: string; status: string };
  nominations: Nomination[];
  onApplicationFilterChange: React.Dispatch<React.SetStateAction<{ student: string; program: string; status: string }>>;
  onApplicationsChange: React.Dispatch<React.SetStateAction<Application[]>>;
  onStatusChange: (applicationId: number, status: ApplicationStatus) => Promise<void>;
  onSaveNotes: (application: Application) => Promise<void>;
  onNominate: (application: Application) => Promise<void>;
}) {
  const [documentActionLoadingId, setDocumentActionLoadingId] = useState<number | null>(null);
  const [previewDocument, setPreviewDocument] = useState<ApplicationDocumentAsset | null>(null);
  const studentOptions = useMemo(
    () => Array.from(new Set(applications.map((application) => application.studentName))).sort(),
    [applications],
  );
  const programOptions = useMemo(
    () => Array.from(new Set(applications.map((application) => application.programTitle))).sort(),
    [applications],
  );
  const deferredStudentFilter = useDeferredValue(applicationFilter.student);
  const deferredProgramFilter = useDeferredValue(applicationFilter.program);
  const deferredStatusFilter = useDeferredValue(applicationFilter.status);
  const filteredApplications = useMemo(
    () =>
      applications.filter((application) => {
        const studentMatch = deferredStudentFilter
          ? application.studentName.toLowerCase().includes(deferredStudentFilter.toLowerCase())
          : true;
        const programMatch = deferredProgramFilter
          ? application.programTitle.toLowerCase().includes(deferredProgramFilter.toLowerCase())
          : true;
        const statusMatch = deferredStatusFilter ? application.status === deferredStatusFilter : true;
        return studentMatch && programMatch && statusMatch;
      }),
    [applications, deferredProgramFilter, deferredStatusFilter, deferredStudentFilter],
  );

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

  return (
    <>
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

      <AdminSection
        eyebrow="Approval Queue"
        title="Review workflow"
        description="Overview-only workflow lanes. Each lane shows the most recent item so the page highlights movement without turning into a long queue wall."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <ApprovalColumn title="Submitted" items={approvalQueue.submitted} onStatusChange={onStatusChange} />
          <ApprovalColumn title="Under Review" items={approvalQueue.underReview} onStatusChange={onStatusChange} />
          <ApprovalColumn title="Approved" items={approvalQueue.approved} onStatusChange={onStatusChange} />
          <ApprovalColumn title="Nominated" items={approvalQueue.nominated} onStatusChange={onStatusChange} />
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Applications"
        title="Applications review panel"
        description="Search by student or program, narrow by status, and work on the specific application you need instead of scanning a giant list."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SearchableSelect
            value={applicationFilter.student}
            onChange={(value) => onApplicationFilterChange((prev) => ({ ...prev, student: value }))}
            options={studentOptions.map((student) => ({ value: student, label: student }))}
            placeholder="Filter by student"
            searchPlaceholder="Search student"
            allowClear
          />
          <SearchableSelect
            value={applicationFilter.program}
            onChange={(value) => onApplicationFilterChange((prev) => ({ ...prev, program: value }))}
            options={programOptions.map((program) => ({ value: program, label: program }))}
            placeholder="Filter by program"
            searchPlaceholder="Search program"
            allowClear
          />
          <SearchableSelect
            value={applicationFilter.status}
            onChange={(value) => onApplicationFilterChange((prev) => ({ ...prev, status: value }))}
            options={statusOptions.map((status) => ({ value: status, label: status }))}
            placeholder="All statuses"
            searchPlaceholder="Search status"
            allowClear
          />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Showing {filteredApplications.length} matching application{filteredApplications.length === 1 ? "" : "s"}.
        </p>

        <div className="mt-6 space-y-5">
          {filteredApplications.map((application) => (
            <div key={application.id} className="rounded-3xl border border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold">{application.programTitle}</p>
                    <StatusBadge label={application.status} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--portal-ink)]">Student: {application.studentName}</p>
                  <p className="text-sm text-slate-500">{application.studentEmail}</p>
                  <p className="mt-2 text-sm text-slate-500">Program: {application.programTitle}</p>
                  {application.documents.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-medium text-slate-700">Student uploads</p>
                      <div className="space-y-2">
                      {application.documents.map((document) => (
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
                  ) : null}
                </div>
                <div className="w-full max-w-[14rem]">
                  <SearchableSelect
                    value={application.status}
                    onChange={(value) => {
                      if (value) {
                        void onStatusChange(application.id, value as ApplicationStatus);
                      }
                    }}
                    options={statusOptions.map((status) => ({ value: status, label: status }))}
                    placeholder="Application status"
                    searchPlaceholder="Search status"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <textarea
                  value={application.reviewerNotes}
                  onChange={(e) =>
                    onApplicationsChange((prev) =>
                      prev.map((item) => (item.id === application.id ? { ...item, reviewerNotes: e.target.value } : item)),
                    )
                  }
                  className="min-h-24 rounded-2xl border border-black/10 px-4 py-3"
                  placeholder="Reviewer notes"
                />
                <textarea
                  value={application.nominationNotes}
                  onChange={(e) =>
                    onApplicationsChange((prev) =>
                      prev.map((item) => (item.id === application.id ? { ...item, nominationNotes: e.target.value } : item)),
                    )
                  }
                  className="min-h-24 rounded-2xl border border-black/10 px-4 py-3"
                  placeholder="Nomination notes"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={() => void onSaveNotes(application)} className="rounded-full bg-[var(--portal-teal)] px-4 py-2 text-sm font-semibold text-white">
                  Save Notes
                </button>
                <button onClick={() => void onNominate(application)} className="rounded-full bg-[var(--portal-gold)] px-4 py-2 text-sm font-semibold text-[var(--portal-ink)]">
                  Nominate
                </button>
              </div>
            </div>
          ))}
          {filteredApplications.length === 0 ? (
            <p className="rounded-3xl border border-slate-100 p-6 text-sm text-slate-500">
              No applications match the current student, program, and status filters.
            </p>
          ) : null}
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Nominations"
        title="Nominations log"
        description="Track official nominations already sent to partner institutions."
      >
        <div className="space-y-3">
          {nominations.map((nomination) => (
            <div key={nomination.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">{nomination.application?.programTitle}</p>
                  <p className="text-sm text-slate-500">{nomination.application?.studentName}</p>
                </div>
                <p className="text-sm text-slate-500">{formatIsoDate(nomination.createdAt)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{nomination.notes}</p>
            </div>
          ))}
        </div>
      </AdminSection>
    </>
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
      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
          <h3 className="text-xl font-semibold">Upload reference document</h3>
          <p className="mt-2 text-sm text-slate-600">
            Plain text, markdown, CSV, or JSON files work best. The assistant will search these documents alongside programs, mentors, deadlines, and workflow data already in the database.
          </p>

          <div className="mt-5 grid gap-3">
            <input
              value={form.title}
              onChange={(e) => onFormChange((prev) => ({ ...prev, title: e.target.value }))}
              className="rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Document title"
            />
            <SearchableSelect
              value={form.sourceType}
              onChange={(value) => onFormChange((prev) => ({ ...prev, sourceType: value || "text" }))}
              options={[
                { value: "text", label: "Text note" },
                { value: "markdown", label: "Markdown" },
                { value: "policy", label: "Policy" },
                { value: "faq", label: "FAQ" },
                { value: "process", label: "Process guide" },
                { value: "json", label: "Structured JSON" },
              ]}
              placeholder="Document type"
              searchPlaceholder="Search document type"
            />
            <label className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-4 text-sm text-slate-600">
              <span className="block font-medium text-[var(--portal-ink)]">Upload file</span>
              <span className="mt-1 block">Choose a text-based file to autofill the content area.</span>
              <input
                type="file"
                accept=".txt,.md,.markdown,.csv,.json,text/plain,text/markdown,application/json,text/csv"
                className="mt-3 block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  void onFileSelect(file);
                }}
              />
            </label>
            {fileName ? <p className="text-xs text-slate-500">Loaded file: {fileName}</p> : null}
            <textarea
              value={form.content}
              onChange={(e) => onFormChange((prev) => ({ ...prev, content: e.target.value }))}
              className="min-h-52 rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Paste office policy notes, partner guidance, FAQs, or mentor reference material here."
            />
          </div>

          <button
            onClick={() => void onUpload()}
            className="mt-5 rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white"
          >
            Add To Assistant Knowledge Base
          </button>
        </div>

        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 p-6 text-sm text-slate-500">
              No reference documents uploaded yet. Add office guides or mentor notes to improve chatbot answers.
            </div>
          ) : (
            documents.map((document) => (
              <div key={document.id} className="rounded-3xl border border-slate-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">{document.title}</p>
                      <StatusBadge label={document.sourceType} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Uploaded by {document.uploadedByName} · {document.uploadedByRole}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Updated {formatIsoDate(document.updatedAt)}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{document.excerpt}</p>
                  </div>
                  {document.canManage ? (
                    <button
                      onClick={() => void onDelete(document.id)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminSection>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[var(--portal-ink)]">{value}</p>
    </div>
  );
}

function QueueSummary({ title, items }: { title: string; items: Application[] }) {
  const previewItems = items.slice(0, 1);

  return (
    <div className="rounded-3xl bg-[var(--portal-panel)] p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <span className="text-sm text-slate-500">{items.length}</span>
      </div>
      <div className="mt-4 space-y-2">
        {previewItems.map((item) => (
          <div key={item.id} className="rounded-2xl bg-white p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Program</p>
            <p className="font-medium">{item.programTitle}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">Student</p>
            <p className="text-sm text-slate-500">{item.studentName}</p>
          </div>
        ))}
        {items.length > previewItems.length ? (
          <p className="text-xs text-slate-500">Showing latest {previewItems.length} item in this lane.</p>
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
        className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-left disabled:cursor-not-allowed disabled:bg-slate-100"
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
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-black/10 px-4 py-3"
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
                className="w-full rounded-2xl border border-dashed border-black/10 px-4 py-3 text-left text-sm text-slate-500"
              >
                Clear selection
              </button>
            ) : null}

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
  onStatusChange,
}: {
  title: string;
  items: Application[];
  onStatusChange: (applicationId: number, status: ApplicationStatus) => Promise<void>;
}) {
  const previewItems = items.slice(0, 1);

  return (
    <div className="rounded-3xl border border-slate-100 p-5">
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
            <div className="mt-3 flex flex-wrap gap-2">
              {statusOptions
                .filter((status) => status !== item.status)
                .slice(0, 3)
                .map((status) => (
                  <button
                    key={status}
                    onClick={() => void onStatusChange(item.id, status)}
                    className="rounded-full border border-black/10 px-3 py-1 text-xs"
                  >
                    Mark {status}
                  </button>
                ))}
            </div>
          </div>
        ))}
        {items.length > previewItems.length ? (
          <p className="text-xs text-slate-500">Showing the latest application in this status lane.</p>
        ) : null}
      </div>
    </div>
  );
}
