import { Linkedin, Twitter, Instagram } from "lucide-react"
import Link from "next/link"

export default function Footer() {

return(

<footer className="bg-[var(--plaksha-dark)] text-white mt-20">

<div className="max-w-7xl mx-auto px-8 py-10 grid md:grid-cols-3 gap-10">

{/* UNIVERSITY */}

<div>

<h3 className="font-semibold text-lg">
Plaksha University
</h3>

<p className="text-sm opacity-80 mt-2">
Global Engagement Portal connecting students with
international research and exchange opportunities.
</p>

</div>

{/* QUICK LINKS */}

<div>

<h3 className="font-semibold mb-3">
Quick Links
</h3>

<ul className="space-y-2 text-sm opacity-80">

<li><Link href="/">Home</Link></li>
<li><Link href="/programs">Programs</Link></li>
<li><Link href="/mentor">Mentors</Link></li>
<li><Link href="/contact">Contact</Link></li>

</ul>

</div>

{/* SOCIAL */}

<div>

<h3 className="font-semibold mb-3">
Connect With Us
</h3>

<div className="flex gap-4">

<a href="#" className="hover:text-[var(--plaksha-gold)]">
<Linkedin/>
</a>

<a href="#" className="hover:text-[var(--plaksha-gold)]">
<Twitter/>
</a>

<a href="#" className="hover:text-[var(--plaksha-gold)]">
<Instagram/>
</a>

</div>

</div>

</div>

<div className="border-t border-gray-700 text-center py-4 text-sm opacity-70">

© {new Date().getFullYear()} Plaksha University · Global Engagement Portal

</div>

</footer>

)

}