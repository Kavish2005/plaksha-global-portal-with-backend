"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import type { Mentor } from "@/types";
import { formatIsoDate, getErrorMessage, toIsoDate } from "@/lib/utils";

type Slot = {
  id: number;
  time: string;
  available: boolean;
  date: string;
};

const DAYS_OF_WEEK = [
  { label: "Mon", index: 1 },
  { label: "Tue", index: 2 },
  { label: "Wed", index: 3 },
  { label: "Thu", index: 4 },
  { label: "Fri", index: 5 },
  { label: "Sat", index: 6 },
  { label: "Sun", index: 0 },
];

function threeMonthsFromNow(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return toIsoDate(d);
}

function getMatchingDates(from: string, to: string, dayIndices: number[]): string[] {
  if (!from || !to || dayIndices.length === 0) return [];
  const result: string[] = [];
  const end = new Date(`${to}T00:00:00`);
  const current = new Date(`${from}T00:00:00`);
  while (current <= end) {
    if (dayIndices.includes(current.getDay())) {
      result.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export default function MentorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mentorId = Number(id);
  const router = useRouter();
  const { activeUser } = useAuth();
  const isAdmin = activeUser?.role === "admin";
  const isMentorUser = activeUser?.role === "mentor";

  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    expertise: "",
    region: "",
    bio: "",
  });

  // Single-date view
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [newSlotTime, setNewSlotTime] = useState("10:00");
  const [addingSlot, setAddingSlot] = useState(false);

  // Batch for selected date
  const [batchStart, setBatchStart] = useState("09:00");
  const [batchEnd, setBatchEnd] = useState("17:00");
  const [batchInterval, setBatchInterval] = useState("30");
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // Recurring slots
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurringFrom, setRecurringFrom] = useState(toIsoDate(new Date()));
  const [recurringTo, setRecurringTo] = useState(threeMonthsFromNow);
  const [recurringStart, setRecurringStart] = useState("09:00");
  const [recurringEnd, setRecurringEnd] = useState("17:00");
  const [recurringInterval, setRecurringInterval] = useState("30");
  const [recurringProgress, setRecurringProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const m = await apiGet<Mentor>(`/mentors/${mentorId}`);
        setMentor(m);
        setForm({
          name: m.name,
          email: m.email,
          expertise: m.expertise,
          region: m.region,
          bio: m.bio,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [mentorId]);

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await apiGet<{ slots: Slot[] }>(
          `/mentors/${mentorId}/availability`,
          { date: selectedDate },
        );
        setSlots(res.slots);
      } catch {
        setSlots([]);
      }
    }
    void loadSlots();
  }, [mentorId, selectedDate]);

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(index: number) {
    setRecurringDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index],
    );
  }

  async function refreshSlots() {
    const res = await apiGet<{ slots: Slot[] }>(
      `/mentors/${mentorId}/availability`,
      { date: selectedDate },
    );
    setSlots(res.slots);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiPut<Mentor>(`/mentors/${mentorId}`, form);
      setMentor(updated);
      toast.success("Mentor updated.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiDelete(`/mentors/${mentorId}`);
      toast.success("Mentor deleted.");
      router.push("/admin/mentors");
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleting(false);
    }
  }

  async function handleAddSlot() {
    if (!newSlotTime) return;
    setAddingSlot(true);
    try {
      await apiPost("/availability", { mentorId, date: selectedDate, slot: newSlotTime });
      await refreshSlots();
      toast.success("Slot added.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAddingSlot(false);
    }
  }

  async function handleBatch() {
    setGeneratingBatch(true);
    try {
      const result = await apiPost<{ createdCount: number; skippedCount: number }>(
        "/availability",
        {
          mentorId,
          date: selectedDate,
          startTime: batchStart,
          endTime: batchEnd,
          intervalMinutes: Number(batchInterval),
        },
      );
      await refreshSlots();
      toast.success(
        `${result.createdCount} slot${result.createdCount !== 1 ? "s" : ""} created${result.skippedCount > 0 ? `, ${result.skippedCount} skipped` : ""}.`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setGeneratingBatch(false);
    }
  }

  async function handleRecurring() {
    if (recurringDays.length === 0) {
      toast.error("Select at least one day of the week.");
      return;
    }
    const dates = getMatchingDates(recurringFrom, recurringTo, recurringDays);
    if (dates.length === 0) {
      toast.error("No matching dates found in the selected range.");
      return;
    }

    setRecurringProgress({ current: 0, total: dates.length });
    try {
      const result = await apiPost<{ createdCount: number; skippedCount: number; dateCount: number }>(
        "/availability/bulk-recurring",
        {
          mentorId,
          dates,
          startTime: recurringStart,
          endTime: recurringEnd,
          intervalMinutes: Number(recurringInterval),
        },
      );
      setRecurringProgress({ current: dates.length, total: dates.length });
      await refreshSlots();
      setRecurringProgress(null);
      toast.success(
        `Done — ${result.createdCount} slot${result.createdCount !== 1 ? "s" : ""} created across ${result.dateCount} date${result.dateCount !== 1 ? "s" : ""}${result.skippedCount > 0 ? ` (${result.skippedCount} skipped)` : ""}.`,
      );
    } catch (error) {
      setRecurringProgress(null);
      toast.error(getErrorMessage(error));
    }
  }

  async function handleRemoveSlot(slotId: number) {
    try {
      await apiDelete(`/availability/${slotId}`);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast.success("Slot removed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) => {
        const toMin = (t: string) => {
          const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!m) return 0;
          let h = Number(m[1]);
          const min = Number(m[2]);
          const mer = m[3].toUpperCase();
          if (mer === "AM" && h === 12) h = 0;
          if (mer === "PM" && h !== 12) h += 12;
          return h * 60 + min;
        };
        return toMin(a.time) - toMin(b.time);
      }),
    [slots],
  );

  const recurringMatchingDates = useMemo(
    () => getMatchingDates(recurringFrom, recurringTo, recurringDays),
    [recurringFrom, recurringTo, recurringDays],
  );

  const availableCount = sortedSlots.filter((s) => s.available).length;
  const bookedCount = sortedSlots.length - availableCount;

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        <p className="text-slate-500">Mentor not found.</p>
        <Link
          href="/admin/mentors"
          className="mt-4 inline-block text-sm font-medium text-teal-600 hover:underline"
        >
          ← Back to mentors
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <Link
        href="/admin/mentors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
      >
        ← Back to mentors
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{mentor.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{mentor.email}</p>
        </div>
        <span className="mt-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {mentor.region}
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Profile form — admin only */}
          {isAdmin ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Profile</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Full name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Email address</label>
                  <input
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    type="email"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Expertise</label>
                  <input
                    value={form.expertise}
                    onChange={(e) => setField("expertise", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Region / support domain</label>
                  <input
                    value={form.region}
                    onChange={(e) => setField("region", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setField("bio", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                  rows={4}
                />
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-full bg-[var(--portal-teal)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Single-date availability ─────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Availability — single date</h2>
            <p className="mt-1 text-sm text-slate-500">
              View and manage slots for one specific day.
            </p>

            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Select date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {sortedSlots.length} total
              </span>
              {availableCount > 0 ? (
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                  {availableCount} available
                </span>
              ) : null}
              {bookedCount > 0 ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {bookedCount} booked
                </span>
              ) : null}
            </div>

            {sortedSlots.length > 0 ? (
              <div className="mt-4 space-y-2">
                {sortedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-800">{slot.time}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          slot.available
                            ? "bg-teal-50 text-teal-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {slot.available ? "Available" : "Booked"}
                      </span>
                    </div>
                    {slot.available ? (
                      <button
                        type="button"
                        onClick={() => void handleRemoveSlot(slot.id)}
                        className="text-xs font-medium text-rose-500 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                No slots for this date.
              </p>
            )}

            {/* Add single slot */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-700">Add one slot</h3>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={() => void handleAddSlot()}
                  disabled={addingSlot}
                  className="rounded-full bg-[var(--portal-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--portal-ink)] hover:opacity-90 disabled:opacity-60"
                >
                  {addingSlot ? "Adding..." : "Add Slot"}
                </button>
              </div>
            </div>

            {/* Batch for selected date */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-700">
                Batch generate — this date only
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Fill a time block for the selected date above.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Start</label>
                  <input
                    type="time"
                    value={batchStart}
                    onChange={(e) => setBatchStart(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-teal-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">End</label>
                  <input
                    type="time"
                    value={batchEnd}
                    onChange={(e) => setBatchEnd(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-teal-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Interval</label>
                  <select
                    value={batchInterval}
                    onChange={(e) => setBatchInterval(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-teal-400"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleBatch()}
                disabled={generatingBatch}
                className="mt-4 rounded-full bg-[var(--portal-teal)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {generatingBatch ? "Generating..." : "Generate For This Day"}
              </button>
            </div>
          </div>

          {/* ── Recurring slots ──────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Recurring slots</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick days of the week and a date range — slots are generated for every matching date
              in one go.
            </p>

            {/* Day picker */}
            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Repeat on</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.index}
                    type="button"
                    onClick={() => toggleDay(day.index)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      recurringDays.includes(day.index)
                        ? "bg-teal-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:border-teal-300"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">From date</label>
                <input
                  type="date"
                  value={recurringFrom}
                  onChange={(e) => setRecurringFrom(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">To date</label>
                <input
                  type="date"
                  value={recurringTo}
                  onChange={(e) => setRecurringTo(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {/* Time window + interval */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Start time</label>
                <input
                  type="time"
                  value={recurringStart}
                  onChange={(e) => setRecurringStart(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">End time</label>
                <input
                  type="time"
                  value={recurringEnd}
                  onChange={(e) => setRecurringEnd(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Interval</label>
                <select
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-400"
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            {recurringMatchingDates.length > 0 ? (
              <p className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                Will generate slots for{" "}
                <span className="font-semibold">{recurringMatchingDates.length} date{recurringMatchingDates.length !== 1 ? "s" : ""}</span>
                {recurringMatchingDates.length <= 6
                  ? `: ${recurringMatchingDates.map((d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })).join(", ")}`
                  : ` (${new Date(`${recurringMatchingDates[0]}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} → ${new Date(`${recurringMatchingDates[recurringMatchingDates.length - 1]}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Select at least one day and a valid date range to preview.
              </p>
            )}

            {/* Progress bar */}
            {recurringProgress ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Processing date {recurringProgress.current} of {recurringProgress.total}…
                  </span>
                  <span>
                    {Math.round((recurringProgress.current / recurringProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all"
                    style={{
                      width: `${(recurringProgress.current / recurringProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleRecurring()}
              disabled={!!recurringProgress || recurringMatchingDates.length === 0}
              className="mt-5 rounded-full bg-[var(--portal-teal)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {recurringProgress
                ? `Generating… (${recurringProgress.current}/${recurringProgress.total})`
                : "Generate Recurring Slots"}
            </button>
          </div>

        </div>

        {/* Sidebar */}
        <div className="self-start space-y-4">
          {/* Profile summary — mentor user view */}
          {!isAdmin ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Your profile</h2>
              <div className="mt-3 space-y-0.5">
                <p className="text-sm font-semibold text-slate-900">{mentor.name}</p>
                <p className="text-sm text-slate-500">{mentor.expertise}</p>
                <p className="text-xs text-slate-400">{mentor.email}</p>
              </div>
              {mentor.bio ? (
                <p className="mt-3 text-sm text-slate-500">{mentor.bio}</p>
              ) : null}
            </div>
          ) : null}

          {/* Date summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Selected date</h2>
            <p className="mt-3 text-3xl font-bold text-teal-700">{availableCount}</p>
            <p className="text-sm text-slate-500">
              available slot{availableCount !== 1 ? "s" : ""}
            </p>
            {bookedCount > 0 ? (
              <p className="mt-1 text-sm font-medium text-amber-600">{bookedCount} booked</p>
            ) : null}
          </div>

          {/* Recurring summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Recurring preview</h2>
            <p className="mt-3 text-3xl font-bold text-slate-800">{recurringMatchingDates.length}</p>
            <p className="text-sm text-slate-500">matching date{recurringMatchingDates.length !== 1 ? "s" : ""}</p>
            {recurringDays.length > 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                {DAYS_OF_WEEK.filter((d) => recurringDays.includes(d.index))
                  .map((d) => d.label)
                  .join(", ")}
              </p>
            ) : null}
          </div>

          {/* Danger zone — admin only */}
          {isAdmin ? (
            <div className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-rose-600">Danger zone</h2>
              {!confirmDelete ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">
                    Permanently delete this mentor and all their availability slots.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="mt-4 w-full rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Delete mentor
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-medium text-rose-600">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="flex-1 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
