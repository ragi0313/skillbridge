import { db } from "@/db";
import {
  bookingSessions,
  mentorAvailability,
  mentors,
  learners,
  mentorSkills,
} from "@/db/schema";
import { and, eq, lte, gte, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  // Handle 12-hour format (9:00 AM, 4:00 PM)
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [time, period] = timeStr.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    
    let convertedHours = hours
    if (period === 'PM' && hours !== 12) {
      convertedHours = hours + 12
    } else if (period === 'AM' && hours === 12) {
      convertedHours = 0
    }
    
    return convertedHours * 60 + (minutes || 0)
  }
  
  // Handle 24-hour format (09:00, 16:00)
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

// Helper function to check if two time ranges overlap
const timeRangesOverlap = (
  start1: number, end1: number,
  start2: number, end2: number
): boolean => {
  return start1 < end2 && start2 < end1
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      learnerId,
      mentorId,
      mentorSkillId,
      scheduledDate,
      durationMinutes,
      sessionNotes,
    } = body;

    if (
      !learnerId ||
      !mentorId ||
      !mentorSkillId ||
      !scheduledDate ||
      !durationMinutes ||
      !sessionNotes?.trim()
    ) {
      return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
    }

    const [mentor, learner, skill] = await Promise.all([
      db.query.mentors.findFirst({
        where: eq(mentors.id, mentorId),
        with: { user: true },
      }),
      db.query.learners.findFirst({
        where: eq(learners.id, learnerId),
        with: { user: true },
      }),
      db.query.mentorSkills.findFirst({
        where: eq(mentorSkills.id, mentorSkillId),
      }),
    ]);

    if (!mentor || !learner || !skill || !mentor.user || !learner.user) {
      return NextResponse.json({ error: "Mentor, learner, or skill not found." }, { status: 404 });
    }

    if (skill.mentorId !== mentor.id) {
      return NextResponse.json({ error: "Skill does not belong to the mentor." }, { status: 400 });
    }

    const ratePerMinute = skill.ratePerHour / 60;
    const totalCostCredits = Math.ceil(durationMinutes * ratePerMinute);

    if (learner.creditsBalance < totalCostCredits) {
      return NextResponse.json({ error: "Insufficient credits." }, { status: 402 });
    }

    const scheduledStart = new Date(scheduledDate);
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60000);

    const dayOfWeek = scheduledStart.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: mentor.timezone,
    }).toLowerCase();

    const startTimeStr = scheduledStart.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: mentor.timezone,
    });

    const endTimeStr = scheduledEnd.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: mentor.timezone,
    });

    const availability = await db
      .select()
      .from(mentorAvailability)
      .where(
        and(
          eq(mentorAvailability.mentorId, mentorId),
          eq(mentorAvailability.day, dayOfWeek),
          lte(mentorAvailability.startTime, startTimeStr),
          gte(mentorAvailability.endTime, endTimeStr),
          eq(mentorAvailability.isActive, true)
        )
      );

    if (availability.length === 0) {
      return NextResponse.json({ error: "Mentor is not available at this time." }, { status: 400 });
    }

    const scheduledDateStr = scheduledStart.toISOString().split('T')[0];
    const scheduledStartTime = timeToMinutes(startTimeStr);
    const scheduledEndTime = timeToMinutes(endTimeStr);

    const existingSessions = await db
      .select({
        id: bookingSessions.id,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        status: bookingSessions.status
      })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.mentorId, mentorId),
          or(
            eq(bookingSessions.status, "pending"),
            eq(bookingSessions.status, "confirmed"),
            eq(bookingSessions.status, "ongoing")
          )
        )
      );

    const conflictingSessions = existingSessions.filter(session => {
      const existingDate = new Date(session.scheduledDate);
      const existingDateStr = existingDate.toISOString().split('T')[0];
      
      if (existingDateStr !== scheduledDateStr) return false;

      const existingStartTime = existingDate.getHours() * 60 + existingDate.getMinutes();
      const existingEndTime = existingStartTime + session.durationMinutes;

      return timeRangesOverlap(
        scheduledStartTime, scheduledEndTime,
        existingStartTime, existingEndTime
      );
    });

    if (conflictingSessions.length > 0) {
      return NextResponse.json({ 
        error: "This time slot conflicts with an existing session." 
      }, { status: 409 });
    }

    const booking = await db.insert(bookingSessions).values({
      learnerId,
      mentorId,
      mentorSkillId,
      scheduledDate: scheduledStart,
      durationMinutes,
      totalCostCredits,
      escrowCredits: totalCostCredits,
      sessionNotes,
      status: "pending",
    }).returning();

    return NextResponse.json({ 
      message: "Session booked successfully",
      session: booking[0] 
    }, { status: 201 });

  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}