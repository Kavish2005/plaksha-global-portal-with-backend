import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-black/5 bg-[var(--portal-ink)] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold">Plaksha University</h3>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            The Global Engagement Office helps students explore international programs, connect with mentors, and prepare strong applications.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Navigate</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm text-white/80">
            <Link href="/">Home</Link>
            <Link href="/programs">Programs</Link>
            <Link href="/mentor">Mentors</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/admin">Admin Panel</Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Global Engagement Office</h3>
          <p className="mt-4 text-sm text-white/70">
            Explore opportunities, mentor support, and contact pathways for outbound exchange, research, and international learning.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-4 text-center text-sm text-white/60">
        © {new Date().getFullYear()} Plaksha University · Global Engagement Office
      </div>
    </footer>
  );
}
