import { db } from "@/db"
import { users, creditTransactions, withdrawalRequests, withdrawalSecurityEvents } from "@/db/schema"
import { eq, and, desc, sum, gte } from "drizzle-orm"

// Daily withdrawal limits
const DAILY_LIMITS = {
  standard: 500, // $500 per day for standard users
  premium: 1000, // $1000 per day for premium users
  verified: 2000, // $2000 per day for verified users
} as const

// Monthly withdrawal limits  
const MONTHLY_LIMITS = {
  standard: 2000, // $2000 per month for standard users
  premium: 5000, // $5000 per month for premium users
  verified: 10000, // $10000 per month for verified users
} as const

type UserTier = keyof typeof DAILY_LIMITS

export interface SecurityValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

export async function validateWithdrawalSecurity(
  userId: number,
  requestedCredits: number,
  requestedAmountUsd: number
): Promise<SecurityValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  try {
    // Get user information
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        email: users.email,
        createdAt: users.createdAt,
        suspendedAt: users.suspendedAt,
        blacklistedAt: users.blacklistedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      errors.push("User not found")
      return { isValid: false, errors, warnings, riskLevel: 'high' }
    }

    // Check if user is suspended or blacklisted
    if (user.suspendedAt) {
      errors.push("Account is suspended")
      riskLevel = 'high'
    }

    if (user.blacklistedAt) {
      errors.push("Account is blacklisted")
      return { isValid: false, errors, warnings, riskLevel: 'high' }
    }

    // Check account age (prevent new account abuse)
    const createdAtMs = user.createdAt?.getTime() ?? 0;
    const accountAgeMs = Date.now() - createdAtMs;
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24)
    
    if (accountAgeDays < 7) {
      warnings.push("Account is less than 7 days old")
      if (riskLevel === 'low') riskLevel = 'medium'
    }

    // Check withdrawal frequency and patterns
    const recentWithdrawals = await getRecentWithdrawals(userId)
    const suspiciousPatterns = detectSuspiciousPatterns(recentWithdrawals, requestedAmountUsd)
    
    if (suspiciousPatterns.length > 0) {
      warnings.push(...suspiciousPatterns)
      if (riskLevel === 'low') riskLevel = 'medium'
    }

    // Check daily withdrawal limits
    const dailyLimitCheck = await checkDailyWithdrawalLimit(userId, requestedAmountUsd)
    if (!dailyLimitCheck.valid) {
      errors.push(dailyLimitCheck.error!)
      riskLevel = 'high'
    }

    // Check monthly withdrawal limits
    const monthlyLimitCheck = await checkMonthlyWithdrawalLimit(userId, requestedAmountUsd)
    if (!monthlyLimitCheck.valid) {
      errors.push(monthlyLimitCheck.error!)
      riskLevel = 'high'
    }

    // Check for unusual withdrawal amounts
    const unusualAmountCheck = checkUnusualWithdrawalAmount(recentWithdrawals, requestedAmountUsd)
    if (unusualAmountCheck.warning) {
      warnings.push(unusualAmountCheck.warning)
      if (riskLevel === 'low') riskLevel = 'medium'
    }

    // Additional risk factors
    if (requestedAmountUsd > 1000) {
      warnings.push("Large withdrawal amount requested")
      if (riskLevel === 'low') riskLevel = 'medium'
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskLevel
    }

  } catch (error) {
    console.error("Error validating withdrawal security:", error)
    return {
      isValid: false,
      errors: ["Security validation failed"],
      warnings: [],
      riskLevel: 'high'
    }
  }
}

async function getRecentWithdrawals(userId: number) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  const withdrawals = await db
    .select()
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.userId, userId), // FIXED: Changed from mentorId to userId
        gte(withdrawalRequests.createdAt, thirtyDaysAgo)
      )
    )
    .orderBy(desc(withdrawalRequests.createdAt))
    
  return withdrawals
}

function detectSuspiciousPatterns(withdrawals: any[], currentAmount: number): string[] {
  const warnings: string[] = []
  
  if (withdrawals.length === 0) return warnings
  
  // Check for rapid successive withdrawals
  const recentWithdrawals = withdrawals.filter(w => {
    const hoursSince = (Date.now() - w.createdAt.getTime()) / (1000 * 60 * 60)
    return hoursSince < 24
  })
  
  if (recentWithdrawals.length >= 3) {
    warnings.push("Multiple withdrawal requests in 24 hours")
  }
  
  // Check for round number patterns (potential automation)
  const roundAmounts = withdrawals.filter(w => {
    const amount = parseFloat(w.requestedAmountUsd.toString())
    return amount % 50 === 0 || amount % 100 === 0
  })
  
  if (roundAmounts.length >= 3) {
    warnings.push("Pattern of round withdrawal amounts detected")
  }
  
  // Check for escalating withdrawal amounts
  if (withdrawals.length >= 3) {
    const amounts = withdrawals.slice(0, 3).map(w => parseFloat(w.requestedAmountUsd.toString()))
    const isEscalating = amounts.every((amount, index) => 
      index === 0 || amount > amounts[index - 1]
    )
    
    if (isEscalating && currentAmount > amounts[0] * 2) {
      warnings.push("Rapidly escalating withdrawal amounts")
    }
  }
  
  return warnings
}

