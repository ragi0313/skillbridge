import { db } from "@/db";
import {
  bookingSessions,
  mentorAvailability,
  mentors,
  learners,
  mentorSkills,
  mentorBlockedDates, // Add this import
} from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { toZonedTime } from "date-fns-tz";

// Improved time parsing with validation
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== "string") return 0;
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    const [time, period] = timeStr.split(" ");
    if (!time || !period) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    let convertedHours = hours;
    if (period === "PM" && hours !== 12) convertedHours += 12;
    if (period === "AM" && hours === 12) convertedHours = 0;
    return convertedHours * 60 + (minutes || 0);
  }
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + (minutes || 0);
};

const timeRangesOverlap = (
  start1: number, end1: number,
  start2: number, end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Booking request body:", body);

    const {
      learnerUserId,
      mentorUserId,
      mentorSkillId,
      scheduledDate,
      durationMinutes,
      sessionNotes,
    } = body;

    // Input validation
    if (
      !learnerUserId ||
      !mentorUserId ||
      !mentorSkillId ||
      !scheduledDate ||
      !durationMinutes ||
      !sessionNotes?.trim()
    ) {
      console.log("Validation failed:", {
        learnerUserId,
        mentorUserId,
        mentorSkillId,
        scheduledDate,
        durationMinutes,
        sessionNotes,
      });
      return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
    }
    if (durationMinutes < 60 || durationMinutes > 240) {
      return NextResponse.json({ error: "Session must be between 60 and 240 minutes." }, { status: 400 });
    }
    if (sessionNotes.length > 1000) {
      return NextResponse.json({ error: "Session notes too long." }, { status: 400 });
    }

    // Transaction for atomic booking and credit deduction
    const result = await db.transaction(async (tx) => {
      // Get mentor, learner, skill
      const [mentor, learner, skill] = await Promise.all([
        tx.query.mentors.findFirst({ where: eq(mentors.id, mentorUserId) }),
        tx.query.learners.findFirst({ where: eq(learners.userId, learnerUserId) }),
        tx.query.mentorSkills.findFirst({ where: eq(mentorSkills.id, mentorSkillId) }),
      ]);
      console.log("Mentor found:", mentor);
      console.log("Learner found:", learner);
      console.log("Skill found:", skill);

      if (!mentor || !learner) throw new Error("Mentor or learner not found.");
      if (!skill || skill.mentorId !== mentor.id) throw new Error("Skill not found or doesn't belong to this mentor.");

      // Calculate cost
      const ratePerMinute = skill.ratePerHour / 60;
      const totalCostCredits = Math.ceil(durationMinutes * ratePerMinute);

      // Check and deduct credits atomically
      if (learner.creditsBalance < totalCostCredits) {
        throw new Error(`Insufficient credits. Required: ${totalCostCredits}, Available: ${learner.creditsBalance}`);
      }
      await tx.update(learners)
        .set({ creditsBalance: learner.creditsBalance - totalCostCredits })
        .where(eq(learners.id, learner.id));

      // Timezone logic
      const scheduledStart = new Date(scheduledDate);
      const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60000);
      const mentorTimezone = mentor.timezone || "UTC";
      const nowInMentorTz = toZonedTime(new Date(), mentorTimezone);
      const scheduledStartInMentorTz = toZonedTime(scheduledStart, mentorTimezone);
      if (scheduledStartInMentorTz < nowInMentorTz) throw new Error("Cannot book sessions in the past.");

      // Check if the booking date is blocked by the mentor
      const scheduledDateOnly = new Date(scheduledStart.toISOString().split('T')[0] + 'T00:00:00.000Z');
      const blockedDate = await tx.query.mentorBlockedDates.findFirst({
        where: and(
          eq(mentorBlockedDates.mentorId, mentor.id),
          eq(mentorBlockedDates.blockedDate, scheduledDateOnly)
        )
      });
      
      if (blockedDate) {
        const dateStr = scheduledDateOnly.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        throw new Error(`This date (${dateStr}) is blocked by the mentor and not available for booking.`);
      }

      // Get day of week in mentor's timezone
      const dayOfWeek = scheduledStart.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: mentor.timezone,
      }).toLowerCase();

      // Convert times to AM/PM format to match database
      const startTimeStr = scheduledStart.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: mentor.timezone,
      });
      const endTimeStr = scheduledEnd.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: mentor.timezone,
      });

      // Check mentor availability
      const availabilitySlots = await tx
        .select()
        .from(mentorAvailability)
        .where(
          and(
            eq(mentorAvailability.mentorId, mentor.id),
            eq(mentorAvailability.day, dayOfWeek),
            eq(mentorAvailability.isActive, true)
          )
        );
      if (availabilitySlots.length === 0) throw new Error(`Mentor has no availability on ${dayOfWeek}.`);

      // Ensure booking fits exactly within a slot
      const requestedStartMinutes = timeToMinutes(startTimeStr);
      const requestedEndMinutes = timeToMinutes(endTimeStr);
      const validSlot = availabilitySlots.find(slot => {
        const slotStartMinutes = timeToMinutes(slot.startTime);
        const slotEndMinutes = timeToMinutes(slot.endTime);
        return requestedStartMinutes >= slotStartMinutes && requestedEndMinutes <= slotEndMinutes;
      });
      if (!validSlot) throw new Error(`Mentor is not available on ${dayOfWeek} from ${startTimeStr} to ${endTimeStr}.`);

      // Check for conflicts with existing sessions
      const scheduledDateStr = scheduledStart.toISOString().split('T')[0];
      const existingSessions = await tx
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
          durationMinutes: bookingSessions.durationMinutes,
          status: bookingSessions.status
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.mentorId, mentor.id),
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
        const existingDateInMentorTz = toZonedTime(existingDate, mentorTimezone);
        const existingStartMinutes = existingDateInMentorTz.getHours() * 60 + existingDateInMentorTz.getMinutes();
        const existingEndMinutes = existingStartMinutes + session.durationMinutes;
        return timeRangesOverlap(
          requestedStartMinutes, requestedEndMinutes,
          existingStartMinutes, existingEndMinutes
        );
      });
      if (conflictingSessions.length > 0) throw new Error("This time slot conflicts with an existing session.");

      // Create booking
      const booking = await tx.insert(bookingSessions).values({
        learnerId: learner.id,
        mentorId: mentor.id,
        mentorSkillId,
        scheduledDate: scheduledStart,
        durationMinutes,
        totalCostCredits,
        escrowCredits: totalCostCredits,
        sessionNotes,
        status: "pending",
      }).returning();

      return booking[0];
    });

    return NextResponse.json({
      message: "Session booked successfully! Pending mentor approval.",
      session: result
    }, { status: 201 });

  } catch (err: any) {
    console.error("Booking error:", err);
    return NextResponse.json({
      error: err.message || "An unexpected error occurred while booking the session."
    }, { status: 500 });
  }
}