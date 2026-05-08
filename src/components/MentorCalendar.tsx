"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import toast from "react-hot-toast";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { apiGet, apiPost } from "@/services/api";
import type { AvailabilitySlot, Booking, Mentor } from "@/types";
import { getErrorMessage, toIsoDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

type Props = {
  mentors: Mentor[];
  selectedMentorId: number | null;
  onSelectMentor: (id: number) => void;
};

export default function MentorCalendar({ mentors, selectedMentorId, onSelectMentor }: Props) {
  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (mentors.length > 0 && selectedMentorId === null) {
      onSelectMentor(mentors[0].id);
    }
  }, [mentors, selectedMentorId]);

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedMentorId) return;
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const response = await apiGet<{ mentorId: number; date: string; slots: AvailabilitySlot[] }>(
          `/mentors/${selectedMentorId}/availability`,
          { date: toIsoDate(date) },
        );
        setSlots(response.slots);
      } catch (error) {
        console.error(error);
        toast.error("Could not load availability.");
      } finally {
        setLoadingSlots(false);
      }
    }
    void loadAvailability();
  }, [date, selectedMentorId]);

  async function confirmBooking() {
    if (!selectedMentorId || !selectedSlot) {
      toast.error("Please select a mentor and time slot.");
      return;
    }
    setBookingLoading(true);
    try {
      const response = await apiPost<Booking>("/bookings", {
        mentorId: selectedMentorId,
        date: toIsoDate(date),
        time: selectedSlot,
        topic,
      });
      setBooking(response);
      setTopic("");
      toast.success("Booking confirmed.");
      const refreshed = await apiGet<{ mentorId: number; date: string; slots: AvailabilitySlot[] }>(
        `/mentors/${selectedMentorId}/availability`,
        { date: toIsoDate(date) },
      );
      setSlots(refreshed.slots);
      setSelectedSlot(null);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not confirm booking.");
    } finally {
      setBookingLoading(false);
    }
  }

  const selectedMentor = mentors.find((m) => m.id === selectedMentorId) || null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
          <CalendarDays className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Book a mentor session</p>
          <p className="text-sm text-slate-500">Schedule personalised guidance for your global journey</p>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Mentor select */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Select mentor</label>
          <select
            value={selectedMentorId ?? ""}
            onChange={(e) => onSelectMentor(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.name} · {mentor.region}
              </option>
            ))}
          </select>
        </div>

        {/* Selected mentor info */}
        {selectedMentor ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{selectedMentor.name}</p>
                <p className="mt-0.5 text-sm text-slate-600">{selectedMentor.expertise}</p>
              </div>
              <StatusBadge label={selectedMentor.region} />
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{selectedMentor.bio}</p>
          </div>
        ) : null}

        {/* Calendar */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Pick a date</label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Calendar
              onChange={(value) => setDate(value as Date)}
              value={date}
              className="react-calendar"
            />
          </div>
        </div>

        {/* Time slots */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-teal-600" />
            <p className="text-sm font-semibold text-slate-700">Available slots</p>
          </div>

          {loadingSlots ? (
            <p className="text-sm text-slate-400">Loading availability…</p>
          ) : slots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-400">
              No available slots for this date.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    !slot.available
                      ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                      : selectedSlot === slot.time
                        ? "border-teal-300 bg-teal-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Topic */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Discussion topic <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Briefly describe what you'd like to discuss…"
            className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* CTA */}
        <button
          onClick={() => void confirmBooking()}
          disabled={bookingLoading || !selectedSlot}
          className="w-full rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bookingLoading ? "Confirming…" : "Confirm Booking"}
        </button>

        {/* Booking confirmation */}
        {booking ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">Booking Confirmed</p>
            </div>
            <p className="mt-2 font-semibold text-slate-900">{booking.mentorName}</p>
            <p className="mt-0.5 text-sm text-slate-500">{booking.date} · {booking.time}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
