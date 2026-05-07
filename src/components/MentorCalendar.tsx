"use client";

import { useEffect, useState } from "react";

import Calendar from "react-calendar";

import toast from "react-hot-toast";

import { motion } from "framer-motion";

import {
  CalendarDays,
  Clock3,
  Sparkles,
} from "lucide-react";

import {
  apiGet,
  apiPost,
} from "@/services/api";

import type {
  AvailabilitySlot,
  Booking,
  Mentor,
} from "@/types";

import {
  getErrorMessage,
  toIsoDate,
} from "@/lib/utils";

import StatusBadge from "@/components/StatusBadge";

type Props = {
  mentors: Mentor[];
};

export default function MentorCalendar({
  mentors,
}: Props) {
  const [
    selectedMentorId,
    setSelectedMentorId,
  ] = useState<number | null>(null);

  const [date, setDate] =
    useState(new Date());

  const [slots, setSlots] =
    useState<AvailabilitySlot[]>([]);

  const [
    selectedSlot,
    setSelectedSlot,
  ] = useState<string | null>(
    null,
  );

  const [topic, setTopic] =
    useState("");

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [
    bookingLoading,
    setBookingLoading,
  ] = useState(false);

  useEffect(() => {
    if (
      mentors.length > 0 &&
      selectedMentorId === null
    ) {
      setSelectedMentorId(
        mentors[0].id,
      );
    }
  }, [mentors, selectedMentorId]);

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedMentorId) return;

      setLoadingSlots(true);

      setSelectedSlot(null);

      try {
        const response =
          await apiGet<{
            mentorId: number;
            date: string;
            slots: AvailabilitySlot[];
          }>(
            `/mentors/${selectedMentorId}/availability`,
            {
              date: toIsoDate(date),
            },
          );

        setSlots(response.slots);
      } catch (error) {
        console.error(error);

        toast.error(
          "Could not load availability.",
        );
      } finally {
        setLoadingSlots(false);
      }
    }

    void loadAvailability();
  }, [date, selectedMentorId]);

  async function confirmBooking() {
    if (
      !selectedMentorId ||
      !selectedSlot
    ) {
      toast.error(
        "Please select a mentor and slot.",
      );

      return;
    }

    setBookingLoading(true);

    try {
      const response =
        await apiPost<Booking>(
          "/bookings",
          {
            mentorId:
              selectedMentorId,
            date: toIsoDate(date),
            time: selectedSlot,
            topic,
          },
        );

      setBooking(response);

      setTopic("");

      toast.success(
        "Booking confirmed.",
      );

      const refreshed =
        await apiGet<{
          mentorId: number;
          date: string;
          slots: AvailabilitySlot[];
        }>(
          `/mentors/${selectedMentorId}/availability`,
          {
            date: toIsoDate(date),
          },
        );

      setSlots(refreshed.slots);

      setSelectedSlot(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ||
          "Could not confirm booking.",
      );
    } finally {
      setBookingLoading(false);
    }
  }

  const selectedMentor =
    mentors.find(
      (mentor) =>
        mentor.id ===
        selectedMentorId,
    ) || null;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="rounded-[36px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
          <CalendarDays className="h-6 w-6 text-blue-200" />
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-white">
            Book Mentor Meeting
          </h2>

          <p className="mt-1 text-sm text-white/50">
            Schedule personalized
            mentorship sessions
          </p>
        </div>
      </div>

      {/* Mentor Select */}
      <div className="mt-8">
        <label className="mb-3 block text-sm font-medium text-white/70">
          Select mentor
        </label>

        <select
          value={
            selectedMentorId ?? ""
          }
          onChange={(e) =>
            setSelectedMentorId(
              Number(
                e.target.value,
              ),
            )
          }
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none backdrop-blur-xl"
        >
          {mentors.map((mentor) => (
            <option
              key={mentor.id}
              value={mentor.id}
              className="bg-[#0B1120]"
            >
              {mentor.name} ·{" "}
              {mentor.region}
            </option>
          ))}
        </select>
      </div>

      {/* Mentor Info */}
      {selectedMentor ? (
        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {
                  selectedMentor.name
                }
              </h3>

              <p className="mt-1 text-sm text-white/50">
                {
                  selectedMentor.expertise
                }
              </p>
            </div>

            <StatusBadge
              label={
                selectedMentor.region
              }
            />
          </div>

          <p className="mt-4 text-sm leading-7 text-white/60">
            {selectedMentor.bio}
          </p>
        </div>
      ) : null}

      {/* Calendar */}
      <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
        <Calendar
          onChange={(value) =>
            setDate(value as Date)
          }
          value={date}
          className="react-calendar"
        />
      </div>

      {/* Slots */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-blue-200" />

          <h3 className="font-medium text-white">
            Available Slots
          </h3>
        </div>

        {loadingSlots ? (
        <p className="mt-4 text-sm text-white/40">
         Loading availability...
          </p>
          ) : slots.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/40">
          No available slots for this date.
          </div>
            ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {slots.map((slot) => (
              <button
                key={slot.id}
                disabled={
                  !slot.available
                }
                onClick={() =>
                  setSelectedSlot(
                    slot.time,
                  )
                }
                className={`rounded-2xl border px-4 py-3 text-sm transition-all duration-300 ${
                  !slot.available
                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/20"
                    : selectedSlot ===
                        slot.time
                      ? "border-blue-400/30 bg-gradient-to-r from-blue-500 to-violet-500 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Topic */}
      <div className="mt-8">
        <label className="mb-3 block text-sm font-medium text-white/70">
          Discussion topic
        </label>

        <textarea
          value={topic}
          onChange={(e) =>
            setTopic(
              e.target.value,
            )
          }
          placeholder="Add a short agenda for the meeting..."
          className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur-xl"
        />
      </div>

      {/* CTA */}
      <button
        onClick={() =>
          void confirmBooking()
        }
        disabled={bookingLoading}
        className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4 font-semibold text-white transition-all duration-300 hover:scale-[1.01] disabled:opacity-70"
      >
        <Sparkles className="h-4 w-4" />

        {bookingLoading
          ? "Confirming..."
          : "Confirm Booking"}
      </button>

      {/* Success */}
      {booking ? (
        <div className="mt-8 rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-5">
          <div className="text-sm uppercase tracking-[0.22em] text-emerald-300">
            Booking Confirmed
          </div>

          <div className="mt-3 text-lg font-semibold text-white">
            {booking.mentorName}
          </div>

          <div className="mt-2 text-sm text-white/60">
            {booking.date} ·{" "}
            {booking.time}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}