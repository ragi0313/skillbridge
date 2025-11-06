import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { learners, creditPurchases, creditTransactions } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * DEV/TEST ONLY: Manually add credits to user account
 * This bypasses Xendit payment for testing purposes
 *
 * IMPORTANT: This should be disabled or secured in production
 */
export async function POST(req: NextRequest) {
  try {
    // Get current user session
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow learners to add credits
    if (session.role !== "learner") {
      return NextResponse.json({ error: "Only learners can purchase credits" }, { status: 403 })
    }

    const body = await req.json()
    const { credits, packageId } = body

    // Validate input
    if (!credits || credits <= 0 || credits > 1000) {
      return NextResponse.json({ error: "Invalid credits amount (1-1000)" }, { status: 400 })
    }

    // Get learner
    const [learner] = await db
      .select()
      .from(learners)
      .where(eq(learners.userId, session.id))
      .limit(1)

    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 })
    }

    // Calculate amounts (simulate real payment)
    const pricePerCredit = 10 // ₱10 per credit
    const totalAmount = credits * pricePerCredit
    const platformFee = totalAmount * 0.2 // 20% platform fee
    const mentorAvailable = totalAmount * 0.8 // 80% for mentor payouts

    // Add credits in a transaction
    await db.transaction(async (tx) => {
      // 1. Record the "purchase"
      await tx.insert(creditPurchases).values({
        userId: session.id,
        amountCredits: credits,
        amountPaidUsd: totalAmount.toString(),
        localAmount: totalAmount.toString(),
        localCurrency: "PHP",
        provider: "test_manual",
        paymentStatus: "completed",
        externalId: `test_purchase_${session.id}_${Date.now()}`,
        completedAt: new Date(),
        metadata: {
          test: true,
          manual: true,
          packageId,
          totalAmountPhp: totalAmount,
          platformFeePhp: platformFee,
          mentorAvailablePhp: mentorAvailable,
          note: "TEST MODE - No real payment made"
        }
      })

      // 2. Update learner credits balance
      await tx
        .update(learners)
        .set({
          creditsBalance: learner.creditsBalance + credits,
        })
        .where(eq(learners.userId, session.id))

      // 3. Record credit transaction
      await tx.insert(creditTransactions).values({
        userId: session.id,
        type: 'purchase',
        direction: 'credit',
        amount: credits,
        balanceBefore: learner.creditsBalance,
        balanceAfter: learner.creditsBalance + credits,
        description: `TEST: Manual credit addition - ${credits} credits`,
        metadata: {
          test: true,
          manual: true,
          packageId,
          totalAmountPhp: totalAmount,
          note: "Development/test mode purchase - no real payment"
        }
      })
    })

    console.log(`[DEV] Manually added ${credits} credits to user ${session.id}`)

    return NextResponse.json({
      success: true,
      message: `Successfully added ${credits} credits`,
      newBalance: learner.creditsBalance + credits,
      test: true
    })

  } catch (error) {
    console.error("[DEV] Error adding credits:", error)
    return NextResponse.json(
      { error: "Failed to add credits" },
      { status: 500 }
    )
  }
}
