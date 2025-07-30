import { db } from "@/db";
import { mentors, users, mentorAvailability, mentorSkills, bookingSessions } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Note: params is now Promise<{ id: string }>
) {
  try {
    // Await the params object before accessing its properties
    const { id } = await params;
    const mentorId = parseInt(id);

    if (isNaN(mentorId)) {
      return NextResponse.json({ error: "Invalid mentor ID" }, { status: 400 });
    }

    // Get mentor info with user data
    const mentorData = await db
      .select({
        id: mentors.id,
        profilePictureUrl: mentors.profilePictureUrl,
        timezone: mentors.timezone,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(eq(mentors.id, mentorId))
      .limit(1);

    if (mentorData.length === 0) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const mentor = mentorData[0];

    // Get mentor availability
    const availability = await db
      .select()
      .from(mentorAvailability)
      .where(
        and(
          eq(mentorAvailability.mentorId, mentorId),
          eq(mentorAvailability.isActive, true)
        )
      );

    // Get mentor skills
    const skills = await db
      .select()
      .from(mentorSkills)
      .where(
        and(
          eq(mentorSkills.mentorId, mentorId),
          eq(mentorSkills.isActive, true)
        )
      );

    // Get existing booked sessions (for conflict checking)
    // Get sessions from last 7 days to next 30 days to optimize query
    const now = new Date();
    const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const bookedSessions = await db
      .select({
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        status: bookingSessions.status
      })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.mentorId, mentorId),
          // Only get non-cancelled sessions
          or(
            eq(bookingSessions.status, "pending"),
            eq(bookingSessions.status, "confirmed"),
            eq(bookingSessions.status, "ongoing")
          )
        )
      );

    // Filter sessions within our date range and format for frontend
    const relevantBookedSessions = bookedSessions
      .filter(session => {
        const sessionDate = new Date(session.scheduledDate);
        return sessionDate >= pastWeek && sessionDate <= nextMonth;
      })
      .map(session => ({
        scheduledDate: session.scheduledDate.toISOString(),
        durationMinutes: session.durationMinutes
      }));

    const response = {
      mentorId: mentor.id,
      fullName: `${mentor.firstName} ${mentor.lastName}`,
      profilePicture: mentor.profilePictureUrl || "",
      timezone: mentor.timezone,
      availability: availability.map(slot => ({
        id: slot.id,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive
      })),
      skills: skills.map(skill => ({
        id: skill.id,
        skillName: skill.skillName,
        ratePerHour: skill.ratePerHour
      })),
      bookedSessions: relevantBookedSessions
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching mentor booking info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}