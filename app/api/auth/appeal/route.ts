import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import nodemailer from 'nodemailer'

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

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillbridge.com'
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

    await transporter.sendMail({
      from: `"SkillBridge Appeals" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🔄 Account Appeal - ${email}`,
      html: adminEmailContent,
      replyTo: email,
    })

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
              
              <p><strong>SkillBridge Support Team</strong><br>
              <a href="mailto:${adminEmail}">${adminEmail}</a></p>
          </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"SkillBridge Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '✅ Appeal Submitted - Under Review',
      html: userConfirmationEmail,
    })

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
export const POST = withRateLimit('appeal', handleAppeal, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2, // Only 2 appeals per 15 minutes per IP
  message: "Too many appeal requests. Please wait before submitting another appeal."
})