import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/db";
import { creditPurchases, learners } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Debug endpoint to check recent credit purchases
 * Helps diagnose if webhooks are being processed
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get learner ID
    const [learner] = await db
      .select()
      .from(learners)
      .where(eq(learners.userId, session.id))
      .limit(1);

    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 });
    }

    // Get recent purchases
    const purchases = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, session.id))
      .orderBy(desc(creditPurchases.createdAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      currentCredits: learner.creditsBalance,
      recentPurchases: purchases.map(p => ({
        id: p.id,
        credits: p.amountCredits,
        amount: p.amountPaidUsd,
        status: p.paymentStatus,
        provider: p.provider,
        externalId: p.externalId,
        xenditInvoiceId: p.xenditInvoiceId,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
        hasWebhookData: !!p.webhookData
      }))
    });
  } catch (error) {
    console.error("[DEBUG] Error fetching purchases:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
