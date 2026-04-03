"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import type {
  AdminDashboard,
  Application,
  ApplicationStatus,
  ApprovalQueue,
  Deadline,
  Mentor,
  Nomination,
  Program,
} from "@/types";
import { formatIsoDate, getErrorMessage, toIsoDate } from "@/lib/utils";

export type AdminSectionKey = "overview" | "programs" | "mentors" | "deadlines" | "applications";

type ProgramFormState = {
  title: string;
  university: string;
  country: string;
  type: string;
  description: string;
  eligibility: string;
  duration: string;
  featured: boolean;
  tags: string;
};

type MentorFormState = {
  name: string;
  expertise: string;
  bio: string;
  region: string;
};

const emptyProgramForm: ProgramFormState = {
  title: "",
  university: "",
  country: "",
  type: "Exchange",
  description: "",
  eligibility: "",
  duration: "",
  featured: false,
  tags: "",
};

const emptyMentorForm: MentorFormState = {
  name: "",
  expertise: "",
  bio: "",
  region: "",
};

const statusOptions: ApplicationStatus[] = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Nominated"];

export default function AdminClient({ section }: { section: AdminSectionKey }) {
  const { activeUser, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueue | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormState>(emptyProgramForm);

  const [editingMentorId, setEditingMentorId] = useState<number | null>(null);
  const [mentorForm, setMentorForm] = useState<MentorFormState>(emptyMentorForm);

  const [availabilityMentorId, setAvailabilityMentorId] = useState<number | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState(toIsoDate(new Date()));
  const [availabilitySlot, setAvailabilitySlot] = useState("10:00 AM");
  const [availabilitySlots, setAvailabilitySlots] = useState<Array<{ id: number; time: string; available: boolean; date: string }>>([]);

  const [deadlineProgramId, setDeadlineProgramId] = useState<number | null>(null);
  const [deadlineTitle, setDeadlineTitle] = useState("Application deadline");
  const [deadlineDate, setDeadlineDate] = useState(toIsoDate(new Date()));
  const [deadlinePriority, setDeadlinePriority] = useState("High");

  const [applicationFilter, setApplicationFilter] = useState({ student: "", program: "", status: "" });

  async function loadAllData() {
    setLoading(true);
    try {
      const [nextDashboard, nextQueue, nextPrograms, nextMentors, nextApplications, nextNominations] = await Promise.all([
        apiGet<AdminDashboard>("/admin/dashboard"),
        apiGet<ApprovalQueue>("/admin/approval-queue"),
        apiGet<Program[]>("/programs"),
        apiGet<Mentor[]>("/mentors"),
        apiGet<Application[]>("/applications", applicationFilter),
        apiGet<Nomination[]>("/nominations"),
      ]);

      setDashboard(nextDashboard);
      setApprovalQueue(nextQueue);
      setPrograms(nextPrograms);
      setMentors(nextMentors);
      setApplications(nextApplications);
      setNominations(nextNominations);

      if (!availabilityMentorId && nextMentors[0]) {
        setAvailabilityMentorId(nextMentors[0].id);
      }

      if (!deadlineProgramId && nextPrograms[0]) {
        setDeadlineProgramId(nextPrograms[0].id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (activeUser?.role !== "admin") {
      setLoading(false);
      return;
    }
    void loadAllData();
  }, [activeUser, authLoading]);

  useEffect(() => {
    if (authLoading || activeUser?.role !== "admin") return;
    void loadAllData();
  }, [applicationFilter]);

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

    if (activeUser?.role === "admin") {
      void loadAvailability();
    }
  }, [activeUser, availabilityDate, availabilityMentorId]);

  const allDeadlines = useMemo<Deadline[]>(
    () => programs.flatMap((program) => program.deadlines.map((deadline) => ({ ...deadline, programTitle: program.title }))),
    [programs],
  );

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
      };
      if (editingProgramId) {
        await apiPut(`/programs/${editingProgramId}`, payload);
        toast.success("Program updated.");
      } else {
        await apiPost(`/programs`, payload);
        toast.success("Program created.");
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
      await loadAllData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

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
      await apiPost("/deadlines", {
        programId: deadlineProgramId,
        title: deadlineTitle,
        date: deadlineDate,
        priority: deadlinePriority,
      });
      toast.success("Deadline created.");
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

  if (authLoading) {
    return <LoadingState label="Loading admin workspace..." />;
  }

  if (activeUser?.role !== "admin") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Admin access only</h1>
          <p className="mt-3 text-slate-600">
            Switch to the seeded Global Engagement Officer user from the navbar to manage programs, mentors, availability, and approval workflows.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !dashboard || !approvalQueue) {
    return <LoadingState label="Loading admin workspace..." />;
  }

  return (
    <section className="space-y-8">
      {section === "overview" ? (
        <OverviewSection dashboard={dashboard} approvalQueue={approvalQueue} nominations={nominations} />
      ) : null}

      {section === "programs" ? (
        <ProgramsSection
          programs={programs}
          programForm={programForm}
          editingProgramId={editingProgramId}
          onProgramFormChange={setProgramForm}
          onSubmit={submitProgram}
          onReset={resetProgramForm}
          onEdit={(program) => {
            setEditingProgramId(program.id);
            setProgramForm({
              title: program.title,
              university: program.university,
              country: program.country,
              type: program.type,
              description: program.description,
              eligibility: program.eligibility,
              duration: program.duration,
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
          mentorForm={mentorForm}
          editingMentorId={editingMentorId}
          availabilityMentorId={availabilityMentorId}
          availabilityDate={availabilityDate}
          availabilitySlot={availabilitySlot}
          availabilitySlots={availabilitySlots}
          onMentorFormChange={setMentorForm}
          onSubmit={submitMentor}
          onReset={resetMentorForm}
          onEdit={(mentor) => {
            setEditingMentorId(mentor.id);
            setMentorForm({
              name: mentor.name,
              expertise: mentor.expertise,
              bio: mentor.bio,
              region: mentor.region,
            });
          }}
          onDelete={deleteMentor}
          onAvailabilityMentorIdChange={setAvailabilityMentorId}
          onAvailabilityDateChange={setAvailabilityDate}
          onAvailabilitySlotChange={setAvailabilitySlot}
          onCreateAvailability={createAvailability}
          onDeleteAvailability={deleteAvailability}
        />
      ) : null}

      {section === "deadlines" ? (
        <DeadlinesSection
          programs={programs}
          allDeadlines={allDeadlines}
          deadlineProgramId={deadlineProgramId}
          deadlineTitle={deadlineTitle}
          deadlineDate={deadlineDate}
          deadlinePriority={deadlinePriority}
          onProgramChange={setDeadlineProgramId}
          onTitleChange={setDeadlineTitle}
          onDateChange={setDeadlineDate}
          onPriorityChange={setDeadlinePriority}
          onCreate={createDeadline}
          onDelete={deleteDeadline}
        />
      ) : null}

      {section === "applications" ? (
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
          description="Keep track of the next partner-facing and student-facing milestones."
        >
          <div className="space-y-3">
            {dashboard.upcomingDeadlines.map((deadline) => (
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
        </AdminSection>

        <AdminSection
          eyebrow="Queue"
          title="Approval snapshot"
          description="A quick view into applications that need movement across the review pipeline."
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
        description="Recent partner nominations made by the office."
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

function ProgramsSection({
  programs,
  programForm,
  editingProgramId,
  onProgramFormChange,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
}: {
  programs: Program[];
  programForm: ProgramFormState;
  editingProgramId: number | null;
  onProgramFormChange: React.Dispatch<React.SetStateAction<ProgramFormState>>;
  onSubmit: () => Promise<void>;
  onReset: () => void;
  onEdit: (program: Program) => void;
  onDelete: (programId: number) => Promise<void>;
}) {
  return (
      <AdminSection
        eyebrow="Programs"
        title="Programs management"
        description="Add new opportunities, update program information, or remove listings that should no longer appear for students."
      >
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
          <h3 className="text-xl font-semibold">{editingProgramId ? "Edit program" : "Create program"}</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={programForm.title} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, title: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Title" />
            <input value={programForm.university} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, university: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="University" />
            <input value={programForm.country} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, country: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Country" />
            <select value={programForm.type} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, type: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3">
              <option>Exchange</option>
              <option>Research</option>
              <option>Internship</option>
              <option>Summer School</option>
            </select>
          </div>
          <textarea value={programForm.description} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, description: e.target.value }))} className="mt-3 min-h-28 w-full rounded-2xl border border-black/10 px-4 py-3" placeholder="Description" />
          <textarea value={programForm.eligibility} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, eligibility: e.target.value }))} className="mt-3 min-h-20 w-full rounded-2xl border border-black/10 px-4 py-3" placeholder="Eligibility" />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input value={programForm.duration} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, duration: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Duration" />
            <input value={programForm.tags} onChange={(e) => onProgramFormChange((prev) => ({ ...prev, tags: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Tags, comma separated" />
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

        <div className="space-y-3">
          {programs.map((program) => (
            <div key={program.id} className="rounded-3xl border border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{program.title}</p>
                    <StatusBadge label={program.type} />
                    {program.featured ? <StatusBadge label="Featured" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{program.university} · {program.country}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{program.description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => onEdit(program)} className="rounded-full border border-black/10 px-4 py-2 text-sm">
                    Edit
                  </button>
                  <button onClick={() => void onDelete(program.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminSection>
  );
}

function MentorsSection({
  mentors,
  mentorForm,
  editingMentorId,
  availabilityMentorId,
  availabilityDate,
  availabilitySlot,
  availabilitySlots,
  onMentorFormChange,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
  onAvailabilityMentorIdChange,
  onAvailabilityDateChange,
  onAvailabilitySlotChange,
  onCreateAvailability,
  onDeleteAvailability,
}: {
  mentors: Mentor[];
  mentorForm: MentorFormState;
  editingMentorId: number | null;
  availabilityMentorId: number | null;
  availabilityDate: string;
  availabilitySlot: string;
  availabilitySlots: Array<{ id: number; time: string; available: boolean; date: string }>;
  onMentorFormChange: React.Dispatch<React.SetStateAction<MentorFormState>>;
  onSubmit: () => Promise<void>;
  onReset: () => void;
  onEdit: (mentor: Mentor) => void;
  onDelete: (mentorId: number) => Promise<void>;
  onAvailabilityMentorIdChange: React.Dispatch<React.SetStateAction<number | null>>;
  onAvailabilityDateChange: React.Dispatch<React.SetStateAction<string>>;
  onAvailabilitySlotChange: React.Dispatch<React.SetStateAction<string>>;
  onCreateAvailability: () => Promise<void>;
  onDeleteAvailability: (slotId: number) => Promise<void>;
}) {
  return (
    <AdminSection
      eyebrow="Mentors"
      title="Mentor and availability management"
      description="Maintain advisor profiles and directly control which slots appear in the student booking flow."
    >
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
            <h3 className="text-xl font-semibold">{editingMentorId ? "Edit mentor" : "Create mentor"}</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input value={mentorForm.name} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, name: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Mentor name" />
              <input value={mentorForm.expertise} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, expertise: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Expertise" />
            </div>
            <input value={mentorForm.region} onChange={(e) => onMentorFormChange((prev) => ({ ...prev, region: e.target.value }))} className="mt-3 w-full rounded-2xl border border-black/10 px-4 py-3" placeholder="Support domain / region" />
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

          <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
            <h3 className="text-xl font-semibold">Availability controls</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <select value={availabilityMentorId ?? ""} onChange={(e) => onAvailabilityMentorIdChange(Number(e.target.value))} className="rounded-2xl border border-black/10 px-4 py-3">
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </option>
                ))}
              </select>
              <input type="date" value={availabilityDate} onChange={(e) => onAvailabilityDateChange(e.target.value)} className="rounded-2xl border border-black/10 px-4 py-3" />
              <input value={availabilitySlot} onChange={(e) => onAvailabilitySlotChange(e.target.value)} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="10:00 AM" />
            </div>
            <button onClick={() => void onCreateAvailability()} className="mt-4 rounded-full bg-[var(--portal-gold)] px-5 py-3 text-sm font-semibold text-[var(--portal-ink)]">
              Add Slot
            </button>

            <div className="mt-5 space-y-2">
              {availabilitySlots.map((slot) => (
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
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="rounded-3xl border border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{mentor.name}</p>
                    <StatusBadge label={mentor.region} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{mentor.expertise}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{mentor.bio}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => onEdit(mentor)} className="rounded-full border border-black/10 px-4 py-2 text-sm">
                    Edit
                  </button>
                  <button onClick={() => void onDelete(mentor.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminSection>
  );
}

function DeadlinesSection({
  programs,
  allDeadlines,
  deadlineProgramId,
  deadlineTitle,
  deadlineDate,
  deadlinePriority,
  onProgramChange,
  onTitleChange,
  onDateChange,
  onPriorityChange,
  onCreate,
  onDelete,
}: {
  programs: Program[];
  allDeadlines: Deadline[];
  deadlineProgramId: number | null;
  deadlineTitle: string;
  deadlineDate: string;
  deadlinePriority: string;
  onProgramChange: React.Dispatch<React.SetStateAction<number | null>>;
  onTitleChange: React.Dispatch<React.SetStateAction<string>>;
  onDateChange: React.Dispatch<React.SetStateAction<string>>;
  onPriorityChange: React.Dispatch<React.SetStateAction<string>>;
  onCreate: () => Promise<void>;
  onDelete: (deadlineId: number) => Promise<void>;
}) {
  return (
    <AdminSection
      eyebrow="Deadlines"
      title="Deadline management"
      description="Create and prioritize milestone dates that instantly propagate to student program pages and dashboards."
    >
      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl bg-[var(--portal-panel)] p-6">
          <h3 className="text-xl font-semibold">Create deadline</h3>
          <div className="mt-5 grid gap-3">
            <select value={deadlineProgramId ?? ""} onChange={(e) => onProgramChange(Number(e.target.value))} className="rounded-2xl border border-black/10 px-4 py-3">
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title}
                </option>
              ))}
            </select>
            <input value={deadlineTitle} onChange={(e) => onTitleChange(e.target.value)} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Deadline title" />
            <input type="date" value={deadlineDate} onChange={(e) => onDateChange(e.target.value)} className="rounded-2xl border border-black/10 px-4 py-3" />
            <select value={deadlinePriority} onChange={(e) => onPriorityChange(e.target.value)} className="rounded-2xl border border-black/10 px-4 py-3">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <button onClick={() => void onCreate()} className="mt-4 rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white">
            Create Deadline
          </button>
        </div>

        <div className="space-y-3">
          {allDeadlines.map((deadline) => (
            <div key={deadline.id} className="flex flex-col gap-3 rounded-3xl border border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold">{deadline.programTitle}</p>
                <p className="text-sm text-slate-500">{deadline.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{formatIsoDate(deadline.date)}</span>
                <StatusBadge label={deadline.priority} />
                <button onClick={() => void onDelete(deadline.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
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
  return (
    <>
      <AdminSection
        eyebrow="Approval Queue"
        title="Review workflow"
        description="Move applications across statuses without losing context, and keep student dashboards in sync."
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
        description="Filter, annotate, approve, reject, and nominate student applications from a focused office review space."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <input value={applicationFilter.student} onChange={(e) => onApplicationFilterChange((prev) => ({ ...prev, student: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Filter by student" />
          <input value={applicationFilter.program} onChange={(e) => onApplicationFilterChange((prev) => ({ ...prev, program: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3" placeholder="Filter by program" />
          <select value={applicationFilter.status} onChange={(e) => onApplicationFilterChange((prev) => ({ ...prev, status: e.target.value }))} className="rounded-2xl border border-black/10 px-4 py-3">
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-5">
          {applications.map((application) => (
            <div key={application.id} className="rounded-3xl border border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold">{application.programTitle}</p>
                    <StatusBadge label={application.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {application.studentName} · {application.studentEmail}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{application.statement || "No statement provided."}</p>
                </div>
                <select
                  value={application.status}
                  onChange={(e) => void onStatusChange(application.id, e.target.value as ApplicationStatus)}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[var(--portal-ink)]">{value}</p>
    </div>
  );
}

function QueueSummary({ title, items }: { title: string; items: Application[] }) {
  return (
    <div className="rounded-3xl bg-[var(--portal-panel)] p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <span className="text-sm text-slate-500">{items.length}</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-2xl bg-white p-3">
            <p className="font-medium">{item.programTitle}</p>
            <p className="text-sm text-slate-500">{item.studentName}</p>
          </div>
        ))}
      </div>
    </div>
  );
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
  return (
    <div className="rounded-3xl border border-slate-100 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-slate-500">{items.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-[var(--portal-panel)] p-4">
            <p className="font-medium">{item.programTitle}</p>
            <p className="mt-1 text-sm text-slate-500">{item.studentName}</p>
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
      </div>
    </div>
  );
}
