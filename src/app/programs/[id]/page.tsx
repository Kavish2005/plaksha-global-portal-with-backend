"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bookmark, BookmarkCheck, Clock3, GraduationCap, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { apiDelete, apiGet, apiPost } from "@/services/api";
import type { Application, Program } from "@/types";
import { formatIsoDate, getErrorMessage } from "@/lib/utils";

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeUser, loading: authLoading } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [statement, setStatement] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  async function submitApplication() {
    if (!program) return;
    setSubmitting(true);
    try {
      const application = await apiPost<Application>("/applications", {
        programId: program.id,
        statement,
        status: "Submitted",
      });
      setProgram({ ...program, myApplication: application });
      setStatement("");
      toast.success("Application submitted.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
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
    return <div className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading program...</div>;
  }

  if (!program) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Program not found.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={program.type} />
                {program.featured ? <StatusBadge label="Featured" /> : null}
              </div>
              <h1 className="mt-4 text-4xl font-bold">{program.title}</h1>
              <p className="mt-2 text-slate-500">{program.university}</p>
            </div>
            {activeUser?.role === "student" ? (
              <button
                onClick={() => void toggleSaved()}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium"
              >
                {program.isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {program.isSaved ? "Saved" : "Save Program"}
              </button>
            ) : null}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <InfoTile icon={<MapPin size={18} />} label="Country" value={program.country} />
            <InfoTile icon={<GraduationCap size={18} />} label="Eligibility" value={program.eligibility} />
            <InfoTile icon={<Clock3 size={18} />} label="Duration" value={program.duration} />
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Program Overview</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{program.description}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {program.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Deadlines</h2>
            <div className="mt-4 space-y-3">
              {program.deadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                  <div>
                    <p className="font-medium">{deadline.title}</p>
                    <p className="text-sm text-slate-500">{formatIsoDate(deadline.date)}</p>
                  </div>
                  <StatusBadge label={deadline.priority} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Application</h2>
            {activeUser?.role !== "student" ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Switch to a student user from the navbar to apply to this program and see synced dashboard updates.
              </p>
            ) : program.myApplication ? (
              <div className="mt-4 space-y-4">
                <StatusBadge label={program.myApplication.status} />
                <div className="rounded-2xl bg-[var(--portal-panel)] p-4">
                  <p className="text-sm font-medium text-slate-500">Your Statement</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{program.myApplication.statement || "No statement added."}</p>
                </div>
                {program.myApplication.reviewerNotes ? (
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-sm font-medium text-slate-500">Reviewer Notes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{program.myApplication.reviewerNotes}</p>
                  </div>
                ) : null}
                {program.myApplication.nominationNotes ? (
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-sm font-medium text-slate-500">Nomination Notes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{program.myApplication.nominationNotes}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <textarea
                  value={statement}
                  onChange={(event) => setStatement(event.target.value)}
                  placeholder="Why are you a good fit for this program?"
                  className="min-h-40 w-full rounded-2xl border border-black/10 px-4 py-3"
                />
                <button
                  onClick={() => void submitApplication()}
                  disabled={submitting}
                  className="w-full rounded-full bg-[var(--portal-teal)] px-6 py-3 font-semibold text-white disabled:opacity-70"
                >
                  {submitting ? "Submitting..." : "Apply to Program"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Need guidance first?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Book a mentor session to refine fit, application strategy, and documentation before you submit.
            </p>
            <Link href="/mentor" className="mt-4 inline-flex text-sm font-semibold text-[var(--portal-teal)]">
              Go to Mentor Booking
            </Link>
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
      <p className="mt-3 text-sm uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
