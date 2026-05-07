"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import toast from "react-hot-toast";

import {
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Building2,
  BrainCircuit,
  Globe2,
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";

import { getErrorMessage } from "@/lib/utils";

import { cx } from "@/lib/utils";

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
    useState<"student" | "admin" | "mentor" | "reviewer">("student");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const adminEmails = useMemo(
    () => adminOptions.map((admin) => admin.email),
    [adminOptions],
  );

  const mentorEmails = useMemo(
    () => mentorOptions.map((mentor) => mentor.email),
    [mentorOptions],
  );

  const reviewerEmails = useMemo(
    () => reviewerOptions.map((reviewer) => reviewer.email),
    [reviewerOptions],
  );

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
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const roles = [
    { key: "student", label: "Student", Icon: GraduationCap },
    { key: "admin", label: "Office", Icon: ShieldCheck },
    { key: "mentor", label: "Mentor", Icon: BrainCircuit },
    { key: "reviewer", label: "Reviewer", Icon: Building2 },
  ] as const;

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0 overflow-hidden rounded-2xl shadow-lg border border-slate-200">

          {/* LEFT — brand panel */}
          <div className="bg-gradient-to-br from-teal-800 to-teal-600 px-10 py-12 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                <Globe2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-white/80">Plaksha University</span>
            </div>

            <h1 className="mt-8 text-4xl font-bold leading-tight">
              Global<br />Engagement<br />Portal
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75 max-w-sm">
              Discover exchange programs, connect with mentors, track applications,
              and navigate global academic opportunities.
            </p>

            <div className="mt-10 space-y-4">
              <div className="rounded-xl border border-white/20 bg-white/10 p-5">
                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-white/80" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Students</p>
                    <p className="mt-1 text-sm font-semibold text-white">Explore global programs</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      Browse opportunities, track applications, and book mentorship sessions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/20 bg-white/10 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-white/80" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/60">GEO Staff</p>
                    <p className="mt-1 text-sm font-semibold text-white">Manage programs & applications</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      Coordinate deadlines, review applications, and oversee engagement workflows.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/20 bg-white/10 p-5">
                <div className="flex items-start gap-3">
                  <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-white/80" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Mentors</p>
                    <p className="mt-1 text-sm font-semibold text-white">Guide student journeys</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      Manage advising slots, review meetings, and upload guidance documents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — sign-in form */}
          <div className="bg-white px-10 py-12 flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Portal Access</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Sign in to your workspace</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Select your role and enter your credentials to continue.
            </p>

            {/* Role selector */}
            <div className="mt-8 grid grid-cols-2 gap-2">
              {roles.map(({ key, label, Icon }) => {
                const active = role === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={cx(
                      "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors",
                      active
                        ? "border-teal-300 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Icon className={cx("h-4 w-4", active ? "text-teal-700" : "text-slate-400")} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {role === "student" ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Full name"
                />
              ) : null}

              {role === "admin" && adminEmails.length > 0 ? (
                <select
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
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
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select mentor account</option>
                  {mentorOptions.map((mentor) => (
                    <option key={mentor.email} value={mentor.email}>
                      {mentor.name} ({mentor.email})
                    </option>
                  ))}
                </select>
              ) : role === "reviewer" && reviewerEmails.length > 0 ? (
                <select
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select reviewer account</option>
                  {reviewerOptions.map((reviewer) => (
                    <option key={reviewer.email} value={reviewer.email}>
                      {reviewer.name} ({reviewer.email})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder={
                    role === "student"
                      ? "Email address"
                      : role === "admin"
                        ? "Office email"
                        : role === "mentor"
                          ? "Mentor email"
                          : "Reviewer email"
                  }
                  type="email"
                />
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-70"
              >
                {submitting
                  ? "Signing in..."
                  : role === "student"
                    ? "Enter Student Portal"
                    : role === "admin"
                      ? "Enter Office Portal"
                      : role === "mentor"
                        ? "Enter Mentor Portal"
                        : "Enter Reviewer Workspace"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Plaksha University · Global Engagement Office
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
