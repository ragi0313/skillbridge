//app/api/mentors/[id]

import { NextResponse } from "next/server"
import { getMentorById } from "@/lib/data/mentors"

export async function GET(
  _: Request,
  contextPromise: Promise<{ params: Promise<{ id: string }> }>
) {
  const { params } = await contextPromise
  const { id } = await params
  const mentorId = parseInt(id)

  if (isNaN(mentorId)) {
    return NextResponse.json({ error: "Invalid mentor ID" }, { status: 400 })
  }

  const mentor = await getMentorById(mentorId)

  if (!mentor) {
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
  }

  return NextResponse.json(mentor)
}