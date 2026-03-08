"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import api from "@/services/api";
import type { AvailabilitySlot, Booking, Mentor } from "@/types";
import { toIsoDate } from "@/lib/utils";
import toast from "react-hot-toast";

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
        const response = await api.get<{ slots: AvailabilitySlot[] }>(`/mentors/${selectedMentorId}/availability`, {
          params: { date: toIsoDate(date) },
        });
        setSlots(response.data.slots);
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
      const response = await api.post<Booking>("/bookings", {
        mentorId: selectedMentorId,
        date: toIsoDate(date),
        time: selectedSlot,
        topic,
        studentId: 1,
      });
      setBooking(response.data);
      setTopic("");
      toast.success("Booking confirmed.");

      const refreshed = await api.get<{ slots: AvailabilitySlot[] }>(`/mentors/${selectedMentorId}/availability`, {
        params: { date: toIsoDate(date) },
      });
      setSlots(refreshed.data.slots);
      setSelectedSlot(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Could not confirm booking.";
      toast.error(message);
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <h2 className="text-xl font-semibold mb-4">Book Mentor Meeting</h2>

      <label className="block text-sm font-medium mb-2">Select mentor</label>
      <select
        value={selectedMentorId ?? ""}
        onChange={(e) => setSelectedMentorId(Number(e.target.value))}
        className="w-full border rounded-lg px-3 py-2 bg-white"
      >
        {mentors.map((mentor) => (
          <option key={mentor.id} value={mentor.id}>
            {mentor.name} · {mentor.expertise}
          </option>
        ))}
      </select>

      <div className="mt-6">
        <Calendar onChange={(value) => setDate(value as Date)} value={date} />
      </div>

      <div className="mt-6">
        <h3 className="font-medium">Available Slots</h3>
        {loadingSlots ? (
          <p className="text-sm text-gray-500 mt-3">Loading slots...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {slots.map((slot) => (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot.time)}
                className={`border p-2 rounded ${
                  !slot.available
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : selectedSlot === slot.time
                      ? 'bg-[var(--plaksha-teal)] text-white'
                      : 'bg-white'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">Discussion topic</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Add a short agenda for the meeting"
          className="w-full border rounded-lg px-4 py-3 min-h-24"
        />
      </div>

      <button
        onClick={confirmBooking}
        disabled={bookingLoading}
        className="mt-6 w-full bg-[var(--plaksha-gold)] text-black py-3 rounded font-semibold disabled:opacity-70"
      >
        {bookingLoading ? "Confirming..." : "Confirm Booking"}
      </button>

      {booking ? (
        <div className="mt-6 rounded-lg border bg-teal-50 p-4 text-sm">
          <p className="font-semibold text-[var(--plaksha-teal)]">Booking confirmed</p>
          <p className="mt-1">{booking.mentorName}</p>
          <p>{booking.date} · {booking.time}</p>
        </div>
      ) : null}
    </div>
  );
}
