import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

// POST - Create Stripe Express account for user
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { returnUrl, refreshUrl } = await request.json()

    if (!returnUrl || !refreshUrl) {
      return NextResponse.json({ 
        error: "returnUrl and refreshUrl are required" 
      }, { status: 400 })
    }

    // Get user details
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        stripeAccountId: users.stripeAccountId // Check if already exists
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let accountId = user.stripeAccountId

    // Create new account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: user.firstName || undefined,
          last_name: user.lastName || undefined,
          email: user.email,
        },
        metadata: {
          user_id: session.id.toString(),
          platform: 'skillbridge'
        }
      })

      accountId = account.id

      // Save to database
      await db
        .update(users)
        .set({ 
          stripeAccountId: account.id,
          stripeAccountStatus: 'pending'
        })
        .where(eq(users.id, session.id))
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      accountId: accountId,
      onboardingUrl: accountLink.url
    })

  } catch (error) {
    console.error("Error creating Stripe Express account:", error)
    
    // More specific error handling
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: `Stripe error: ${error.message}` 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: "Failed to create Stripe account" 
    }, { status: 500 })
  }
}

// GET - Get Stripe account status and dashboard link
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Stripe account ID from database instead of query parameter
    const [user] = await db
      .select({
        stripeAccountId: users.stripeAccountId,
        stripeAccountStatus: users.stripeAccountStatus
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)

    if (!user?.stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account found" }, { status: 404 })
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(user.stripeAccountId)

    // Create login link for dashboard access
    let loginLink = null
    try {
      if (account.charges_enabled && account.payouts_enabled) {
        const link = await stripe.accounts.createLoginLink(user.stripeAccountId)
        loginLink = link.url
      }
    } catch (linkError) {
      console.warn("Could not create dashboard login link:", linkError)
    }

    // Update user status in database based on current Stripe status
    const newStatus = account.payouts_enabled ? 'active' : 
                      account.details_submitted ? 'pending' : 'incomplete'
    
    if (user.stripeAccountStatus !== newStatus) {
      await db
        .update(users)
        .set({ stripeAccountStatus: newStatus })
        .where(eq(users.id, session.id))
    }

    return NextResponse.json({
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      country: account.country,
      dashboardUrl: loginLink,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || []
      }
    })

  } catch (error) {
    console.error("Error retrieving Stripe account:", error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: `Stripe error: ${error.message}` 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: "Failed to retrieve account details" 
    }, { status: 500 })
  }
}