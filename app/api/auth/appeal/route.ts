import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { sendEmail } from "@/lib/email/resend"
import { logger } from "@/lib/monitoring/logger"

async function handleAppeal(req: NextRequest) {
  try {
    const { email, firstName, appealReason, restrictionType } = await req.json()

    // Validate input
    if (!email || !firstName || !appealReason) {
      return NextResponse.json(
        { error: "Email, name, and appeal reason are required" },
        { status: 400 }
      )
    }

    if (appealReason.trim().length < 10) {
      return NextResponse.json(
        { error: "Appeal reason must be at least 10 characters long" },
        { status: 400 }
      )
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'contact@bridge-mentor.com'
    const currentDate = new Date().toLocaleString()

    // Send appeal to admin
    const adminEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Account Restriction Appeal</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
              .appeal-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 15px 0; }
              .info-row { margin: 10px 0; }
              .label { font-weight: bold; color: #374151; }
              .value { color: #6b7280; margin-left: 10px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔄 Account Restriction Appeal</h1>
              </div>
              
              <div class="info-row">
                  <span class="label">User Email:</span>
                  <span class="value">${email}</span>
              </div>
              <div class="info-row">
                  <span class="label">User Name:</span>
                  <span class="value">${firstName}</span>
              </div>
              <div class="info-row">
                  <span class="label">Restriction Type:</span>
                  <span class="value">${restrictionType || 'Not specified'}</span>
              </div>
              <div class="info-row">
                  <span class="label">Appeal Submitted:</span>
                  <span class="value">${currentDate}</span>
              </div>
              
              <div class="appeal-box">
                  <h3>User's Appeal:</h3>
                  <p style="white-space: pre-wrap; line-height: 1.6;">${appealReason}</p>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                  <li>Review the user's account history and the original restriction reason</li>
                  <li>Evaluate the appeal explanation provided</li>
                  <li>Make a decision to uphold, modify, or remove the restriction</li>
                  <li>Respond to the user within 3-5 business days</li>
              </ul>
          </div>
      </body>
      </html>
    `

    // Send appeal to admin
    const adminResult = await sendEmail({
      to: adminEmail,
      subject: `Account Appeal - ${email}`,
      html: adminEmailContent,
      replyTo: email,
    })

    if (!adminResult.success) {
      logger.error("Failed to send appeal to admin", { error: adminResult.error, email })
      return NextResponse.json(
        { error: "Failed to submit appeal. Please try again." },
        { status: 500 }
      )
    }

    // Send confirmation to user
    const userConfirmationEmail = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Appeal Submitted</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; text-align: center; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>✅ Appeal Submitted Successfully</h1>
              </div>
              
              <h2>Hello ${firstName},</h2>
              
              <p>Thank you for submitting your account restriction appeal. We have received your request and it will be reviewed by our support team.</p>
              
              <p><strong>What happens next:</strong></p>
              <ul>
                  <li>Our team will review your appeal within 3-5 business days</li>
                  <li>We will investigate the original restriction and your explanation</li>
                  <li>You will receive an email notification about our decision</li>
                  <li>If approved, your account access will be restored immediately</li>
              </ul>
              
              <p>Please note that submitting additional appeals for the same issue will not expedite the review process.</p>
              
              <p>Thank you for your patience.</p>
              
              <p><strong>BridgeMentor Support Team</strong><br>
              <a href="mailto:${adminEmail}">${adminEmail}</a></p>
          </div>
      </body>
      </html>
    `

    // Send confirmation to user
    const userResult = await sendEmail({
      to: email,
      subject: 'Appeal Submitted - Under Review',
      html: userConfirmationEmail,
    })

    if (!userResult.success) {
      logger.warn("Failed to send appeal confirmation to user", { error: userResult.error, email })
      // Don't fail the request - appeal was already sent to admin
    }

    return NextResponse.json({
      success: true,
      message: "Appeal submitted successfully. You will receive a confirmation email shortly."
    })

  } catch (error) {
    console.error('Appeal submission error:', error)
    return NextResponse.json(
      { error: "Failed to submit appeal. Please try again or contact support directly." },
      { status: 500 }
    )
  }
}

// Apply rate limiting to appeal endpoint (more restrictive)
export const POST = withRateLimit('appeal', handleAppeal)