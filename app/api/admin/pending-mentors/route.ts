import { db } from "@/db"
import {
  pendingMentors,
  pendingMentorSkills,
  pendingMentorAvailability,
} from "@/db/schema"
import { inArray } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const mentors = await db.select().from(pendingMentors)
    const mentorIds = mentors.map((mentor) => mentor.id)

    const [skills, availability] = await Promise.all([
      db
        .select()
        .from(pendingMentorSkills)
        .where(inArray(pendingMentorSkills.mentorId, mentorIds)),
      db
        .select()
        .from(pendingMentorAvailability)
        .where(inArray(pendingMentorAvailability.mentorId, mentorIds)),
    ])

    const skillsByMentorId = skills.reduce((acc, skill) => {
      if (!acc[skill.mentorId]) acc[skill.mentorId] = []
      acc[skill.mentorId].push({
        skillName: skill.skillName,
        ratePerHour: skill.ratePerHour,
      })
      return acc
    }, {} as Record<number, { skillName: string; ratePerHour: number }[]>)

    // Group availability by mentor and then by day
    const availabilityByMentorId = availability.reduce((acc, slot) => {
      if (!acc[slot.mentorId]) acc[slot.mentorId] = {}
      if (!acc[slot.mentorId][slot.day]) acc[slot.mentorId][slot.day] = []
      
      acc[slot.mentorId][slot.day].push({
        start: slot.startTime,
        end: slot.endTime,
        id: slot.id,
      })
      return acc
    }, {} as Record<number, Record<string, { start: string; end: string; id: number }[]>>)

    const enrichedMentors = mentors.map((mentor) => ({
      ...mentor,
      skills: skillsByMentorId[mentor.id] || [],
      availability: availabilityByMentorId[mentor.id] || {},
    }))

    return NextResponse.json(enrichedMentors)
  } catch (error) {
    console.error("Error fetching pending mentors:", error)
    return NextResponse.json({ error: "Failed to load mentors" }, { status: 500 })
  }
}