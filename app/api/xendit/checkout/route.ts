import { Xendit } from "xendit-node"
import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { creditPackages } from "@/lib/payments/creditPackages"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { db } from "@/db"
import { learners, creditPurchases, creditTransactions } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { logUserAction, AUDIT_ACTIONS, ENTITY_TYPES } from "@/lib/admin/audit-log"

const xendit = new Xendit({ 
  secretKey: process.env.XENDIT_SECRET_KEY! 
})

const { Invoice } = xendit

async function handleCheckout(req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let user
  try {
    user = verify(token, process.env.JWT_SECRET!) as { id: number; role: string }
    if (user.role !== "learner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const { packageId } = await req.json()
  const creditPack = creditPackages.find((p) => p.id === packageId)

  if (!creditPack) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 })
  }

  // DEMO MODE: Add credits immediately before redirecting to payment page
  // This allows the user to see credits added while still showing the Xendit flow
  try {
    await db.transaction(async (tx) => {
      // Get current learner balance
      const [currentLearner] = await tx
        .select({ userId: learners.userId, creditsBalance: learners.creditsBalance })
        .from(learners)
        .where(eq(learners.userId, user.id))
        .limit(1)

      if (!currentLearner) {
        throw new Error(`Learner not found for userId: ${user.id}`)
      }

      const credits = creditPack.credits
      const totalAmountPhp = creditPack.price
      const externalId = `demo_credit_purchase_${user.id}_${Date.now()}`

      // 1. Record the credit purchase (DEMO MODE)
      await tx.insert(creditPurchases).values({
        userId: user.id,
        amountCredits: credits,
        amountPaidUsd: totalAmountPhp.toString(),
        localAmount: totalAmountPhp.toString(),
        localCurrency: 'PHP',
        provider: 'xendit',
        paymentStatus: 'completed', // Mark as completed immediately for demo
        externalId: externalId,
        completedAt: new Date(),
      })

      // 2. Add credits to learner balance
      await tx
        .update(learners)
        .set({
          creditsBalance: sql`${learners.creditsBalance} + ${credits}`,
        })
        .where(eq(learners.userId, user.id))

      // 3. Record credit transaction
      await tx.insert(creditTransactions).values({
        userId: user.id,
        type: 'purchase',
        direction: 'credit',
        amount: credits,
        balanceBefore: currentLearner.creditsBalance,
        balanceAfter: currentLearner.creditsBalance + credits,
        description: `Credit purchase - ${credits} credits for ₱${totalAmountPhp} (Demo Mode)`,
        metadata: {
          externalId,
          totalAmountPhp,
          packageId,
          demoMode: true,
          currency: 'PHP'
        },
      })

      // Log the credit purchase
      await logUserAction({
        userId: user.id,
        action: AUDIT_ACTIONS.CREDITS_PURCHASE,
        entityType: ENTITY_TYPES.CREDITS,
        description: `User ${user.id} purchased ${credits} credits for ${totalAmountPhp} PHP (Demo Mode)`,
        metadata: {
          credits,
          amountPhp: totalAmountPhp,
          packageId,
          demoMode: true,
        },
        severity: "info",
      })

      console.log(`[DEMO MODE] ✅ Added ${credits} credits to user ${user.id} immediately`)
    })
  } catch (error) {
    console.error("Failed to add credits in demo mode:", error)
    return NextResponse.json({
      error: "Failed to add credits"
    }, { status: 500 })
  }

  // Get base URL from environment or construct from request headers
  const getBaseUrl = () => {
    // First priority: NEXT_PUBLIC_BASE_URL from env (but not if it's localhost in production)
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      // Don't use localhost URL in production
      if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        return baseUrl
      }
    }

    // Second priority: Construct from request headers
    const host = req.headers.get('host')
    const protocol = req.headers.get('x-forwarded-proto') || 'https'

    if (host) {
      // Avoid localhost in production
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'https://skillbridge-2m1e.vercel.app' // Your production domain
      }
      return `${protocol}://${host}`
    }

    // Fallback to production domain
    return 'https://skillbridge-2m1e.vercel.app'
  }

  const baseUrl = getBaseUrl()

  try {
    // Create Xendit invoice using the correct API structure
    const xenditExternalId = `credit_purchase_${user.id}_${Date.now()}`
    const invoice = await Invoice.createInvoice({
      data: {
        externalId: xenditExternalId,
        amount: creditPack.price,
        payerEmail: 'customer@example.com', // Required field
        description: `SkillBridge Credit Purchase - ${creditPack.name}`,
        invoiceDuration: 86400, // 24 hours
        successRedirectUrl: `${baseUrl}/payment/success`,
        failureRedirectUrl: `${baseUrl}/pricing`,
        currency: 'PHP',
        items: [{
          name: creditPack.name,
          quantity: 1,
          price: creditPack.price,
          category: 'Digital Credits'
        }],
        metadata: {
          userId: user.id.toString(),
          credits: creditPack.credits.toString(),
          packageId: packageId,
          platform: 'bridgementor',
          demoMode: 'true' // Mark as demo mode
        },
        // Enable Philippine payment methods
        paymentMethods: [
          'CREDIT_CARD',
          'BCA',
          'BNI',
          'BRI',
          'MANDIRI',
          'PERMATA',
          'ALFAMART',
          'INDOMARET',
          'OVO',
          'DANA',
          'LINKAJA',
          'SHOPEEPAY',
          'GCASH',
          'GRABPAY',
          'PAYMAYA'
        ]
      }
    })

    // Update the creditPurchase record with Xendit invoice ID
    // This ensures webhook idempotency check works and prevents duplicate credit addition
    const [recentPurchase] = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, user.id))
      .orderBy(sql`${creditPurchases.createdAt} DESC`)
      .limit(1)

    if (recentPurchase) {
      await db
        .update(creditPurchases)
        .set({
          xenditInvoiceId: invoice.id,
          externalId: xenditExternalId,
          invoiceUrl: invoice.invoiceUrl || null,
        })
        .where(eq(creditPurchases.id, recentPurchase.id))

      console.log(`[DEMO MODE] Updated purchase record with Xendit invoice ID: ${invoice.id}`)
    }

    return NextResponse.json({
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.id,
      externalId: invoice.externalId
    }, { status: 200 })

  } catch (error) {
    console.error("Xendit checkout error:", error)
    return NextResponse.json({
      error: "Failed to create payment invoice"
    }, { status: 500 })
  }
}

// Apply booking rate limiting to checkout
export const POST = withRateLimit("booking", handleCheckout)