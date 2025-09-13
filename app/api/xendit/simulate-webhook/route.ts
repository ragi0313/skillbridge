import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { learners, creditPurchases, creditTransactions } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { invoiceData } = await req.json()
  
  // Simulate the webhook event using your actual invoice data
  const event = {
    event: "invoice.paid",
    data: invoiceData
  }

  const invoice = event.data
  const metadata = {
    userId: "3", // Your user ID from external_id: "credit_purchase_3_1757418902873"
    credits: "100", // Starter pack credits
    packageId: "starter"
  }
  
  const learnerId = metadata.userId
  const credits = Number(metadata.credits)

  console.log(`[SIMULATE_WEBHOOK] Processing payment for user ${learnerId}: ${credits} credits`)

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

      console.log(`[SIMULATE_WEBHOOK] Current balance: ${currentLearner.creditsBalance} credits`)

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

      console.log(`[SIMULATE_WEBHOOK] User ${learnerId}: ${credits} credits added! New balance: ${currentLearner.creditsBalance + credits}`)
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