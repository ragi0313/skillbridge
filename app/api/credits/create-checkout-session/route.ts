import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"
import { creditPackages } from "@/lib/payments/creditPackages"
import Xendit from "xendit-node"

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY!,
})

const invoiceClient = xendit.Invoice

function getClientIP(req: NextRequest): string | null {
  // Get the real client IP from various headers
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp
  
  const cfConnectingIp = req.headers.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp
  
  return null
}

async function getCurrencyFromIP(ip: string) {
  console.log(`Fetching currency for IP: ${ip}`)
  
  // Using ip-api.com - free, no API key required, reliable
  const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,currency`, {
    headers: {
      'User-Agent': 'SkillBridge-App/1.0'
    }
  })
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  
  const data = await res.json()
  console.log(`IP API Response:`, data)
  
  if (data.status === 'success' && data.currency) {
    return { 
      currency: data.currency, 
      country: data.country || "Unknown" 
    }
  } else {
    throw new Error(data.message || 'Invalid response')
  }
}

async function convertUSDToCurrency(amountUSD: number, currency: string) {
  if (currency === "USD") return amountUSD
  
  console.log(`Converting ${amountUSD} USD to ${currency}`)
  
  const res = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`)
  
  if (!res.ok) {
    throw new Error(`Exchange API HTTP ${res.status}`)
  }
  
  const data = await res.json()
  console.log(`Exchange rate data available for currencies:`, Object.keys(data.rates || {}))
  
  if (data.rates && data.rates[currency]) {
    const convertedAmount = amountUSD * data.rates[currency]
    console.log(`Converted ${amountUSD} USD to ${convertedAmount} ${currency}`)
    return convertedAmount
  } else {
    throw new Error(`Currency ${currency} not found in rates`)
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let user
  try {
    user = verify(token, process.env.JWT_SECRET!) as {
      id: number
      email: string
      firstName: string
      lastName: string
    }
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { packageId, getLocalizedPriceOnly } = body
    
    const selectedPackage = creditPackages.find((pkg) => pkg.id === packageId)

    if (!selectedPackage) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 })
    }

    // Get real client IP
    const ip = getClientIP(req)
    if (!ip) {
      return NextResponse.json({ 
        error: "Unable to detect location" 
      }, { status: 400 })
    }
    
    console.log(`Using client IP: ${ip}`)
    
    // Get currency based on IP geolocation
    const { currency, country } = await getCurrencyFromIP(ip)
    console.log(`Detected currency: ${currency}, country: ${country}`)
    
    // Ensure we only use currencies supported by Xendit
    // Based on Xendit docs: PHP, USD for Philippines; IDR for Indonesia; SGD, MYR, THB, VND also supported
    const supportedCurrencies = ['PHP', 'USD', 'IDR', 'SGD', 'MYR', 'THB', 'VND']
    const finalCurrency = supportedCurrencies.includes(currency) ? currency : 'PHP'
    
    if (currency !== finalCurrency) {
      console.log(`Currency ${currency} not supported by Xendit, using ${finalCurrency}`)
    }
    
    // Convert USD price to local currency
    const convertedAmount = await convertUSDToCurrency(selectedPackage.price, finalCurrency)
    console.log(`Final converted amount: ${convertedAmount} ${finalCurrency}`)

    // If this is just a price check request, return the localized price
    if (getLocalizedPriceOnly) {
      return NextResponse.json({
        amount: Math.round(convertedAmount),
        currency: finalCurrency,
        country,
        originalPrice: selectedPackage.price,
        detectedCurrency: currency // Show what was actually detected
      })
    }

    // Create the Xendit invoice
    const invoice = await invoiceClient.createInvoice({
      data: {
        externalId: `credits-${Date.now()}-${user.id}`,
        amount: Math.round(convertedAmount),
        currency: finalCurrency,
        description: `${selectedPackage.credits} SkillBridge Credits`,
        invoiceDuration: 86400, // 24 hours
        customer: {
          email: user.email,
        },
        successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/learner/dashboard`,
        failureRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/credits-pricing?error=payment_failed`,
      },
    })

    return NextResponse.json({ 
      url: invoice.invoiceUrl,
      amount: Math.round(convertedAmount),
      currency: finalCurrency 
    })
  } catch (error) {
    console.error('API Error:', error) // Debug log
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}