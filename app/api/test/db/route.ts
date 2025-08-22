import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { mentors, users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    console.log("DB Test: Starting database connection test")
    
    const session = await getSession()
    console.log("DB Test: Session", { hasSession: !!session, role: session?.role, id: session?.id })
    
    if (!session || session.role !== "mentor") {
      return NextResponse.json({ 
        error: "Unauthorized", 
        session: { hasSession: !!session, role: session?.role } 
      }, { status: 401 })
    }

    // Test basic user query
    console.log("DB Test: Testing user query...")
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id)
    })
    console.log("DB Test: User query result", { hasUser: !!user, firstName: user?.firstName })

    // Test basic mentor query
    console.log("DB Test: Testing mentor query...")
    const mentor = await db.query.mentors.findFirst({
      where: eq(mentors.userId, session.id),
    })
    console.log("DB Test: Mentor query result", { hasMentor: !!mentor, mentorId: mentor?.id })

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        role: session.role
      },
      user: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName
      } : null,
      mentor: mentor ? {
        id: mentor.id,
        professionalTitle: mentor.professionalTitle
      } : null
    })

  } catch (error) {
    console.error("DB Test: Error:", error)
    return NextResponse.json({ 
      error: "Database test failed", 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}