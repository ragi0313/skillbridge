import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/resend"

/**
 * Test email endpoint
 * GET /api/test-email?to=your-email@example.com
 *
 * This endpoint tests if email sending works
 * Use it to verify your Resend configuration
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

  if (!to) {
    return NextResponse.json({
      error: "Please provide 'to' parameter",
      example: "/api/test-email?to=your-email@example.com"
    }, { status: 400 })
  }

  // Check configuration
  const hasApiKey = !!process.env.RESEND_API_KEY
  const hasFromEmail = !!process.env.FROM_EMAIL
  const fromEmail = process.env.FROM_EMAIL || "NOT_SET"

  if (!hasApiKey || !hasFromEmail) {
    return NextResponse.json({
      error: "Email not configured",
      config: {
        RESEND_API_KEY: hasApiKey ? "✅ Set" : "❌ Missing",
        FROM_EMAIL: hasFromEmail ? `✅ Set (${fromEmail})` : "❌ Missing"
      },
      instructions: "Add RESEND_API_KEY and FROM_EMAIL to .env.local"
    }, { status: 500 })
  }

  try {
    const result = await sendEmail({
      to,
      subject: `Test Email from Skillbridge - ${new Date().toLocaleTimeString()}`,
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
            .code {
              background: #1f2937;
              color: #10b981;
              padding: 10px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Email Service is Working!</h1>
            <p><strong>Congratulations!</strong> If you're reading this, your email configuration is working correctly.</p>
          </div>

          <div class="info">
            <h3>Test Details:</h3>
            <ul>
              <li><strong>To:</strong> ${to}</li>
              <li><strong>From:</strong> ${fromEmail}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Service:</strong> Resend</li>
            </ul>
          </div>

          <h3>Next Steps:</h3>
          <ol>
            <li>Check if this email landed in <strong>Spam/Junk</strong> folder</li>
            <li>If in spam, mark as "Not Spam" and add sender to contacts</li>
            <li>Verify your domain in Resend for better deliverability</li>
          </ol>

          <div class="info">
            <h4>Your Configuration:</h4>
            <div class="code">
              FROM_EMAIL: ${fromEmail}<br>
              RESEND_API_KEY: ${process.env.RESEND_API_KEY?.substring(0, 10)}...
            </div>
          </div>

          <p><strong>Tip:</strong> For production, make sure to verify your domain in Resend to avoid spam filters.</p>

          <hr>
          <p style="color: #6b7280; font-size: 14px;">
            This is a test email from Skillbridge development environment.<br>
            Sent at: ${new Date().toISOString()}
          </p>
        </body>
        </html>
      `,
      text: `
Test Email from Skillbridge

✅ Email Service is Working!

If you're reading this, your email configuration is working correctly.

Test Details:
- To: ${to}
- From: ${fromEmail}
- Time: ${new Date().toLocaleString()}
- Service: Resend

Next Steps:
1. Check if this email landed in Spam/Junk folder
2. If in spam, mark as "Not Spam"
3. Verify your domain in Resend for better deliverability

Your Configuration:
FROM_EMAIL: ${fromEmail}
RESEND_API_KEY: ${process.env.RESEND_API_KEY?.substring(0, 10)}...
      `
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "✅ Email sent successfully!",
        details: {
          to,
          from: fromEmail,
          emailId: result.data?.id,
          timestamp: new Date().toISOString()
        },
        instructions: [
          "1. Check your email inbox",
          "2. If not in inbox, check spam/junk folder",
          "3. Mark as 'Not Spam' if found in spam",
          "4. For production, verify your domain in Resend dashboard"
        ],
        resendDashboard: "https://resend.com/emails"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        config: {
          FROM_EMAIL: fromEmail,
          RESEND_API_KEY: process.env.RESEND_API_KEY ? "Set" : "Missing"
        },
        troubleshooting: [
          "1. Verify RESEND_API_KEY is correct",
          "2. Check FROM_EMAIL matches a verified domain",
          "3. Review Resend dashboard for errors",
          "4. Try using onboarding@resend.dev for testing"
        ]
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      config: {
        FROM_EMAIL: fromEmail,
        RESEND_API_KEY: hasApiKey ? "Set" : "Missing"
      }
    }, { status: 500 })
  }
}
