// app/api/admin/pending-mentors/route.ts
import { db } from "@/db"
import { pendingMentors, pendingMentorSkills } from "@/db/schema"
import { NextResponse } from "next/server"

export async function GET() {
  const mentors = await db.select().from(pendingMentors)
  const skills = await db.select().from(pendingMentorSkills)

  const mentorMap = mentors.map((mentor) => {
    const mentorSkills = skills
      .filter((s) => s.mentorId === mentor.id)
      .map((s) => ({
        skillName: s.skillName,
        ratePerHour: s.ratePerHour,
      }))

    return {
      ...mentor,
      skills: mentorSkills,
    }
  })

  return NextResponse.json(mentorMap)
}
