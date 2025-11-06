import { db } from "@/db"
import { twoFactorSettings, twoFactorCodes, users, auditLogs } from "@/db/schema"
import { eq, and, gt } from "drizzle-orm"
import crypto from "crypto"
import { send2FACodeEmail } from "@/lib/email/twoFactorMail"

/**
 * Generate a random 6-digit verification code
 */
export function generate2FACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generate a secure random session token for 2FA flow
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Check if 2FA is enabled for a user
 */
export async function is2FAEnabled(userId: number): Promise<boolean> {
  const settings = await db
    .select()
    .from(twoFactorSettings)
    .where(eq(twoFactorSettings.userId, userId))
    .limit(1)

  return settings.length > 0 && settings[0].isEnabled
}

/**
 * Enable 2FA for a user
 */
export async function enable2FA(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if 2FA settings already exist
    const existing = await db
      .select()
      .from(twoFactorSettings)
      .where(eq(twoFactorSettings.userId, userId))
      .limit(1)

    if (existing.length > 0) {
      // Update existing settings
      await db
        .update(twoFactorSettings)
        .set({
          isEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(twoFactorSettings.userId, userId))
    } else {
      // Create new settings
      await db.insert(twoFactorSettings).values({
        userId,
        isEnabled: true,
      })
    }

    // Log the action
    await db.insert(auditLogs).values({
      userId,
      action: "USER_2FA_ENABLED",
      entityType: "user",
      entityId: userId,
      details: "User enabled two-factor authentication",
      severity: "info",
    })

    return { success: true }
  } catch (error) {
    console.error("Error enabling 2FA:", error)
    return { success: false, error: "Failed to enable 2FA" }
  }
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(twoFactorSettings)
      .set({
        isEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(twoFactorSettings.userId, userId))

    // Clean up any pending verification codes
    await db.delete(twoFactorCodes).where(eq(twoFactorCodes.userId, userId))

    // Log the action
    await db.insert(auditLogs).values({
      userId,
      action: "USER_2FA_DISABLED",
      entityType: "user",
      entityId: userId,
      details: "User disabled two-factor authentication",
      severity: "info",
    })

    return { success: true }
  } catch (error) {
    console.error("Error disabling 2FA:", error)
    return { success: false, error: "Failed to disable 2FA" }
  }
}

/**
 * Create and send a 2FA code for login
 */
export async function create2FACode(
  userId: number,
): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
  try {
    // Get user details
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (user.length === 0) {
      return { success: false, error: "User not found" }
    }

    const foundUser = user[0]

    // Check for recent codes (prevent spam) - 1 minute cooldown
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000)
    const recentCode = await db
      .select()
      .from(twoFactorCodes)
      .where(
        and(
          eq(twoFactorCodes.userId, userId),
          eq(twoFactorCodes.isUsed, false),
          gt(twoFactorCodes.createdAt, oneMinuteAgo),
        ),
      )
      .limit(1)

    if (recentCode.length > 0) {
      return {
        success: false,
        error: "A code was sent recently. Please wait before requesting a new one.",
      }
    }

    // Generate code and session token
    const code = generate2FACode()
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Save code to database
    await db.insert(twoFactorCodes).values({
      userId,
      code,
      sessionToken,
      expiresAt,
      isUsed: false,
      attempts: 0,
    })

    // Send email with code
    const emailResult = await send2FACodeEmail(foundUser.email, foundUser.firstName, code)

    if (!emailResult.success) {
      return { success: false, error: "Failed to send verification code. Please try again." }
    }

    // Log the action
    await db.insert(auditLogs).values({
      userId,
      action: "USER_2FA_CODE_SENT",
      entityType: "user",
      entityId: userId,
      details: "2FA verification code sent to user email",
      severity: "info",
    })

    return { success: true, sessionToken }
  } catch (error) {
    console.error("Error creating 2FA code:", error)
    return { success: false, error: "Failed to create verification code" }
  }
}

/**
 * Verify a 2FA code
 */
export async function verify2FACode(
  sessionToken: string,
  code: string,
): Promise<{ success: boolean; userId?: number; error?: string }> {
  try {
    // Find the verification record
    const verification = await db
      .select()
      .from(twoFactorCodes)
      .where(eq(twoFactorCodes.sessionToken, sessionToken))
      .limit(1)

    if (verification.length === 0) {
      return { success: false, error: "Invalid or expired verification session" }
    }

    const record = verification[0]

    // Check if already used
    if (record.isUsed) {
      return { success: false, error: "This code has already been used" }
    }

    // Check if expired
    if (new Date() > new Date(record.expiresAt)) {
      return { success: false, error: "This code has expired. Please request a new one." }
    }

    // Check attempts limit
    if (record.attempts >= 3) {
      // Log failed verification
      await db.insert(auditLogs).values({
        userId: record.userId,
        action: "USER_2FA_VERIFICATION_FAILED",
        entityType: "user",
        entityId: record.userId,
        details: "2FA verification failed - too many attempts",
        severity: "warning",
      })

      return { success: false, error: "Too many failed attempts. Please request a new code." }
    }

    // Verify the code
    if (record.code !== code) {
      // Increment attempts
      await db
        .update(twoFactorCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(twoFactorCodes.id, record.id))

      return { success: false, error: "Invalid verification code" }
    }

    // Mark as used
    await db
      .update(twoFactorCodes)
      .set({ isUsed: true })
      .where(eq(twoFactorCodes.id, record.id))

    // Update last verified timestamp
    await db
      .update(twoFactorSettings)
      .set({ lastVerifiedAt: new Date() })
      .where(eq(twoFactorSettings.userId, record.userId))

    // Log successful verification
    await db.insert(auditLogs).values({
      userId: record.userId,
      action: "USER_2FA_VERIFICATION_SUCCESS",
      entityType: "user",
      entityId: record.userId,
      details: "2FA verification successful",
      severity: "info",
    })

    return { success: true, userId: record.userId }
  } catch (error) {
    console.error("Error verifying 2FA code:", error)
    return { success: false, error: "Failed to verify code" }
  }
}
