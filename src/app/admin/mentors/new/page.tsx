"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiPost } from "@/services/api";
import type { Mentor } from "@/types";
import { getErrorMessage } from "@/lib/utils";

const DEMO_MENTOR = {
  name: "Dr. Preethi Krishnaswamy",
  email: "preethi.krishnaswamy@plaksha.edu.in",
  expertise: "North America and Singapore Research Programs",
  region: "North America and Asia-Pacific",
  bio: "Advises students on research internship applications across North America and Asia. Specialises in lab-based programs including Mitacs Globalink, CMU RISS, and NUS UROP. Former research advisor at IIT Delhi with experience in international student placement and research mentorship.",
};

export default function NewMentorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    expertise: "",
    region: "",
    bio: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiPost<Mentor>("/mentors", form);
      toast.success("Mentor created.");
      router.push(`/admin/mentors/${created.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <Link
        href="/admin/mentors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
      >
        ← Back to mentors
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add mentor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new advisor profile. You can manage their availability after saving.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(DEMO_MENTOR)}
          className="rounded-full border border-dashed border-teal-400 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
        >
          ✦ Fill demo data
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Mentor details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Full name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                placeholder="e.g. Dr. Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Email address</label>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                type="email"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                placeholder="advisor@plaksha.edu.in"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Expertise</label>
              <input
                value={form.expertise}
                onChange={(e) => set("expertise", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                placeholder="e.g. Europe and Summer Mobility"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Region / support domain</label>
              <input
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                placeholder="e.g. Europe and Summer"
              />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
              rows={4}
              placeholder="Short description of this advisor's background and focus areas..."
            />
          </div>
        </div>

        <div className="self-start space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Availability</h2>
            <p className="mt-2 text-sm text-slate-500">
              You can add availability slots after the mentor profile is created.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="w-full rounded-full bg-[var(--portal-teal)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create Mentor"}
          </button>
          <Link
            href="/admin/mentors"
            className="block w-full rounded-full border border-slate-200 px-6 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
