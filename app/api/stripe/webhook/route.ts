// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { learners } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text();
  const headerStore = await headers()
  const sig = headerStore.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  // 🎯 Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;
    const learnerId = metadata?.userId;
    const credits = Number(metadata?.credits);

    if (!learnerId || !credits) {
      console.error("Missing metadata:", metadata);
      return NextResponse.json({ received: true });
    }

    try {
      await db
        .update(learners)
        .set({
          creditsBalance: sql`${learners.creditsBalance} + ${credits}`,
        })
        .where(eq(learners.userId, parseInt(learnerId)));
    } catch (error) {
      console.error("Failed to update learner credits:", error);
    }
  }

  return NextResponse.json({ received: true });
}
