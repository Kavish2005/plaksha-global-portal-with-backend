"use client"

import Link from "next/link"
import Image from "next/image"

export default function Navbar() {
  return (
    <nav className="bg-white/80 backdrop-blur border-b sticky top-0 z-50">

      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">

        <div className="flex items-center gap-3">

          <Image
            src="/plaksha-logo.png"
            alt="Plaksha"
            width={42}
            height={42}
          />

          <span className="font-semibold text-lg">
            Plaksha Global
          </span>

        </div>

        <div className="flex gap-8 font-medium text-gray-700">

          <Link href="/" className="hover:text-[var(--plaksha-teal)]">Home</Link>
          <Link href="/programs" className="hover:text-[var(--plaksha-teal)]">Programs</Link>
          <Link href="/mentor" className="hover:text-[var(--plaksha-teal)]">Mentors</Link>
          <Link href="/dashboard" className="hover:text-[var(--plaksha-teal)]">Dashboard</Link>
          <Link href="/contact" className="hover:text-[var(--plaksha-teal)]">Contact</Link>
        </div>

      </div>

    </nav>
  )
}