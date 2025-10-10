import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { learners, creditPurchases, creditTransactions } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(req: NextRequest): Promise<NextResponse> {
  // SECURITY: Disable in production to prevent payment bypass
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: "Test endpoints are disabled in production for security"
    }, { status: 403 })
  }

  // Require admin access even in development
  const session = await getSession()
  if (!session || session.role !== "admin") {
    return NextResponse.json({
      error: "Forbidden - Admin only endpoint"
    }, { status: 403 })
  }

  const { invoiceData } = await req.json()
  
  // Simulate the webhook event using provided invoice data
  const event = {
    event: "invoice.paid",
    data: invoiceData
  }

  const invoice = event.data

  // Extract metadata from invoice (must be provided in invoiceData)
  const metadata = invoice.metadata || {
    userId: invoiceData.userId,
    credits: invoiceData.credits,
    packageId: invoiceData.packageId
  }

  if (!metadata.userId || !metadata.credits) {
    return NextResponse.json({
      error: "Invalid invoice data - missing userId or credits"
    }, { status: 400 })
  }
  
  const learnerId = metadata.userId
  const credits = Number(metadata.credits)

  try {
    await db.transaction(async (tx) => {
      // Calculate financial allocation in PHP
      const totalAmountPhp = invoice.amount || invoice.paid_amount
      const platformFeePhp = totalAmountPhp * 0.2
      const mentorAvailablePhp = totalAmountPhp * 0.8
      
      // Get current learner balance
      const [currentLearner] = await tx
        .select({ creditsBalance: learners.creditsBalance })
        .from(learners)
        .where(eq(learners.userId, parseInt(learnerId)))
        .limit(1)
      
      if (!currentLearner) {
        throw new Error(`Learner not found for userId: ${learnerId}`)
      }

      // Record the credit purchase
      await tx.insert(creditPurchases).values({
        userId: parseInt(learnerId),
        amountCredits: credits,
        amountPaidUsd: totalAmountPhp.toString(),
        localAmount: totalAmountPhp.toString(), 
        localCurrency: invoice.currency || 'PHP',
        provider: 'xendit',
        paymentStatus: 'completed',
        paymentReference: invoice.payment_id,
        externalId: invoice.external_id,
        invoiceUrl: invoice.success_redirect_url,
        xenditInvoiceId: invoice.id,
        xenditPaymentId: invoice.payment_id,
        webhookData: event,
        completedAt: new Date(invoice.paid_at),
      })

      // Add credits to learner balance
      await tx
        .update(learners)
        .set({
          creditsBalance: sql`${learners.creditsBalance} + ${credits}`,
        })
        .where(eq(learners.userId, parseInt(learnerId)))

      // Record credit transaction
      await tx.insert(creditTransactions).values({
        userId: parseInt(learnerId),
        type: 'purchase',
        direction: 'credit',
        amount: credits,
        balanceBefore: currentLearner.creditsBalance,
        balanceAfter: currentLearner.creditsBalance + credits,
        description: `Credit purchase - ${credits} credits for ₱${totalAmountPhp}`,
        metadata: {
          xenditInvoiceId: invoice.id,
          xenditPaymentId: invoice.payment_id,
          xenditExternalId: invoice.external_id,
          totalAmountPhp,
          platformFeePhp,
          mentorAvailablePhp,
          creditsPerPeso: credits / totalAmountPhp,
          paymentMethod: invoice.payment_method,
          currency: invoice.currency,
          simulated: true
        },
      })

      })

    return NextResponse.json({ 
      success: true,
      message: `Successfully added ${credits} credits to user ${learnerId}`,
      received: true 
    })
  } catch (error) {
    console.error("Failed to simulate webhook:", error)
    return NextResponse.json({ 
      error: "Webhook simulation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}