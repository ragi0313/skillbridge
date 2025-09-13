import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Xendit } from "xendit-node";
import { db } from "@/db";
import { learners, creditPurchases, creditTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const xendit = new Xendit({ 
  secretKey: process.env.XENDIT_SECRET_KEY! 
});

function verifyXenditWebhook(rawBody: string, signature: string, webhookToken: string): boolean {
  const hash = crypto.createHmac('sha256', webhookToken).update(rawBody).digest('hex');
  return hash === signature;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headerStore = await headers();
  const signature = headerStore.get("x-callback-token");
  
  console.log("[XENDIT_WEBHOOK] Received webhook with headers:", {
    signature: signature ? "present" : "missing",
    contentType: headerStore.get("content-type"),
  });
  
  if (!signature) {
    console.error("Missing webhook signature");
    return new NextResponse("Webhook Error", { status: 400 });
  }

  // Verify webhook signature (skip verification in test mode for debugging)
  const isTestMode = process.env.XENDIT_SECRET_KEY?.includes('xnd_development');
  if (!isTestMode && !verifyXenditWebhook(body, signature, process.env.XENDIT_WEBHOOK_TOKEN!)) {
    console.error("Webhook signature verification failed");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
    console.log("[XENDIT_WEBHOOK] Parsed event:", {
      event: event.event,
      invoiceId: event.data?.id,
      amount: event.data?.amount,
      currency: event.data?.currency,
      status: event.data?.status,
      metadata: event.data?.metadata
    });
  } catch (err) {
    console.error("Invalid JSON payload:", err);
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Handle invoice paid event
  if (event.event === "invoice.paid") {
    const invoice = event.data;
    const metadata = invoice.metadata;
    const learnerId = metadata?.userId;
    const credits = Number(metadata?.credits);

    if (!learnerId || !credits) {
      console.error("Missing metadata in invoice:", metadata);
      console.log("Full webhook event:", JSON.stringify(event, null, 2));
      return NextResponse.json({ received: true });
    }

    try {
      await db.transaction(async (tx) => {
        // Calculate financial allocation in PHP
        const totalAmountPhp = invoice.amount || invoice.paidAmount || invoice.totalAmount;
        const platformFeePhp = totalAmountPhp * 0.2; // 20% platform fee
        const mentorAvailablePhp = totalAmountPhp * 0.8; // 80% for mentor payouts
        
        // Get current learner balance for transaction tracking
        const [currentLearner] = await tx
          .select({ creditsBalance: learners.creditsBalance })
          .from(learners)
          .where(eq(learners.userId, parseInt(learnerId)))
          .limit(1);
        
        if (!currentLearner) {
          throw new Error(`Learner not found for userId: ${learnerId}`);
        }

        // 1. Record the credit purchase with financial tracking
        await tx.insert(creditPurchases).values({
          userId: parseInt(learnerId),
          amountCredits: credits,
          amountPaidUsd: totalAmountPhp.toString(), // Using PHP amount in USD field for now
          localAmount: totalAmountPhp.toString(),
          localCurrency: invoice.currency || 'PHP',
          provider: 'xendit',
          paymentStatus: 'completed',
          paymentReference: invoice.paymentId || invoice.payment_id || null,
          externalId: invoice.externalId || invoice.external_id,
          invoiceUrl: invoice.invoiceUrl || invoice.invoice_url,
          xenditInvoiceId: invoice.id,
          xenditPaymentId: invoice.paymentId || invoice.payment_id || null,
          webhookData: event,
          completedAt: new Date(invoice.paidAt || invoice.paid_at),
        });

        // 2. Add credits to learner balance
        await tx
          .update(learners)
          .set({
            creditsBalance: sql`${learners.creditsBalance} + ${credits}`,
          })
          .where(eq(learners.userId, parseInt(learnerId)));

        // 3. Record credit transaction for learner
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
            xenditPaymentId: invoice.paymentId || invoice.payment_id,
            xenditExternalId: invoice.externalId || invoice.external_id,
            totalAmountPhp,
            platformFeePhp,
            mentorAvailablePhp,
            creditsPerPeso: credits / totalAmountPhp,
            paymentMethod: invoice.paymentMethod || invoice.payment_method,
            currency: invoice.currency
          },
        });

        console.log(`[XENDIT_CREDIT_PURCHASE] User ${learnerId}: ${credits} credits purchased for ₱${totalAmountPhp} (Platform: ₱${platformFeePhp}, Mentors: ₱${mentorAvailablePhp})`);
      });
    } catch (error) {
      console.error("Failed to process Xendit credit purchase:", error);
      return NextResponse.json({ error: "Purchase processing failed" }, { status: 500 });
    }
  }

  // Handle invoice expired event
  if (event.event === "invoice.expired") {
    const invoice = event.data;
    const metadata = invoice.metadata;
    const learnerId = metadata?.userId;

    if (learnerId) {
      try {
        // Update any pending credit purchase records to failed
        await db
          .update(creditPurchases)
          .set({ 
            paymentStatus: 'cancelled',
            webhookData: event 
          })
          .where(eq(creditPurchases.externalId, invoice.externalId || invoice.external_id));

        console.log(`[XENDIT_INVOICE_EXPIRED] Invoice ${invoice.id} expired for user ${learnerId}`);
      } catch (error) {
        console.error("Failed to handle expired invoice:", error);
      }
    }
  }

  // Handle invoice payment failed event
  if (event.event === "invoice.payment_failed") {
    const invoice = event.data;
    const metadata = invoice.metadata;
    const learnerId = metadata?.userId;

    if (learnerId) {
      try {
        // Update credit purchase record to failed
        await db
          .update(creditPurchases)
          .set({ 
            paymentStatus: 'failed',
            webhookData: event 
          })
          .where(eq(creditPurchases.externalId, invoice.externalId || invoice.external_id));

        console.log(`[XENDIT_PAYMENT_FAILED] Payment failed for invoice ${invoice.id}, user ${learnerId}`);
      } catch (error) {
        console.error("Failed to handle payment failure:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}