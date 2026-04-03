"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight, ShieldCheck, GraduationCap } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { adminOptions, mentorOptions, login, loading } = useAuth();
  const [role, setRole] = useState<"student" | "admin" | "mentor">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const adminEmails = useMemo(() => adminOptions.map((admin) => admin.email), [adminOptions]);
  const mentorEmails = useMemo(() => mentorOptions.map((mentor) => mentor.email), [mentorOptions]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const user = await login({
        role,
        email,
        ...(role === "student" ? { name } : {}),
      });
      toast.success(`Welcome, ${user.name}.`);
      router.replace(user.role === "student" ? "/" : user.role === "admin" ? "/admin" : "/admin/mentors");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,var(--portal-teal-dark),var(--portal-teal))] px-8 py-10 text-white shadow-xl">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em]">
            Plaksha University
          </p>
          <h1 className="mt-6 text-5xl font-bold leading-tight">Global Engagement Portal</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Sign in to explore international opportunities, connect with mentors, and manage Global Engagement Office activity.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Students</p>
              <p className="mt-2 text-lg font-semibold">Explore programs and track applications</p>
              <p className="mt-2 text-sm text-white/80">
                New student accounts are created automatically the first time you sign in with your name and email.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Global Engagement Office</p>
              <p className="mt-2 text-lg font-semibold">Review applications and manage opportunities</p>
              <p className="mt-2 text-sm text-white/80">
                Admin access uses approved office accounts already available in the system.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Mentors</p>
              <p className="mt-2 text-lg font-semibold">Manage your advising calendar</p>
              <p className="mt-2 text-sm text-white/80">
                Mentors can sign in to add or remove their own slots and review upcoming student meetings.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Sign In</p>
          <h2 className="mt-2 text-3xl font-bold">Choose how you are entering the portal</h2>
          <p className="mt-3 text-slate-600">
            Use student sign-in for the student portal, or sign in as the Global Engagement Office to manage programs and applications.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`rounded-3xl border p-5 text-left transition ${
                role === "student" ? "border-[var(--portal-teal)] bg-[var(--portal-panel)]" : "border-black/10 bg-white"
              }`}
            >
              <GraduationCap className="text-[var(--portal-teal)]" />
              <p className="mt-4 text-lg font-semibold">Student</p>
              <p className="mt-2 text-sm text-slate-600">Discover programs, book mentors, and follow your application journey.</p>
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`rounded-3xl border p-5 text-left transition ${
                role === "admin" ? "border-[var(--portal-teal)] bg-[var(--portal-panel)]" : "border-black/10 bg-white"
              }`}
            >
              <ShieldCheck className="text-[var(--portal-teal)]" />
              <p className="mt-4 text-lg font-semibold">Global Engagement Office</p>
              <p className="mt-2 text-sm text-slate-600">Manage programs, deadlines, mentor support, and application decisions.</p>
            </button>
            <button
              type="button"
              onClick={() => setRole("mentor")}
              className={`rounded-3xl border p-5 text-left transition ${
                role === "mentor" ? "border-[var(--portal-teal)] bg-[var(--portal-panel)]" : "border-black/10 bg-white"
              }`}
            >
              <ShieldCheck className="text-[var(--portal-teal)]" />
              <p className="mt-4 text-lg font-semibold">Mentor</p>
              <p className="mt-2 text-sm text-slate-600">Update your availability and review meetings booked by students.</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {role === "student" ? (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-black/10 px-4 py-3"
                placeholder="Full name"
              />
            ) : null}

            {role === "admin" && adminEmails.length > 0 ? (
              <select
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-black/10 px-4 py-3"
              >
                <option value="">Select office account</option>
                {adminOptions.map((admin) => (
                  <option key={admin.email} value={admin.email}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
            ) : role === "mentor" && mentorEmails.length > 0 ? (
              <select
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-black/10 px-4 py-3"
              >
                <option value="">Select mentor account</option>
                {mentorOptions.map((mentor) => (
                  <option key={mentor.email} value={mentor.email}>
                    {mentor.name} ({mentor.email})
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-black/10 px-4 py-3"
                placeholder={role === "student" ? "Email address" : role === "admin" ? "Office email" : "Mentor email"}
                type="email"
              />
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--portal-teal)] px-6 py-3 font-semibold text-white disabled:opacity-70"
            >
              {submitting
                ? "Signing in..."
                : role === "student"
                  ? "Enter Student Portal"
                  : role === "admin"
                    ? "Enter Office Portal"
                    : "Enter Mentor Portal"}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
