// Script to fix stuck sessions directly in database
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { bookingSessions, learners, mentors, creditTransactions, notifications, mentorPayouts } = require('../db/schema');
const { eq, and, lt } = require('drizzle-orm');

// Database connection (you may need to adjust this based on your env setup)
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/skillbridge';

async function fixStuckSessions() {
  const sql = postgres(connectionString);
  const db = drizzle(sql);
  
  const now = new Date();
  console.log(`🔧 Starting stuck session fix at ${now.toISOString()}`);
  
  try {
    // Find all "ongoing" sessions that should have ended
    const stuckSessions = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        status: bookingSessions.status,
        totalCostCredits: bookingSessions.totalCostCredits,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
      })
      .from(bookingSessions)
      .where(
        eq(bookingSessions.status, "ongoing")
      );

    console.log(`📊 Found ${stuckSessions.length} stuck sessions`);

    if (stuckSessions.length === 0) {
      console.log('✅ No stuck sessions found!');
      await sql.end();
      return;
    }

    for (const session of stuckSessions) {
      const scheduledEndTime = new Date(session.scheduledDate.getTime() + (session.durationMinutes || 60) * 60 * 1000);
      const hoursOverdue = Math.round((now.getTime() - scheduledEndTime.getTime()) / (1000 * 60 * 60) * 10) / 10;

      // Only process sessions that are ACTUALLY stuck (4+ hours past END time)
      if (hoursOverdue < 4) {
        console.log(`⏭️  Skipping session ${session.id} - only ${hoursOverdue} hours past end time (not stuck yet)`);
        continue;
      }

      console.log(`\n🔄 Processing session ${session.id}:`);
      console.log(`   Scheduled: ${session.scheduledDate.toISOString()}`);
      console.log(`   Overdue by: ${hoursOverdue} hours`);
      console.log(`   Participants joined: learner=${!!session.learnerJoinedAt}, mentor=${!!session.mentorJoinedAt}`);

      await db.transaction(async (tx) => {
        // Complete the session
        await tx
          .update(bookingSessions)
          .set({
            status: "completed",
            agoraCallEndedAt: now,
            cancellationReason: `Automatic completion - session was stuck in ongoing status for ${hoursOverdue} hours`,
            updatedAt: now,
          })
          .where(eq(bookingSessions.id, session.id));

        // Calculate mentor earnings (80% of total cost)
        const platformFeePercentage = 20;
        const mentorEarnings = Math.floor(session.totalCostCredits * (100 - platformFeePercentage) / 100);

        // Pay mentor
        const [mentorData] = await tx
          .select({ creditsBalance: mentors.creditsBalance, userId: mentors.userId })
          .from(mentors)
          .where(eq(mentors.id, session.mentorId));

        if (mentorData) {
          await tx
            .update(mentors)
            .set({ 
              creditsBalance: mentorData.creditsBalance + mentorEarnings,
              updatedAt: now 
            })
            .where(eq(mentors.id, session.mentorId));

          // Create payout record
          await tx.insert(mentorPayouts).values({
            mentorId: session.mentorId,
            sessionId: session.id,
            earnedCredits: mentorEarnings,
            platformFeeCredits: session.totalCostCredits - mentorEarnings,
            feePercentage: platformFeePercentage,
            status: "released",
            releasedAt: now,
            createdAt: now,
          });

          // Record mentor earning transaction
          await tx.insert(creditTransactions).values({
            userId: mentorData.userId,
            type: "mentor_payout",
            direction: "credit",
            amount: mentorEarnings,
            balanceBefore: mentorData.creditsBalance,
            balanceAfter: mentorData.creditsBalance + mentorEarnings,
            relatedSessionId: session.id,
            description: `Automatic payout for stuck session cleanup (${hoursOverdue}h overdue)`,
            metadata: { reason: "stuck_session_cleanup", hoursOverdue, autoFixed: true },
            createdAt: now,
          });

          console.log(`   💰 Paid mentor ${mentorEarnings} credits`);

          // Notify mentor
          await tx.insert(notifications).values({
            userId: mentorData.userId,
            type: "session_completed",
            title: "Session Automatically Completed",
            message: `Your session has been automatically completed due to a system issue. You've received ${mentorEarnings} credits.`,
            relatedEntityType: "session",
            relatedEntityId: session.id,
            createdAt: now,
          });
        }

        // Notify learner
        const [learnerData] = await tx
          .select({ userId: learners.userId })
          .from(learners)
          .where(eq(learners.id, session.learnerId));

        if (learnerData) {
          await tx.insert(notifications).values({
            userId: learnerData.userId,
            type: "session_completed",
            title: "Session Automatically Completed",
            message: `Your session has been automatically completed. The session was marked as successful.`,
            relatedEntityType: "session",
            relatedEntityId: session.id,
            createdAt: now,
          });
        }

        console.log(`   ✅ Session ${session.id} completed successfully`);
      });
    }

    console.log(`\n🎉 Successfully fixed ${stuckSessions.length} stuck sessions!`);

  } catch (error) {
    console.error('❌ Error fixing stuck sessions:', error);
  } finally {
    await sql.end();
  }
}

// Run the script
fixStuckSessions().catch(console.error);