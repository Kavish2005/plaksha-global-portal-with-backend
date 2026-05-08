"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiPost } from "@/services/api";
import type { Program } from "@/types";
import { getErrorMessage } from "@/lib/utils";

const PROGRAM_TYPES = ["Exchange", "Research", "Internship", "Summer School"];

export default function NewProgramPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.university.trim() || !form.country.trim()) {
      toast.error("Title, university, and country are required.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiPost<Program>("/programs", {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        externalLink: form.externalLink || undefined,
      });
      toast.success("Program created.");
      router.push(`/admin/programs/${created.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <Link href="/admin/programs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700">
        ← Back to programs
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-slate-900">Add program</h1>
        <p className="mt-1 text-sm text-slate-500">Fill in the program details. You can add deadlines after saving.</p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Main form */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Basic information</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Program title</label>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  placeholder="e.g. Stanford Summer Research"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">University</label>
                <input
                  value={form.university}
                  onChange={(e) => set("university", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  placeholder="e.g. Stanford University"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Country</label>
                <input
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  placeholder="e.g. USA"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Program type</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PROGRAM_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("type", t)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        form.type === t
                          ? "bg-teal-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:border-teal-300"
                      }`}
                    >
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
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  rows={4}
                  placeholder="Describe what the program offers..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Eligibility</label>
                <textarea
                  value={form.eligibility}
                  onChange={(e) => set("eligibility", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  rows={2}
                  placeholder="Who can apply..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Dates & links</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Duration</label>
                <input
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  placeholder="e.g. 8 weeks"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Program start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Program end date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Official program link</label>
                <input
                  value={form.externalLink}
                  onChange={(e) => set("externalLink", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Tags (comma separated)</label>
                <input
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  placeholder="e.g. AI, Research, Europe"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="self-start space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Visibility</h2>
            <label className="mt-4 flex cursor-pointer items-center gap-3">
              <div
                onClick={() => set("featured", !form.featured)}
                className={`relative h-6 w-11 rounded-full transition ${form.featured ? "bg-teal-600" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.featured ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">Featured on homepage</span>
            </label>
            <p className="mt-2 text-xs text-slate-400">Featured programs appear at the top of the student programs page.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Deadlines</h2>
            <p className="mt-2 text-sm text-slate-500">You can add deadlines (Plaksha + university dates) after the program is saved.</p>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="w-full rounded-full bg-[var(--portal-teal)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create Program"}
          </button>
          <Link
            href="/admin/programs"
            className="block w-full rounded-full border border-slate-200 px-6 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
