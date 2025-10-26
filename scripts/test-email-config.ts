/**
 * Email Configuration Diagnostic Tool
 *
 * Run this to check your email setup:
 * npx tsx scripts/test-email-config.ts
 */

import 'dotenv/config'

async function checkEmailConfig() {
  console.log('🔍 Checking Email Configuration...\n')

  // Check environment variables
  console.log('Environment Variables:')
  console.log('✓ RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set ✅' : 'Missing ❌')
  console.log('✓ FROM_EMAIL:', process.env.FROM_EMAIL || 'Missing ❌')
  console.log('✓ NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || 'Missing ❌')
  console.log('')

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set!')
    return
  }

  if (!process.env.FROM_EMAIL) {
    console.error('❌ FROM_EMAIL is not set!')
    return
  }

  // Test Resend API
  console.log('🧪 Testing Resend API Connection...\n')

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Get API key info
    const response = await fetch('https://api.resend.com/api-keys', {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      }
    })

    if (response.ok) {
      console.log('✅ Resend API connection successful!')
    } else {
      console.log('⚠️ Resend API connection issue:', response.status)
    }

    // Try sending a test email
    console.log('\n📧 Attempting to send test email...')
    console.log('From:', process.env.FROM_EMAIL)
    console.log('To: test@resend.dev (Resend test address)\n')

    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: 'delivered@resend.dev', // Resend's test address
      subject: 'Email Configuration Test',
      html: '<p>If you see this, your email configuration is working!</p>'
    })

    console.log('✅ Test email sent successfully!')
    console.log('Email ID:', result.data?.id)
    console.log('\n📊 Next Steps:')
    console.log('1. Check your Resend dashboard: https://resend.com/emails')
    console.log('2. Look for email ID:', result.data?.id)
    console.log('3. Check delivery status')
    console.log('\n💡 Common Issues:')
    console.log('- Sandbox mode: Can only send to verified addresses')
    console.log('- Need production access: Contact Resend support')
    console.log('- Check spam folder')

  } catch (error: any) {
    console.error('❌ Error:', error.message)

    if (error.message.includes('not found')) {
      console.log('\n💡 Solution: Install Resend package')
      console.log('   npm install resend')
    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.log('\n💡 Solution: Check your RESEND_API_KEY')
      console.log('   - Go to https://resend.com/api-keys')
      console.log('   - Copy the correct API key')
      console.log('   - Update your .env file')
    } else if (error.message.includes('domain')) {
      console.log('\n💡 Solution: Verify your domain')
      console.log('   - Go to https://resend.com/domains')
      console.log('   - Add/verify your domain')
      console.log('   - Make sure FROM_EMAIL matches your domain')
    } else {
      console.log('\n💡 Check Resend dashboard for more details')
    }
  }
}

checkEmailConfig()
