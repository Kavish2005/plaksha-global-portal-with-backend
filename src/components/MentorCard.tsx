"use client"

import { useState } from "react"

type Mentor = {
  id: number
  name: string
  expertise: string
}

type MentorCardProps = {
  mentor: Mentor
}

export default function MentorCard({ mentor }: MentorCardProps) {

const [booked,setBooked]=useState(false)

return(

<div className="border p-6 rounded-xl">

<h3 className="font-bold">
{mentor.name}
</h3>

<p>{mentor.expertise}</p>

<button
onClick={()=>setBooked(true)}
className="mt-3 bg-green-600 text-white px-4 py-2 rounded"
>

{booked ? "Booked" : "Book Meeting"}

</button>

</div>

)

}