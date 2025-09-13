import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { learners, creditPurchases, creditTransactions } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let user
  try {
    user = verify(token, process.env.JWT_SECRET!) as { id: number; role: string }
    if (user.role !== "learner") {
      return NextResponse.json({ error: "Forbidden - learners only" }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const { credits } = await req.json()
  
  if (!credits || credits <= 0) {
    return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 })
  }

  try {
    await db.transaction(async (tx) => {
      // Get current learner balance
      const [currentLearner] = await tx
        .select({ creditsBalance: learners.creditsBalance })
        .from(learners)
        .where(eq(learners.userId, user.id))
        .limit(1)

      if (!currentLearner) {
        throw new Error(`Learner not found for userId: ${user.id}`)
      }

      console.log(`[TEST_CREDIT] Before: User ${user.id} has ${currentLearner.creditsBalance} credits`)

      // Add credits to learner balance
      await tx
        .update(learners)
        .set({
          creditsBalance: sql`${learners.creditsBalance} + ${credits}`,
        })
        .where(eq(learners.userId, user.id))

      // Record credit transaction
      await tx.insert(creditTransactions).values({
        userId: user.id,
        type: 'purchase',
        direction: 'credit',
        amount: credits,
        balanceBefore: currentLearner.creditsBalance,
        balanceAfter: currentLearner.creditsBalance + credits,
        description: `TEST: Manual credit addition - ${credits} credits`,
        metadata: {
          testMode: true,
          adminGranted: true
        },
      })

      console.log(`[TEST_CREDIT] After: User ${user.id} should have ${currentLearner.creditsBalance + credits} credits`)
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