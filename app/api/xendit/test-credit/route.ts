import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { learners, creditPurchases, creditTransactions } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(req: NextRequest): Promise<NextResponse> {
  // SECURITY: Disable in production to prevent free credit injection
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: "Test endpoints are disabled in production for security"
    }, { status: 403 })
  }

  const session = await getSession()

  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Require admin access even in development
  if (session.role !== "admin") {
    return NextResponse.json({
      error: "Forbidden - Admin only endpoint"
    }, { status: 403 })
  }

  const { credits, targetUserId } = await req.json()

  if (!credits || credits <= 0) {
    return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 })
  }

  const userId = targetUserId || session.id

  try {
    await db.transaction(async (tx) => {
      // Get current learner balance
      const [currentLearner] = await tx
        .select({ creditsBalance: learners.creditsBalance })
        .from(learners)
        .where(eq(learners.userId, userId))
        .limit(1)

      if (!currentLearner) {
        throw new Error(`Learner not found for userId: ${userId}`)
      }

      // Add credits to learner balance
      await tx
        .update(learners)
        .set({
          creditsBalance: sql`${learners.creditsBalance} + ${credits}`,
        })
        .where(eq(learners.userId, userId))

      // Record credit transaction
      await tx.insert(creditTransactions).values({
        userId: userId,
        type: 'purchase',
        direction: 'credit',
        amount: credits,
        balanceBefore: currentLearner.creditsBalance,
        balanceAfter: currentLearner.creditsBalance + credits,
        description: `TEST: Manual credit addition by admin ${session.id} - ${credits} credits`,
        metadata: {
          testMode: true,
          adminGranted: true,
          grantedBy: session.id
        },
      })

      })

    return NextResponse.json({ 
      success: true, 
      message: `${credits} credits added successfully` 
    })
  } catch (error) {
    console.error("Failed to add test credits:", error)
    return NextResponse.json({ 
      error: "Failed to add credits" 
    }, { status: 500 })
  }
}