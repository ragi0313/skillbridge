// app/api/stripe/checkout/route.ts

import Stripe from "stripe"
import { NextRequest } from "next/server"
import { creditPackages } from "@/lib/payments/creditPackages"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  let user
  try {
    user = verify(token, process.env.JWT_SECRET!) as { id: number; role: string }
    if (user.role !== "learner") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 })
  }

  const { packageId } = await req.json()
  const creditPack = creditPackages.find((p) => p.id === packageId)

  if (!creditPack) {
    return new Response(JSON.stringify({ error: "Invalid package" }), { status: 400 })
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: creditPack.name,
          },
          unit_amount: creditPack.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      userId: user.id.toString(),
      credits: creditPack.credits.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/learner/dashboard`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
  })

  return new Response(JSON.stringify({ url: session.url }), { status: 200 })
}
