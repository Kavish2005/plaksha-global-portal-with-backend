"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { cx } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/programs", label: "Programs" },
  { href: "/mentor", label: "Mentors" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { activeUser, loading, setActiveUser, users } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/plaksha-logo.png" alt="Plaksha" width={44} height={44} />
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--portal-ink)]">
              Plaksha Global Engagement
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--portal-teal)]">
              International Programs Office
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "rounded-full px-3 py-2 text-sm font-medium transition",
                pathname === item.href ? "bg-[var(--portal-teal)] text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className={cx(
              "rounded-full px-3 py-2 text-sm font-medium transition",
              pathname.startsWith("/admin")
                ? "bg-[var(--portal-gold)] text-[var(--portal-ink)]"
                : "text-slate-600 hover:bg-amber-50",
            )}
          >
            Admin
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-black/10 bg-[var(--portal-panel)] px-3 py-2 text-sm">
            {loading ? "Loading profile..." : activeUser ? `${activeUser.name} · ${activeUser.role}` : "No user"}
          </div>
          <select
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none"
            value={activeUser ? `${activeUser.role}:${activeUser.email}` : ""}
            onChange={(event) => {
              const nextValue = users.find((user) => `${user.role}:${user.email}` === event.target.value);
              if (nextValue) {
                setActiveUser(nextValue);
              }
            }}
          >
            {users.map((user) => (
              <option key={`${user.role}:${user.email}`} value={`${user.role}:${user.email}`}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );
}
