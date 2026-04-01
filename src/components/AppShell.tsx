"use client";

import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import { AuthProvider } from "@/components/AuthProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--portal-cream)] text-[var(--portal-ink)]">
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Chatbot />
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}
