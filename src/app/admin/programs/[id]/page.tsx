"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import StatusBadge from "@/components/StatusBadge";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import type { Deadline, Program } from "@/types";
import { formatIsoDate, getErrorMessage, toIsoDate } from "@/lib/utils";

const PROGRAM_TYPES = ["Exchange", "Research", "Internship", "Summer School"];
const PRIORITIES = ["High", "Medium", "Low"];

const emptyDeadlineForm = {
  title: "Application deadline",
  date: toIsoDate(new Date()),
  officialDeadline: "",
  priority: "High",
  requiredDocuments: [""] as string[],
};

export default function EditProgramPage() {
  const params = useParams();
  const router = useRouter();
  const programId = Number(params.id);

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
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
    tags: "",
    featured: false,
  });

  const [deadlineForm, setDeadlineForm] = useState(emptyDeadlineForm);
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const [savingDeadline, setSavingDeadline] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadProgram() {
    setLoading(true);
    try {
      const data = await apiGet<Program>(`/programs/${programId}`);
      setProgram(data);
      setForm({
        title: data.title,
        university: data.university,
        country: data.country,
        type: data.type,
        description: data.description,
        eligibility: data.eligibility,
        duration: data.duration,
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        externalLink: data.externalLink || "",
        tags: data.tags.join(", "),
        featured: data.featured,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProgram(); }, [programId]);

  async function handleSave() {
    if (!form.title.trim() || !form.university.trim() || !form.country.trim()) {
      toast.error("Title, university, and country are required.");
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/programs/${programId}`, {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        externalLink: form.externalLink || undefined,
      });
      toast.success("Program updated.");
      await loadProgram();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await apiDelete(`/programs/${programId}`);
      toast.success("Program deleted.");
      router.push("/admin/programs");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function startEditDeadline(deadline: Deadline) {
    setEditingDeadlineId(deadline.id);
    setDeadlineForm({
      title: deadline.title,
      date: deadline.date,
      officialDeadline: deadline.officialDeadline || "",
      priority: deadline.priority,
      requiredDocuments: deadline.requiredDocuments.length > 0 ? deadline.requiredDocuments : [""],
    });
  }

  function resetDeadlineForm() {
    setEditingDeadlineId(null);
    setDeadlineForm({ ...emptyDeadlineForm, requiredDocuments: [""] });
  }

  async function handleSaveDeadline() {
    if (!deadlineForm.title.trim() || !deadlineForm.date) {
      toast.error("Deadline title and Plaksha date are required.");
      return;
    }
    setSavingDeadline(true);
    try {
      const payload = {
        programId,
        title: deadlineForm.title.trim(),
        date: deadlineForm.date,
        officialDeadline: deadlineForm.officialDeadline || undefined,
        priority: deadlineForm.priority,
        requiredDocuments: deadlineForm.requiredDocuments.map((d) => d.trim()).filter(Boolean),
      };
      if (editingDeadlineId) {
        await apiPut(`/deadlines/${editingDeadlineId}`, payload);
        toast.success("Deadline updated.");
      } else {
        await apiPost("/deadlines", payload);
        toast.success("Deadline added.");
      }
      resetDeadlineForm();
      await loadProgram();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingDeadline(false);
    }
  }

  async function handleDeleteDeadline(deadlineId: number) {
    try {
      await apiDelete(`/deadlines/${deadlineId}`);
      toast.success("Deadline removed.");
      await loadProgram();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (loading) return <div className="px-6 py-8 text-slate-400">Loading program...</div>;
  if (!program) return (
    <div className="px-6 py-8">
      <p className="text-slate-500">Program not found.</p>
      <Link href="/admin/programs" className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">← Back to programs</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <Link href="/admin/programs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700">
        ← Back to programs
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{program.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{program.university} · {program.country}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={program.type} />
          {program.featured ? <StatusBadge label="Featured" /> : null}
          {program.externalLink ? (
            <a href={program.externalLink} target="_blank" rel="noreferrer"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700">
              Official page ↗
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left — program form */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Basic information</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Program title</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">University</label>
                <input value={form.university} onChange={(e) => set("university", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Country</label>
                <input value={form.country} onChange={(e) => set("country", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Program type</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PROGRAM_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => set("type", t)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${form.type === t ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:border-teal-300"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Details</h2>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Description</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" rows={4} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Eligibility</label>
                <textarea value={form.eligibility} onChange={(e) => set("eligibility", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" rows={2} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Dates & links</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Duration</label>
                <input value={form.duration} onChange={(e) => set("duration", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" placeholder="e.g. 8 weeks" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Start date</label>
                <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">End date</label>
                <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" />
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Official program link</label>
                <input value={form.externalLink} onChange={(e) => set("externalLink", e.target.value)} type="url"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Tags (comma separated)</label>
                <input value={form.tags} onChange={(e) => set("tags", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400" placeholder="e.g. AI, Research, Europe" />
              </div>
            </div>
          </div>

          {/* Deadlines management */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">Deadlines</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {program.deadlines.length}
              </span>
            </div>

            {/* Existing deadlines */}
            {program.deadlines.length > 0 ? (
              <div className="mt-4 space-y-3">
                {program.deadlines.map((deadline) => (
                  <div key={deadline.id} className={`rounded-xl border p-4 ${editingDeadlineId === deadline.id ? "border-teal-200 bg-teal-50" : "border-slate-100 bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{deadline.title}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Plaksha: </span>{formatIsoDate(deadline.date)}
                          </p>
                          {deadline.officialDeadline ? (
                            <p className="text-sm text-slate-500">
                              <span className="font-medium">University: </span>{formatIsoDate(deadline.officialDeadline)}
                            </p>
                          ) : null}
                        </div>
                        {deadline.requiredDocuments.length > 0 ? (
                          <p className="mt-1 text-xs text-slate-400">Files: {deadline.requiredDocuments.join(", ")}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge label={deadline.priority} />
                        <button onClick={() => startEditDeadline(deadline)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-200 hover:text-teal-700">
                          Edit
                        </button>
                        <button onClick={() => void handleDeleteDeadline(deadline.id)}
                          className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No deadlines added yet.</p>
            )}

            {/* Add / Edit deadline form */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-bold text-slate-800">
                {editingDeadlineId ? "Edit deadline" : "Add deadline"}
              </h3>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Deadline title</label>
                  <input
                    value={deadlineForm.title}
                    onChange={(e) => setDeadlineForm((d) => ({ ...d, title: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400"
                    placeholder="e.g. Application deadline"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-600">Required files</p>
                    <button type="button"
                      onClick={() => setDeadlineForm((d) => ({ ...d, requiredDocuments: [...d.requiredDocuments, ""] }))}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-teal-300">
                      + Add file
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {deadlineForm.requiredDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={doc}
                          onChange={(e) => setDeadlineForm((d) => ({
                            ...d,
                            requiredDocuments: d.requiredDocuments.map((v, idx) => idx === i ? e.target.value : v),
                          }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                          placeholder={`File ${i + 1} (e.g. Resume, Transcript)`}
                        />
                        {deadlineForm.requiredDocuments.length > 1 ? (
                          <button type="button"
                            onClick={() => setDeadlineForm((d) => {
                              const next = d.requiredDocuments.filter((_, idx) => idx !== i);
                              return { ...d, requiredDocuments: next.length > 0 ? next : [""] };
                            })}
                            className="rounded-full border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600">
                            ✕
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Plaksha nomination deadline</label>
                    <input type="date" value={deadlineForm.date}
                      onChange={(e) => setDeadlineForm((d) => ({ ...d, date: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Official university deadline (optional)</label>
                    <input type="date" value={deadlineForm.officialDeadline}
                      onChange={(e) => setDeadlineForm((d) => ({ ...d, officialDeadline: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                      <button key={p} type="button" onClick={() => setDeadlineForm((d) => ({ ...d, priority: p }))}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${deadlineForm.priority === p ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:border-teal-300"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => void handleSaveDeadline()} disabled={savingDeadline}
                  className="rounded-full bg-[var(--portal-teal)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {savingDeadline ? "Saving..." : editingDeadlineId ? "Update deadline" : "Add deadline"}
                </button>
                {editingDeadlineId ? (
                  <button type="button" onClick={resetDeadlineForm}
                    className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — save + visibility + danger zone */}
        <div className="self-start space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Visibility</h2>
            <label className="mt-4 flex cursor-pointer items-center gap-3">
              <div onClick={() => set("featured", !form.featured)}
                className={`relative h-6 w-11 rounded-full transition ${form.featured ? "bg-teal-600" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.featured ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">Featured on homepage</span>
            </label>
          </div>

          <button type="button" onClick={() => void handleSave()} disabled={saving}
            className="w-full rounded-full bg-[var(--portal-teal)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
            {saving ? "Saving..." : "Save changes"}
          </button>

          <div className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-rose-700">Danger zone</h2>
            <p className="mt-2 text-sm text-slate-500">Deleting a program also removes all its deadlines and may affect existing applications.</p>
            {confirmDelete ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-rose-700">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void handleDelete()}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="mt-4 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                Delete program
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
