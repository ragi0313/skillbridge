import { db } from "@/db"
import { users, mentors, mentorSkills, mentorSkillCategories, pendingMentors, pendingMentorSkills, pendingMentorAvailability,
  mentorAvailability,
  skillCategories,
} from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { sendMentorApprovedEmail } from "@/lib/email/approvedMail"
import { getSession } from "@/lib/auth/getSession"
import { logAdminAction, getClientIpAddress, AUDIT_ACTIONS, ENTITY_TYPES } from "@/lib/admin/audit-log"
import { withRateLimit } from "@/lib/middleware/rate-limit"

// Helper to convert "09:00 AM" to "09:00" (24-hour format)
function to24Hour(time: string): string {
  if (!time) return ""
  const [timePart, period] = time.split(" ")
  let [hours, minutes] = timePart.split(":").map(Number)
  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

async function handleApproveMentor(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // SECURITY: Check admin authentication
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({
      error: 'Unauthorized - Admin access required'
    }, { status: 401 })
  }

  const { id: idString } = await params
  const id = Number(idString)

  try {
    const body = await request.json()
    const { skillCategoryAssignments = [] } = body

    // Get pending mentor
    const [pending] = await db.select().from(pendingMentors).where(eq(pendingMentors.id, id))

    if (!pending) {
      return NextResponse.json({ error: "Pending mentor not found" }, { status: 404 })
    }

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        firstName: pending.firstName,
        lastName: pending.lastName,
        email: pending.email,
        hashedPassword: pending.hashedPassword,
        role: "mentor",
      })
      .returning()

    // Create mentor
    const [mentor] = await db
      .insert(mentors)
      .values({
        userId: user.id,
        profileUrl: pending.profileUrl,
        profilePictureUrl: pending.profilePictureUrl,
        country: pending.country,
        timezone: pending.timezone,
        gender: pending.gender,
        languagesSpoken: pending.languagesSpoken,
        professionalTitle: pending.professionalTitle ?? "",
        bio: pending.bio,
        yearsOfExperience: pending.yearsOfExperience,
        linkedInUrl: pending.linkedInUrl,
        socialLinks: pending.socialLinks,
        creditsBalance: 0,
      })
      .returning()

    // Transfer skills
    const pendingSkills = await db.select().from(pendingMentorSkills).where(eq(pendingMentorSkills.mentorId, id))

    if (pendingSkills.length > 0) {
      const insertedSkills = await db
        .insert(mentorSkills)
        .values(
          pendingSkills.map((s) => ({
            mentorId: mentor.id,
            skillName: s.skillName,
            ratePerHour: s.ratePerHour,
          })),
        )
        .returning()

      // Handle skill category assignments from admin
      if (skillCategoryAssignments.length > 0) {
        const categoryAssignments = []

        for (const assignment of skillCategoryAssignments) {
          const skill = insertedSkills.find((s) => s.skillName === assignment.skillName)
          if (skill) {
            categoryAssignments.push({
              mentorSkillId: skill.id,
              categoryId: assignment.categoryId,
              createdBy: user.id,
            })
          }
        }

        if (categoryAssignments.length > 0) {
          await db.insert(mentorSkillCategories).values(categoryAssignments)
        }
      }

      // Auto-assign skills to categories based on matching existing assigned skills
      // If another mentor's "Java" is assigned to "Web Development", assign this mentor's "java" to same category
      for (const skill of insertedSkills) {
        // Check if skill already has any category assignments
        const existingAssignments = await db
          .select()
          .from(mentorSkillCategories)
          .where(eq(mentorSkillCategories.mentorSkillId, skill.id))

        if (existingAssignments.length === 0) {
          // Find categories where other skills with the same name (case-insensitive) are already assigned
          const matchingCategoryAssignments = await db
            .select({
              categoryId: mentorSkillCategories.categoryId,
            })
            .from(mentorSkillCategories)
            .innerJoin(mentorSkills, eq(mentorSkillCategories.mentorSkillId, mentorSkills.id))
            .where(
              sql`LOWER(${mentorSkills.skillName}) = LOWER(${skill.skillName})`
            )
            .groupBy(mentorSkillCategories.categoryId)

          // Assign to all categories where matching skills exist
          if (matchingCategoryAssignments.length > 0) {
            const autoAssignments = matchingCategoryAssignments.map((assignment) => ({
              mentorSkillId: skill.id,
              categoryId: assignment.categoryId,
              createdBy: user.id,
            }))

            await db.insert(mentorSkillCategories).values(autoAssignments)
          }
        }
      }
    }

    // Transfer availability slots (convert to 24-hour format)
    const pendingSlots = await db
      .select()
      .from(pendingMentorAvailability)
      .where(eq(pendingMentorAvailability.mentorId, id))

    if (pendingSlots.length > 0) {
      await db.insert(mentorAvailability).values(
        pendingSlots.map((slot) => ({
          mentorId: mentor.id,
          day: slot.day,
          startTime: to24Hour(slot.startTime),
          endTime: to24Hour(slot.endTime),
        })),
      )
    }

    // Send approval email
    await sendMentorApprovedEmail(pending.email, `${pending.firstName} ${pending.lastName}`)

    // Log admin action
    const ipAddress = getClientIpAddress(request)
    await logAdminAction({
      adminId: session.id,
      action: AUDIT_ACTIONS.APPROVE_MENTOR,
      entityType: ENTITY_TYPES.MENTOR,
      entityId: mentor.id,
      description: `Admin ${session.id} approved mentor: ${pending.firstName} ${pending.lastName} (${pending.email})`,
      metadata: {
        pendingMentorId: id,
        mentorId: mentor.id,
        userId: user.id,
        email: pending.email,
        skillCount: pendingSkills.length,
        categoryAssignments: skillCategoryAssignments.length
      },
      severity: 'info',
      ipAddress,
    })

    // Cleanup
    await db.delete(pendingMentorSkills).where(eq(pendingMentorSkills.mentorId, id))
    await db.delete(pendingMentorAvailability).where(eq(pendingMentorAvailability.mentorId, id))
    await db.delete(pendingMentors).where(eq(pendingMentors.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error approving mentor:", error)
    return NextResponse.json({ error: "Failed to approve mentor" }, { status: 500 })
  }
}

// Apply rate limiting to prevent abuse
export const POST = withRateLimit('admin', handleApproveMentor)
