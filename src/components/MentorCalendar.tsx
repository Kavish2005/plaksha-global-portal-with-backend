"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { apiGet, apiPost } from "@/services/api";
import type { AvailabilitySlot, Booking, Mentor } from "@/types";
import { getErrorMessage, toIsoDate } from "@/lib/utils";
import toast from "react-hot-toast";
import StatusBadge from "@/components/StatusBadge";

type Props = {
  mentors: Mentor[];
};

export default function MentorCalendar({ mentors }: Props) {
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (mentors.length > 0 && selectedMentorId === null) {
      setSelectedMentorId(mentors[0].id);
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
        console.error("Failed to load availability", error);
        toast.error("Could not load availability.");
      } finally {
        setLoadingSlots(false);
      }
    }

    loadAvailability();
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

  const selectedMentor = mentors.find((mentor) => mentor.id === selectedMentorId) || null;

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">Book Mentor Meeting</h2>

      <label className="mb-2 block text-sm font-medium">Select mentor</label>
      <select
        value={selectedMentorId ?? ""}
        onChange={(e) => setSelectedMentorId(Number(e.target.value))}
        className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3"
      >
        {mentors.map((mentor) => (
          <option key={mentor.id} value={mentor.id}>
            {mentor.name} · {mentor.region}
          </option>
        ))}
      </select>

      {selectedMentor ? (
        <div className="mt-4 rounded-2xl bg-[var(--portal-panel)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[var(--portal-ink)]">{selectedMentor.name}</h3>
              <p className="text-sm text-slate-500">{selectedMentor.expertise}</p>
            </div>
            <StatusBadge label={selectedMentor.region} />
          </div>
          <p className="mt-3 text-sm text-slate-600">{selectedMentor.bio}</p>
        </div>
      ) : null}

      <div className="mt-6">
        <Calendar onChange={(value) => setDate(value as Date)} value={date} />
      </div>

      <div className="mt-6">
        <h3 className="font-medium">Available Slots</h3>
        {loadingSlots ? (
          <p className="mt-3 text-sm text-gray-500">Loading slots...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {slots.map((slot) => (
              <button
                key={slot.id}
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot.time)}
                className={`border p-2 rounded ${
                  !slot.available
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : selectedSlot === slot.time
                      ? "border-[var(--portal-teal)] bg-[var(--portal-teal)] text-white"
                      : "bg-white"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium">Discussion topic</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Add a short agenda for the meeting"
          className="min-h-24 w-full rounded-2xl border border-black/10 px-4 py-3"
        />
      </div>

      <button
        onClick={confirmBooking}
        disabled={bookingLoading}
        className="mt-6 w-full rounded-2xl bg-[var(--portal-gold)] py-3 font-semibold text-[var(--portal-ink)] disabled:opacity-70"
      >
        {bookingLoading ? "Confirming..." : "Confirm Booking"}
      </button>

      {booking ? (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-700">Booking confirmed</p>
          <p className="mt-1">{booking.mentorName}</p>
          <p>{booking.date} · {booking.time}</p>
        </div>
      ) : null}
    </div>
  );
}
