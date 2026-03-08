"use client";

import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post<{ message: string }>("/contact", form);
      toast.success(response.data.message);
      setForm({ name: "", email: "", message: "" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-16">
      <h1 className="text-3xl font-bold">Contact Global Engagement Office</h1>
      <p className="text-gray-600 mt-2">
        Reach out for questions regarding international programs and collaborations.
      </p>

      <div className="grid md:grid-cols-2 gap-10 mt-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Mail className="text-[var(--plaksha-teal)]" />
            <span>global@plaksha.edu.in</span>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="text-[var(--plaksha-teal)]" />
            <span>+91 172 600 2000</span>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="text-[var(--plaksha-teal)]" />
            <span>Plaksha University, Mohali, Punjab</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <input
            placeholder="Your Name"
            className="border rounded-lg px-4 py-2 w-full"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <input
            placeholder="Email Address"
            className="border rounded-lg px-4 py-2 w-full"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />

          <textarea
            placeholder="Your Message"
            className="border rounded-lg px-4 py-2 w-full h-32"
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--plaksha-teal)] text-white px-6 py-2 rounded disabled:opacity-70"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
