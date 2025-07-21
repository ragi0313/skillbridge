import { db } from "@/db"
import { pendingMentors, pendingMentorSkills } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)

  // Find mentor for email notification (optional)
  const mentor = await db.query.pendingMentors.findFirst({
    where: eq(pendingMentors.id, id),
  })

  if (!mentor) {
    return NextResponse.json({ error: "Pending mentor not found" }, { status: 404 })
  }

  // Delete skills and mentor
  await db.delete(pendingMentorSkills).where(eq(pendingMentorSkills.mentorId, id))
  await db.delete(pendingMentors).where(eq(pendingMentors.id, id))

  // (Optional) Send rejection email
  // await sendRejectionEmail(mentor.email)

  return NextResponse.json({ success: true, message: "Mentor application rejected." })
}
