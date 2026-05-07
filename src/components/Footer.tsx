import Link from "next/link";
import { Globe2 } from "lucide-react";

const links = [
  { label: "Programs", href: "/programs" },
  { label: "Mentors", href: "/mentor" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "AI Assistant", href: "/assistant" },
  { label: "Admin", href: "/admin" },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="w-full px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-teal-50">
              <Globe2 className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Plaksha Global Portal</div>
              <div className="text-xs text-slate-500">Global Engagement Office</div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-slate-500 hover:text-teal-700 transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Plaksha University · Global Engagement Office
        </div>
      </div>
    </footer>
  );
}
