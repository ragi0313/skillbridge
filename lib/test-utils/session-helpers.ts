/**
 * Testing utilities for session functionality
 * Use these helpers when testing sessions with two accounts on same PC
 */

export interface TestSessionConfig {
  mentorUserId: number
  learnerUserId: number
  skillName: string
  durationMinutes: number
  ratePerHour: number
  scheduledDate: Date
}

export interface TestUser {
  id: number
  email: string
  firstName: string
  lastName: string
  role: 'mentor' | 'learner'
}

/**
 * Create a test session directly in the database (for development testing)
 */
export async function createTestSession(config: TestSessionConfig): Promise<number> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test sessions can only be created in development mode')
  }

  try {
    const { db } = await import('@/db')
    const { bookingSessions, mentorSkills } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')

    // Find the mentor's skill
    const [skill] = await db
      .select({ 
        id: mentorSkills.id,
        mentorId: mentorSkills.mentorId 
      })
      .from(mentorSkills)
      .where(
        and(
          eq(mentorSkills.skillName, config.skillName),
          eq(mentorSkills.ratePerHour, config.ratePerHour)
        )
      )
      .limit(1)

    if (!skill) {
      throw new Error(`Skill ${config.skillName} not found for mentor`)
    }

    // Calculate total cost
    const totalCost = Math.ceil((config.durationMinutes / 60) * config.ratePerHour)

    // Create the session
    const [session] = await db
      .insert(bookingSessions)
      .values({
        learnerId: config.learnerUserId,
        mentorId: skill.mentorId,
        mentorSkillId: skill.id,
        skillName: config.skillName,
        scheduledDate: config.scheduledDate,
        durationMinutes: config.durationMinutes,
        totalCostCredits: totalCost,
        status: 'pending',
        sessionNotes: 'Test session created for development testing',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        agoraChannelName: `test_session_${Date.now()}`,
      })
      .returning({ id: bookingSessions.id })

    return session.id
  } catch (error) {
    console.error('Failed to create test session:', error)
    throw error
  }
}

/**
 * Get test users for session testing
 */
export async function getTestUsers(): Promise<{ mentor: TestUser; learner: TestUser }> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test users can only be accessed in development mode')
  }

  const { db } = await import('@/db')
  const { users } = await import('@/db/schema')
  const { eq } = await import('drizzle-orm')

  const [mentor] = await db
    .select()
    .from(users)
    .where(eq(users.email, process.env.TEST_MENTOR_EMAIL || 'testmentor@skillbridge.dev'))
    .limit(1)

  const [learner] = await db
    .select()
    .from(users)
    .where(eq(users.email, process.env.TEST_LEARNER_EMAIL || 'testlearner@skillbridge.dev'))
    .limit(1)

  if (!mentor || !learner) {
    throw new Error('Test users not found. Run the setup script first.')
  }

  return {
    mentor: {
      id: mentor.id,
      email: mentor.email,
      firstName: mentor.firstName,
      lastName: mentor.lastName,
      role: mentor.role as 'mentor'
    },
    learner: {
      id: learner.id,
      email: learner.email,
      firstName: learner.firstName,
      lastName: learner.lastName,
      role: learner.role as 'learner'
    }
  }
}

/**
 * Quickly accept a test session (bypass normal flow)
 */
export async function acceptTestSession(sessionId: number): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test session acceptance only available in development mode')
  }

  const { db } = await import('@/db')
  const { bookingSessions } = await import('@/db/schema')
  const { eq } = await import('drizzle-orm')

  await db
    .update(bookingSessions)
    .set({
      status: 'confirmed',
      mentorResponseAt: new Date(),
      mentorResponseMessage: 'Auto-accepted for testing',
    })
    .where(eq(bookingSessions.id, sessionId))

  console.log(`✅ Test session ${sessionId} automatically accepted`)
}

/**
 * Update session to upcoming status (for immediate testing)
 */
export async function makeSessionUpcoming(sessionId: number): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test session updates only available in development mode')
  }

  const { db } = await import('@/db')
  const { bookingSessions } = await import('@/db/schema')
  const { eq } = await import('drizzle-orm')

  await db
    .update(bookingSessions)
    .set({
      status: 'upcoming',
      scheduledDate: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
    })
    .where(eq(bookingSessions.id, sessionId))

  console.log(`✅ Test session ${sessionId} updated to upcoming status`)
}

/**
 * Complete setup for a test session (create → accept → make upcoming)
 */
export async function setupCompleteTestSession(
  skillName: string = 'JavaScript Debugging',
  durationMinutes: number = 60,
  ratePerHour: number = 50
): Promise<{ sessionId: number; mentor: TestUser; learner: TestUser }> {
  console.log('🧪 Setting up complete test session...')

  // Get test users
  const { mentor, learner } = await getTestUsers()
  console.log(`👨‍💼 Mentor: ${mentor.firstName} ${mentor.lastName} (${mentor.email})`)
  console.log(`👨‍🎓 Learner: ${learner.firstName} ${learner.lastName} (${learner.email})`)

  // Create session
  const sessionId = await createTestSession({
    mentorUserId: mentor.id,
    learnerUserId: learner.id,
    skillName,
    durationMinutes,
    ratePerHour,
    scheduledDate: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  })
  console.log(`📅 Session created with ID: ${sessionId}`)

  // Accept session
  await acceptTestSession(sessionId)
  console.log(`✅ Session accepted`)

  // Make it upcoming
  await makeSessionUpcoming(sessionId)
  console.log(`⏰ Session set to upcoming`)

  console.log(`\n🎉 Test session ready! Join at: /sessions/${sessionId}`)
  console.log(`📱 Open two browsers:`)
  console.log(`   Chrome: Login as ${mentor.email}`)
  console.log(`   Firefox: Login as ${learner.email}`)
  console.log(`   Both navigate to: /sessions/${sessionId}`)

  return { sessionId, mentor, learner }
}

/**
 * Browser automation helper (if using Playwright/Puppeteer)
 */
export const browserTestConfig = {
  mentor: {
    browser: 'chromium',
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  learner: {
    browser: 'firefox',
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101'
  }
}

/**
 * Mock media constraints for testing (avoids camera/mic conflicts)
 */
export const mockMediaConstraints = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user',
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}

export default {
  createTestSession,
  getTestUsers,
  acceptTestSession,
  makeSessionUpcoming,
  setupCompleteTestSession,
  browserTestConfig,
  mockMediaConstraints
}