import { db } from "@/db"
import { pendingMentors, pendingMentorSkills, pendingMentorAvailability } from "@/db/schema"
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

    // Delete profile picture from Cloudinary if exists
    if (pending.profilePictureUrl) {
      try {
        const parts = pending.profilePictureUrl.split("/")
        const filename = parts[parts.length - 1] 
        const publicId = filename.split(".")[0]   
        if (publicId) {
          await deleteFromCloudinary(publicId)
        }
      } catch (cloudErr) {
        console.error("Cloudinary deletion failed:", cloudErr)
        // Don't throw - continue with rejection even if image deletion fails
      }
    }

    // Delete from related tables first (due to foreign keys)
    try {
      await db.delete(pendingMentorAvailability).where(eq(pendingMentorAvailability.mentorId, id))
      await db.delete(pendingMentorSkills).where(eq(pendingMentorSkills.mentorId, id))
      await db.delete(pendingMentors).where(eq(pendingMentors.id, id))
    } catch (dbErr) {
      console.error("Database deletion error:", dbErr)
      return NextResponse.json({ error: "Failed to delete mentor record" }, { status: 500 })
    }

    // Send rejection email (don't let email errors prevent the deletion)
    try {
      await sendMentorRejectionEmail(
        pending.email,
        `${pending.firstName} ${pending.lastName}`,
        notes
      )
    } catch (emailErr) {
      console.error("Email sending error:", emailErr)
      // Log but don't fail - the mentor is already deleted
    }

    return NextResponse.json({ success: true, message: "Mentor application rejected and email sent." })
  } catch (err) {
    console.error("Rejection error:", err)
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 })
  }
}
