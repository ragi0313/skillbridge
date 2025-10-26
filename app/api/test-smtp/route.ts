import { NextResponse } from "next/server"
import { sendEmail, verifyEmailConnection, getEmailProviderInfo } from "@/lib/email"

/**
 * Test SMTP email endpoint
 * GET /api/test-smtp?to=your-email@example.com
 *
 * This endpoint tests the unified email service
 */
export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: "Test endpoint disabled in production"
    }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const to = searchParams.get("to")

  // Get provider info
  const providerInfo = getEmailProviderInfo()

  if (!to) {
    return NextResponse.json({
      error: "Please provide 'to' parameter",
      example: "/api/test-smtp?to=your-email@example.com",
      currentProvider: providerInfo
    }, { status: 400 })
  }

  // Verify connection first
  console.log('🔍 Verifying email connection...')
  const connectionCheck = await verifyEmailConnection()

  if (!connectionCheck.success) {
    return NextResponse.json({
      error: "Email service not properly configured",
      details: connectionCheck.error,
      provider: providerInfo,
      instructions: providerInfo.provider === 'smtp' ? [
        "1. Check SMTP_HOST is correct (GoDaddy: smtpout.secureserver.net)",
        "2. Verify SMTP_PORT (usually 465 for SSL or 587 for TLS)",
        "3. Ensure SMTP_USER and SMTP_PASSWORD are correct",
        "4. Make sure SMTP_SECURE matches your port (true for 465)",
        "5. Check your GoDaddy email settings allow SMTP access"
      ] : [
        "1. Verify RESEND_API_KEY is set",
        "2. Check FROM_EMAIL is configured"
      ]
    }, { status: 500 })
  }

  try {
    console.log('📧 Sending test email...')
    const result = await sendEmail({
      to,
      subject: `Email Service Test - ${new Date().toLocaleTimeString()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .success {
              background: #d1fae5;
              border: 2px solid #10b981;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .info {
              background: #f3f4f6;
              border-radius: 6px;
              padding: 15px;
              margin: 15px 0;
            }
            .provider {
              background: #dbeafe;
              border: 2px solid #3b82f6;
              border-radius: 6px;
              padding: 15px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Email Service is Working!</h1>
            <p><strong>Congratulations!</strong> Your email service is properly configured and working.</p>
          </div>

          <div class="provider">
            <h3>📧 Email Provider: ${providerInfo.provider.toUpperCase()}</h3>
            <p>Your emails are being sent via <strong>${providerInfo.provider === 'smtp' ? 'SMTP (Direct Email Server)' : 'Resend API'}</strong></p>
          </div>

          <div class="info">
            <h3>Test Details:</h3>
            <ul>
              <li><strong>To:</strong> ${to}</li>
              <li><strong>From:</strong> ${providerInfo.details?.from || 'Not set'}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Provider:</strong> ${providerInfo.provider}</li>
              ${providerInfo.provider === 'smtp' ? `
                <li><strong>SMTP Host:</strong> ${providerInfo.details?.host}</li>
                <li><strong>SMTP Port:</strong> ${providerInfo.details?.port}</li>
              ` : ''}
            </ul>
          </div>

          <h3>What This Means:</h3>
          <ul>
            <li>✅ Your email configuration is correct</li>
            <li>✅ ${providerInfo.provider === 'smtp' ? 'SMTP connection is working' : 'Resend API is accessible'}</li>
            <li>✅ Emails can be sent to users</li>
            <li>✅ All transactional emails (forgot password, verifications, etc.) will work</li>
          </ul>

          <div class="info">
            <h4>Next Steps:</h4>
            <ol>
              <li>Check if this email is in your <strong>Inbox</strong></li>
              <li>If in spam, mark as "Not Spam"</li>
              <li>Test the actual features: forgot password, registration, etc.</li>
              ${providerInfo.provider === 'smtp' ? `
                <li>For production: Ensure your domain has proper SPF/DKIM records</li>
              ` : `
                <li>For production: Verify your domain in Resend for better deliverability</li>
              `}
            </ol>
          </div>

          <hr>
          <p style="color: #6b7280; font-size: 14px;">
            This is a test email from Skillbridge development environment.<br>
            Provider: ${providerInfo.provider}<br>
            Sent at: ${new Date().toISOString()}
          </p>
        </body>
        </html>
      `,
      text: `
Email Service Test

✅ Email Service is Working!

Your email service is properly configured and working.

Provider: ${providerInfo.provider.toUpperCase()}
${providerInfo.provider === 'smtp' ? `SMTP Host: ${providerInfo.details?.host}` : 'Using Resend API'}

Test Details:
- To: ${to}
- From: ${providerInfo.details?.from || 'Not set'}
- Time: ${new Date().toLocaleString()}

This means:
✅ Your email configuration is correct
✅ ${providerInfo.provider === 'smtp' ? 'SMTP connection is working' : 'Resend API is accessible'}
✅ Emails can be sent to users
✅ All transactional emails will work

Next Steps:
1. Check if this email is in your Inbox
2. If in spam, mark as "Not Spam"
3. Test actual features: forgot password, registration, etc.
      `
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "✅ Email sent successfully!",
        provider: providerInfo,
        details: {
          to,
          from: providerInfo.details?.from,
          messageId: result.data?.messageId || result.data?.id,
          timestamp: new Date().toISOString()
        },
        instructions: [
          "1. Check your email inbox",
          "2. If not in inbox, check spam/junk folder",
          "3. Mark as 'Not Spam' if found in spam",
          providerInfo.provider === 'smtp'
            ? "4. For production, ensure SPF/DKIM records are set up"
            : "4. For production, verify your domain in Resend"
        ]
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        provider: providerInfo,
        troubleshooting: providerInfo.provider === 'smtp' ? [
          "1. Verify SMTP credentials are correct",
          "2. Check if your GoDaddy email allows SMTP access",
          "3. Try port 587 with SMTP_SECURE=false if 465 doesn't work",
          "4. Ensure no firewall blocking SMTP ports",
          "5. Check GoDaddy email settings for SMTP configuration"
        ] : [
          "1. Verify RESEND_API_KEY is correct",
          "2. Check FROM_EMAIL matches verified domain",
          "3. Review Resend dashboard for errors"
        ]
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      provider: providerInfo
    }, { status: 500 })
  }
}
