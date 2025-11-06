import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Xendit } from "xendit-node";
import { db } from "@/db";
import { learners, creditPurchases, creditTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { logUserAction, AUDIT_ACTIONS, ENTITY_TYPES } from "@/lib/admin/audit-log";

const xendit = new Xendit({ 
  secretKey: process.env.XENDIT_SECRET_KEY! 
});

function verifyXenditWebhook(callbackToken: string, webhookToken: string): boolean {
  // For Xendit invoices, the X-CALLBACK-TOKEN header contains the webhook token directly
  // No HMAC signature - just a simple token comparison
  return callbackToken === webhookToken;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headerStore = await headers();
  const signature = headerStore.get("x-callback-token");

  if (!signature) {
    console.error("[SECURITY] Missing webhook signature - potential unauthorized webhook attempt");
    return new NextResponse("Webhook Error", { status: 400 });
  }

  // SECURITY: Always verify webhook signature - NEVER skip verification
  if (!process.env.XENDIT_WEBHOOK_TOKEN) {
    console.error("[SECURITY CRITICAL] XENDIT_WEBHOOK_TOKEN not configured - cannot verify webhooks");
    return new NextResponse("Server configuration error", { status: 500 });
  }

  const isValidSignature = verifyXenditWebhook(signature, process.env.XENDIT_WEBHOOK_TOKEN);

  if (!isValidSignature) {
    console.error("[SECURITY] Webhook signature verification failed - potential webhook forgery attempt", {
      signatureProvided: signature.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });

    // Log security event
    await logUserAction({
      action: 'WEBHOOK_VERIFICATION_FAILED',
      entityType: ENTITY_TYPES.SYSTEM as any,
      description: 'Xendit webhook signature verification failed - possible attack',
      metadata: {
        signature: signature.substring(0, 20),
        bodyLength: body.length,
        timestamp: new Date().toISOString()
      },
      severity: "critical",
    }).catch(err => console.error('Failed to log webhook verification failure:', err));

    return new NextResponse("Unauthorized", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
    } catch (err) {
    console.error("Invalid JSON payload:", err);
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Xendit sends webhooks in two formats:
  // 1. New format: { event: "invoice.paid", data: {...} }
  // 2. Legacy format: { status: "PAID", ... } (direct invoice object)

  let invoice;
  let eventType;

  // Check if it's the new event-based format or legacy direct format
  if (event.event) {
    // New format
    eventType = event.event;
    invoice = event.data;
    console.log(`[WEBHOOK] Received event (new format): ${eventType}`);
  } else if (event.status) {
    // Legacy format - invoice sent directly
    invoice = event;
    // Map status to event type
    if (invoice.status === "PAID") {
      eventType = "invoice.paid";
    } else if (invoice.status === "EXPIRED") {
      eventType = "invoice.expired";
    } else {
      eventType = `invoice.${invoice.status?.toLowerCase()}`;
    }
    console.log(`[WEBHOOK] Received invoice (legacy format) with status: ${invoice.status} → ${eventType}`);
  } else {
    console.error("[WEBHOOK] Unknown webhook format:", event);
    return NextResponse.json({ error: "Unknown webhook format" }, { status: 400 });
  }

  // Handle invoice paid event
  if (eventType === "invoice.paid") {
    const metadata = invoice.metadata;

    // SECURITY: Strict input validation
    const learnerIdStr = metadata?.userId;
    const creditsStr = metadata?.credits;

    // Validate learnerId is a valid integer
    const learnerId = parseInt(learnerIdStr);
    if (!learnerIdStr || isNaN(learnerId) || learnerId <= 0) {
      console.error("[SECURITY] Invalid learnerId in webhook:", { metadata, learnerId: learnerIdStr });
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Validate credits is a valid positive number
    const credits = Number(creditsStr);
    if (!creditsStr || isNaN(credits) || credits <= 0 || !Number.isInteger(credits)) {
      console.error("[SECURITY] Invalid credits amount in webhook:", { metadata, credits: creditsStr });
      return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 });
    }

    // Validate invoice ID exists for idempotency check
    if (!invoice.id) {
      console.error("[SECURITY] Missing invoice ID:", { invoice });
      return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
    }

    try {
      await db.transaction(async (tx) => {
        // SECURITY: Idempotency check - prevent duplicate processing
        const existingPurchase = await tx
          .select()
          .from(creditPurchases)
          .where(eq(creditPurchases.xenditInvoiceId, invoice.id))
          .limit(1);

        if (existingPurchase.length > 0) {
          console.log(`[WEBHOOK] Invoice ${invoice.id} already processed - idempotent response`);
          return; // Exit transaction without error, return success
        }

        // SECURITY: Verify learner exists before processing payment
        const [currentLearner] = await tx
          .select({ userId: learners.userId, creditsBalance: learners.creditsBalance })
          .from(learners)
          .where(eq(learners.userId, learnerId))
          .limit(1);

        if (!currentLearner) {
          console.error(`[SECURITY] Learner not found for userId: ${learnerId}`);
          throw new Error(`Learner not found for userId: ${learnerId}`);
        }
        // Calculate financial allocation in PHP
        const totalAmountPhp = invoice.amount || invoice.paidAmount || invoice.totalAmount;

        // Validate amount is positive
        if (!totalAmountPhp || totalAmountPhp <= 0) {
          throw new Error(`Invalid payment amount: ${totalAmountPhp}`);
        }

        const platformFeePhp = totalAmountPhp * 0.2; // 20% platform fee
        const mentorAvailablePhp = totalAmountPhp * 0.8; // 80% for mentor payouts

        // 1. Record the credit purchase with financial tracking
        await tx.insert(creditPurchases).values({
          userId: learnerId,
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
          .where(eq(learners.userId, learnerId));

        // 3. Record credit transaction for learner
        await tx.insert(creditTransactions).values({
          userId: learnerId,
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

        // Log the credit purchase
        await logUserAction({
          userId: learnerId,
          action: AUDIT_ACTIONS.CREDITS_PURCHASE,
          entityType: ENTITY_TYPES.CREDITS,
          description: `User ${learnerId} purchased ${credits} credits for ${totalAmountPhp} ${invoice.currency || 'PHP'}`,
          metadata: {
            credits,
            amountPhp: totalAmountPhp,
            currency: invoice.currency || 'PHP',
            invoiceId: invoice.id,
            paymentId: invoice.paymentId || invoice.payment_id,
            externalId: invoice.externalId || invoice.external_id,
          },
          severity: "info",
        })
      });

      console.log(`[WEBHOOK SUCCESS] ✅ Added ${credits} credits to user ${learnerId} (Invoice: ${invoice.id})`);
    } catch (error) {
      console.error("[WEBHOOK ERROR] Failed to process Xendit credit purchase:", error);
      return NextResponse.json({ error: "Purchase processing failed" }, { status: 500 });
    }
  }

  // Handle invoice expired event
  if (eventType === "invoice.expired") {
    const metadata = invoice.metadata;
    const learnerId = metadata?.userId;

    if (learnerId) {
      try {
        // Update any pending credit purchase records to cancelled
        await db
          .update(creditPurchases)
          .set({
            paymentStatus: 'cancelled',
            webhookData: event
          })
          .where(eq(creditPurchases.externalId, invoice.externalId || invoice.external_id));

        } catch (error) {
        console.error("Failed to handle expired invoice:", error);
      }
    }
  }

  // Handle invoice payment failed event
  if (eventType === "invoice.payment_failed" || eventType === "invoice.failed") {
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

        } catch (error) {
        console.error("Failed to handle payment failure:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}