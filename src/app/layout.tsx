import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Plaksha Global Portal",
  description:
    "AI-powered global opportunities platform for Plaksha students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} min-h-screen overflow-x-hidden bg-[#050816] font-sans text-white antialiased`}
      >
        {/* Global Background System */}
        <div className="fixed inset-0 -z-50 overflow-hidden">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_30%),linear-gradient(to_bottom,#050816,#070B1A,#050816)]" />

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[72px_72px]" />

          {/* Glow orbs */}
          <div className="absolute left-[-10%] top-[-10%] h-125 w-125 rounded-full bg-blue-500/20 blur-[140px]" />

          <div className="absolute bottom-[-20%] right-[-10%] h-125 w-125 rounded-full bg-violet-500/20 blur-[160px]" />


          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        {/* App Container */}
        <div className="relative min-h-screen">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}

