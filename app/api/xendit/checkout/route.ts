import { Xendit } from "xendit-node"
import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { creditPackages } from "@/lib/payments/creditPackages"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

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

  try {
    // Create Xendit invoice using the correct API structure
    const invoice = await Invoice.createInvoice({
      data: {
        externalId: `credit_purchase_${user.id}_${Date.now()}`,
        amount: creditPack.price,
        payerEmail: 'customer@example.com', // Required field
        description: `SkillBridge Credit Purchase - ${creditPack.name}`,
        invoiceDuration: 86400, // 24 hours
        successRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        failureRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
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
          platform: 'bridgementor'
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