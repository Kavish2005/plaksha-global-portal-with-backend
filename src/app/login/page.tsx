"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import toast from "react-hot-toast";

import { motion } from "framer-motion";

import {
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Building2,
  Sparkles,
  BrainCircuit,
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";

import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();

  const {
    adminOptions,
    mentorOptions,
    reviewerOptions,
    login,
    loading,
  } = useAuth();

  const [role, setRole] =
    useState<
      "student" | "admin" | "mentor" | "reviewer"
    >("student");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const adminEmails = useMemo(
    () =>
      adminOptions.map(
        (admin) => admin.email,
      ),
    [adminOptions],
  );

  const mentorEmails = useMemo(
    () =>
      mentorOptions.map(
        (mentor) => mentor.email,
      ),
    [mentorOptions],
  );

  const reviewerEmails = useMemo(
    () =>
      reviewerOptions.map(
        (reviewer) => reviewer.email,
      ),
    [reviewerOptions],
  );

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);

    try {
      const user = await login({
        role,
        email,
        ...(role === "student"
          ? { name }
          : {}),
      });

      toast.success(
        `Welcome, ${user.name}.`,
      );

      router.replace(
        user.role === "student"
          ? "/"
          : user.role === "admin"
            ? "/admin"
            : user.role === "mentor"
              ? "/admin/mentors"
              : "/dashboard",
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-16">
      {/* Ambient Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[160px]" />

        <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-violet-500/15 blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        {/* LEFT PANEL */}
        <motion.section
          initial={{
            opacity: 0,
            x: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.45,
          }}
          className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04]/[0.04] p-10 backdrop-blur-2xl"
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_35%)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Plaksha University
            </div>

            <h1 className="mt-6 text-6xl font-semibold leading-[0.95] tracking-tight text-white">
              Global
              <br />
              Engagement
              <br />
              Portal
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/60">
              Explore international
              opportunities, connect with
              mentors, manage applications,
              and navigate global academic
              ecosystems through an
              AI-powered platform.
            </p>

            <div className="mt-12 space-y-4">
              {/* Student */}
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04]/[0.04] p-6 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
                    <GraduationCap className="h-5 w-5 text-blue-200" />
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                      Students
                    </div>

                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Explore global programs
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-white/55">
                      Discover international
                      opportunities, track
                      applications, and book
                      mentorship sessions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Office */}
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04]/[0.04] p-6 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                    <ShieldCheck className="h-5 w-5 text-violet-200" />
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                      Global Engagement Office
                    </div>

                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Manage programs &
                      applications
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-white/55">
                      Coordinate deadlines,
                      review applications,
                      and oversee international
                      engagement workflows.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mentors */}
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04]/[0.04] p-6 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                    <BrainCircuit className="h-5 w-5 text-cyan-200" />
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                      Mentors
                    </div>

                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Guide student journeys
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-white/55">
                      Manage advising sessions,
                      mentorship calendars, and
                      academic guidance support.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* RIGHT PANEL */}
        <motion.section
          initial={{
            opacity: 0,
            x: 20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.45,
            delay: 0.1,
          }}
          className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04]/[0.04] p-10 backdrop-blur-2xl"
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_35%)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-violet-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Access
            </div>

            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-white">
              Choose your portal access.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/60">
              Sign in as a student, mentor,
              reviewer, or administrative
              office member to access your
              personalized workspace.
            </p>

            {/* Role Selector */}
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                {
                  key: "student",
                  label: "Student",
                  Icon: GraduationCap,
                },
                {
                  key: "admin",
                  label: "Office",
                  Icon: ShieldCheck,
                },
                {
                  key: "mentor",
                  label: "Mentor",
                  Icon: BrainCircuit,
                },
                {
                  key: "reviewer",
                  label: "Reviewer",
                  Icon: Building2,
                },
              ].map((item) => {
                const Icon = item.Icon;

                const active =
                  role === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setRole(
                        item.key as
                          | "student"
                          | "admin"
                          | "mentor"
                          | "reviewer",
                      )
                    }
                    className={`rounded-[28px] border p-5 text-left transition-all duration-300 ${
                      active
                        ? "border-blue-400/30 bg-blue-500/10"
                        : "border-white/10 bg-white/[0.04]/[0.03] hover:bg-white/[0.04]/[0.06]"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
                      <Icon className="h-5 w-5 text-blue-200" />
                    </div>

                    <div className="mt-5 text-lg font-semibold text-white">
                      {item.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="mt-10 space-y-5"
            >
              {role === "student" ? (
                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04]/[0.04] px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur-xl"
                  placeholder="Full name"
                />
              ) : null}

              {role === "admin" &&
              adminEmails.length > 0 ? (
                <select
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04]/[0.04] px-5 py-4 text-white outline-none backdrop-blur-xl"
                >
                  <option value="">
                    Select office account
                  </option>

                  {adminOptions.map(
                    (admin) => (
                      <option
                        key={
                          admin.email
                        }
                        value={
                          admin.email
                        }
                        className="bg-[#0B1120]"
                      >
                        {admin.name} (
                        {admin.email})
                      </option>
                    ),
                  )}
                </select>
              ) : role === "mentor" &&
                mentorEmails.length >
                  0 ? (
                <select
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04]/[0.04] px-5 py-4 text-white outline-none backdrop-blur-xl"
                >
                  <option value="">
                    Select mentor account
                  </option>

                  {mentorOptions.map(
                    (mentor) => (
                      <option
                        key={
                          mentor.email
                        }
                        value={
                          mentor.email
                        }
                        className="bg-[#0B1120]"
                      >
                        {mentor.name} (
                        {mentor.email})
                      </option>
                    ),
                  )}
                </select>
              ) : role === "reviewer" &&
                reviewerEmails.length >
                  0 ? (
                <select
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04]/[0.04] px-5 py-4 text-white outline-none backdrop-blur-xl"
                >
                  <option value="">
                    Select reviewer
                    account
                  </option>

                  {reviewerOptions.map(
                    (reviewer) => (
                      <option
                        key={
                          reviewer.email
                        }
                        value={
                          reviewer.email
                        }
                        className="bg-[#0B1120]"
                      >
                        {reviewer.name} (
                        {
                          reviewer.email
                        }
                        )
                      </option>
                    ),
                  )}
                </select>
              ) : (
                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04]/[0.04] px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur-xl"
                  placeholder={
                    role ===
                    "student"
                      ? "Email address"
                      : role ===
                          "admin"
                        ? "Office email"
                        : role ===
                            "mentor"
                          ? "Mentor email"
                          : "Reviewer email"
                  }
                  type="email"
                />
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  loading
                }
                className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4 font-semibold text-white transition-all duration-300 hover:scale-[1.01] disabled:opacity-70"
              >
                {submitting
                  ? "Signing in..."
                  : role ===
                      "student"
                    ? "Enter Student Portal"
                    : role ===
                        "admin"
                      ? "Enter Office Portal"
                      : role ===
                          "mentor"
                        ? "Enter Mentor Portal"
                        : "Enter Reviewer Workspace"}

                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
}