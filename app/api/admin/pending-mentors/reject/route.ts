import { db } from "@/db"
import { pendingMentors, pendingMentorSkills } from "@/db/schema"
import { sendMentorRejectionEmail } from "@/lib/email/rejectionMail"
import { deleteFromCloudinary } from "@/lib/cloudinary"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { id, notes } = await req.json()

    if (!id || typeof notes !== "string") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Get the pending mentor by ID
    const pending = await db.query.pendingMentors.findFirst({
      where: eq(pendingMentors.id, id),
    })

    if (!pending) {
      return NextResponse.json({ error: "Pending mentor not found" }, { status: 404 })
    }

    if (pending.profilePictureUrl) {
      const parts = pending.profilePictureUrl.split("/")
      const filename = parts[parts.length - 1] 
      const publicId = filename.split(".")[0]   
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId)
        } catch (cloudErr) {
          console.error("Cloudinary deletion failed:", cloudErr)
        }
      }
    }

    // Delete from related tables
    await db.delete(pendingMentorSkills).where(eq(pendingMentorSkills.mentorId, id))
    await db.delete(pendingMentors).where(eq(pendingMentors.id, id))

    // Send rejection email
    await sendMentorRejectionEmail(
      pending.email,
      `${pending.firstName} ${pending.lastName}`,
      notes
    )

    return NextResponse.json({ success: true, message: "Mentor application rejected." })
  } catch (err) {
    console.error("Rejection error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
