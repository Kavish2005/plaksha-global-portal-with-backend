"use client";

import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { apiPost } from "@/services/api";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/utils";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiPost<{ id: number; message: string }>("/contact", form);
      toast.success(response.message);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--portal-teal)]">Support</p>
        <h1 className="mt-2 text-4xl font-bold">Contact the Global Engagement Office</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Send program, approval, or nomination questions directly into the shared support inbox stored in the database.
        </p>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div className="space-y-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Mail className="text-[var(--portal-teal)]" />
            <span>global@plaksha.edu.in</span>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="text-[var(--portal-teal)]" />
            <span>+91 172 600 2000</span>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="text-[var(--portal-teal)]" />
            <span>Plaksha University, Mohali, Punjab</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <input
            placeholder="Your Name"
            className="w-full rounded-2xl border border-black/10 px-4 py-3"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <input
            placeholder="Email Address"
            className="w-full rounded-2xl border border-black/10 px-4 py-3"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />

          <input
            placeholder="Subject"
            className="w-full rounded-2xl border border-black/10 px-4 py-3"
            value={form.subject}
            onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
          />

          <textarea
            placeholder="Your Message"
            className="h-32 w-full rounded-2xl border border-black/10 px-4 py-3"
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[var(--portal-teal)] px-6 py-3 text-white disabled:opacity-70"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
