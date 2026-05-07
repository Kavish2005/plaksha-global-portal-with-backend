import Link from "next/link";

import {
  Globe2,
  Sparkles,
  BrainCircuit,
  ArrowUpRight,
} from "lucide-react";

const footerLinks = [
  {
    label: "Programs",
    href: "/programs",
  },
  {
    label: "Mentors",
    href: "/mentor",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "AI Assistant",
    href: "/assistant",
  },
  {
    label: "Admin",
    href: "/admin",
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-white/10">
      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-500/10 blur-[160px]" />

        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[72px_72px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        {/* Top CTA */}
        <div className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04]/4 backdrop-blur-2xl">
          <div className="relative overflow-hidden px-8 py-12 md:px-12">
            {/* Glow overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_35%)]" />

            <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-blue-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Global Opportunity Intelligence
                </div>

                <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                  Your next international opportunity starts here.
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-white/60">
                  Explore elite global programs, discover scholarships,
                  connect with mentors, and navigate international
                  academic pathways through an AI-powered platform built
                  for ambitious students.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/programs"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.04] px-6 py-4 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.03]"
                >
                  Explore Programs

                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04]/4 px-6 py-4 text-sm font-medium text-white transition-all duration-300 hover:bg-white/[0.04]/8"
                >
                  <BrainCircuit className="h-4 w-4" />
                  AI Assistant
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Grid */}
        <div className="mt-20 grid gap-14 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-linear-to-br from-blue-500/20 to-violet-500/20 backdrop-blur-xl">
                <Globe2 className="h-6 w-6 text-blue-200" />
              </div>

              <div>
                <div className="text-xl font-semibold tracking-tight text-white">
                  Plaksha Global Portal
                </div>

                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-blue-200/70">
                  AI-Powered International Experiences
                </div>
              </div>
            </div>

            <p className="mt-8 max-w-md text-sm leading-8 text-white/55">
              A next-generation academic opportunity platform helping
              students explore global pathways, research experiences,
              mentorship ecosystems, and scholarship opportunities
              worldwide.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/40">
              Platform
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {footerLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex items-center gap-2 text-sm text-white/60 transition duration-300 hover:text-white"
                >
                  <span>{item.label}</span>

                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Office */}
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/40">
              Global Engagement Office
            </div>

            <p className="mt-6 text-sm leading-8 text-white/55">
              Supporting outbound exchange, research programs,
              international collaboration, and mentorship opportunities
              for the Plaksha student ecosystem.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04]/4 p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                System Status
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.9)]" />

                <div className="text-sm text-emerald-200">
                  Global systems operational
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-20 flex flex-col gap-5 border-t border-white/10 pt-8 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} Plaksha Global Portal
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <span>Built for global academic exploration</span>

            <div className="hidden h-1 w-1 rounded-full bg-white/[0.04]/20 md:block" />

            <span>AI-native opportunity platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

