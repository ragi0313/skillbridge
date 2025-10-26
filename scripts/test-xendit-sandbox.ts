/**
 * Test script to simulate Xendit webhook for credit purchase
 * This simulates what happens when a payment is completed in Xendit sandbox
 *
 * Usage:
 * 1. Make sure you're logged in as an admin
 * 2. Run: npx tsx scripts/test-xendit-sandbox.ts
 */

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

async function simulateXenditPayment() {
  console.log('🧪 Testing Xendit Sandbox Credit Purchase...\n')

  // Example: Simulate a 200 credit purchase for user ID 1 (change this to your learner's user ID)
  const testInvoiceData = {
    id: `test-invoice-${Date.now()}`,
    external_id: `credit_purchase_test_${Date.now()}`,
    user_id: '1', // Fallback
    status: 'PAID',
    amount: 2240, // Basic Pack: 200 credits for ₱2240
    paid_amount: 2240,
    paid_at: new Date().toISOString(),
    payment_id: `test-payment-${Date.now()}`,
    payment_method: 'CREDIT_CARD',
    currency: 'PHP',
    success_redirect_url: `${NEXT_PUBLIC_BASE_URL}/payment/success`,
    metadata: {
      userId: '1', // CHANGE THIS to your learner's user ID
      credits: '200', // Basic Pack
      packageId: 'basic',
      platform: 'bridgementor'
    }
  }

  console.log('📦 Test Invoice Data:')
  console.log(`   User ID: ${testInvoiceData.metadata.userId}`)
  console.log(`   Credits: ${testInvoiceData.metadata.credits}`)
  console.log(`   Amount: ₱${testInvoiceData.amount}`)
  console.log(`   Package: ${testInvoiceData.metadata.packageId}\n`)

  try {
    console.log('🚀 Sending simulated webhook to:', `${NEXT_PUBLIC_BASE_URL}/api/xendit/simulate-webhook`)

    const response = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/xendit/simulate-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoiceData: testInvoiceData
      }),
      credentials: 'include' // Important: include cookies for authentication
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ SUCCESS!')
      console.log(`   ${result.message}`)
      console.log('\n💡 Check the learner\'s credit balance in the database or dashboard')
    } else {
      console.error('❌ FAILED!')
      console.error(`   Status: ${response.status}`)
      console.error(`   Error: ${result.error}`)
      if (result.details) {
        console.error(`   Details: ${result.details}`)
      }

      if (response.status === 403) {
        console.log('\n💡 Make sure you are logged in as an ADMIN to use this test endpoint')
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error)
    console.log('\n💡 Make sure your development server is running on', NEXT_PUBLIC_BASE_URL)
  }
}

// Run the test
simulateXenditPayment()