async function checkDailyWithdrawalLimit(userId: number, requestedAmount: number): Promise<{valid: boolean, error?: string}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dailyWithdrawals = await db
    .select()
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.userId, userId), // FIXED: Changed from mentorId to userId
        gte(withdrawalRequests.createdAt, today),
        eq(withdrawalRequests.status, 'completed')
      )
    )
  
  const todaysTotal = dailyWithdrawals.reduce((sum, w) => 
    sum + parseFloat(w.requestedAmountUsd.toString()), 0
  )
  
  const userTier: UserTier = 'standard' // You would determine this based on user verification level
  const dailyLimit = DAILY_LIMITS[userTier]
  
  if (todaysTotal + requestedAmount > dailyLimit) {
    return {
      valid: false,
      error: `Daily withdrawal limit exceeded. Limit: $${dailyLimit}, Current: $${todaysTotal.toFixed(2)}`
    }
  }
  
  return { valid: true }
}

async function checkMonthlyWithdrawalLimit(userId: number, requestedAmount: number): Promise<{valid: boolean, error?: string}> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const monthlyWithdrawals = await db
    .select()
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.userId, userId), // FIXED: Changed from mentorId to userId
        gte(withdrawalRequests.createdAt, startOfMonth),
        eq(withdrawalRequests.status, 'completed')
      )
    )
  
  const monthlyTotal = monthlyWithdrawals.reduce((sum, w) => 
    sum + parseFloat(w.requestedAmountUsd.toString()), 0
  )
  
  const userTier: UserTier = 'standard' // You would determine this based on user verification level
  const monthlyLimit = MONTHLY_LIMITS[userTier]
  
  if (monthlyTotal + requestedAmount > monthlyLimit) {
    return {
      valid: false,
      error: `Monthly withdrawal limit exceeded. Limit: $${monthlyLimit}, Current: $${monthlyTotal.toFixed(2)}`
    }
  }
  
  return { valid: true }
}

function checkUnusualWithdrawalAmount(withdrawals: any[], requestedAmount: number): {warning?: string} {
  if (withdrawals.length === 0) return {}
  
  const amounts = withdrawals.map(w => parseFloat(w.requestedAmountUsd.toString()))
  const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
  
  // Flag if current withdrawal is more than 5x the average
  if (requestedAmount > avgAmount * 5) {
    return { warning: `Withdrawal amount significantly higher than average ($${avgAmount.toFixed(2)})` }
  }
  
  return {}
}

export async function logWithdrawalSecurityEvent(
  userId: number,
  eventType: string,
  details: any,
  riskLevel: 'low' | 'medium' | 'high',
  withdrawalId?: number
) {
  try {
    // Log to console for immediate debugging
    console.log('WITHDRAWAL_SECURITY_EVENT', {
      userId,
      eventType,
      details,
      riskLevel,
      withdrawalId,
      timestamp: new Date().toISOString()
    })
    
    // Store in database for tracking and analysis
    await db.insert(withdrawalSecurityEvents).values({
      userId,
      withdrawalId: withdrawalId || null,
      eventType,
      riskLevel,
      eventData: details,
      description: `Security event: ${eventType} - Risk level: ${riskLevel}`,
    })
  } catch (error) {
    console.error('Failed to log withdrawal security event:', error)
  }
}

// Helper function to get user tier based on verification status
export async function getUserTier(userId: number): Promise<UserTier> {
  const [user] = await db
    .select({
      stripeAccountStatus: users.stripeAccountStatus,
      createdAt: users.createdAt,
      // Add other verification fields as needed
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return 'standard'

  // Account age factor
  const createdAtMs = user.createdAt?.getTime() ?? 0;
  const accountAgeMs = Date.now() - createdAtMs;
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24)
  
  // Determine tier based on various factors
  if (user.stripeAccountStatus === 'active' && accountAgeDays > 90) {
    return 'verified'
  } else if (user.stripeAccountStatus === 'active' && accountAgeDays > 30) {
    return 'premium'
  }
  
  return 'standard'
}