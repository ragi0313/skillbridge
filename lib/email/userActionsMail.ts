import { sendEmail } from "./email-service"
import { logger } from "@/lib/monitoring/logger"

export async function sendSuspensionEmail({
  email,
  firstName,
  lastName,
  reason,
  suspensionEndsAt,
  adminMessage,
}: {
  email: string
  firstName: string
  lastName: string
  reason: string
  suspensionEndsAt: Date
  adminMessage: string
}) {
  const suspensionEndDate = suspensionEndsAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const emailData = {
      to: email,
      subject: "Account Suspension Notice - BridgeMentor",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspension Notice</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .content {
              padding: 30px 0;
            }
            .warning-box {
              background: #fef2f2;
              border: 2px solid #fecaca;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .warning-icon {
              font-size: 48px;
              color: #dc2626;
              margin-bottom: 10px;
            }
            .suspension-details {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .admin-message {
              background: #fffbeb;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px 0;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .contact-info {
              background: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BridgeMentor</div>
              <h2 style="color: #dc2626; margin: 0;">Account Suspension Notice</h2>
            </div>
            
            <div class="content">
              <div class="warning-box">
                <div class="warning-icon">⚠️</div>
                <h3 style="color: #dc2626; margin: 10px 0;">Your Account Has Been Suspended</h3>
              </div>

              <p>Dear ${firstName} ${lastName},</p>
              
              <p>We are writing to inform you that your BridgeMentor account has been temporarily suspended due to a violation of our community guidelines and terms of service.</p>
              
              <div class="suspension-details">
                <h4 style="margin-top: 0; color: #374151;">Suspension Details:</h4>
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Suspension Period:</strong> Until ${suspensionEndDate}</p>
                <p><strong>Account Status:</strong> Temporarily Suspended</p>
              </div>

              ${
                adminMessage
                  ? `
                <div class="admin-message">
                  <h4 style="margin-top: 0; color: #92400e;">Message from Administration:</h4>
                  <p style="font-style: italic;">"${adminMessage}"</p>
                </div>
              `
                  : ""
              }

              <h4>What This Means:</h4>
              <ul>
                <li>You will not be able to log into your account during the suspension period</li>
                <li>All scheduled sessions have been cancelled and refunded</li>
                <li>Your profile will not be visible to other users</li>
                <li>You will not receive platform notifications</li>
              </ul>

              <h4>Next Steps:</h4>
              <ul>
                <li>Your account will be automatically reactivated on ${suspensionEndDate}</li>
                <li>Please review our <a href="${process.env.NEXT_PUBLIC_BASE_URL}/terms" style="color: #2563eb;">Terms of Service</a> and <a href="${process.env.NEXT_PUBLIC_BASE_URL}/community-guidelines" style="color: #2563eb;">Community Guidelines</a></li>
                <li>Ensure future activities comply with our platform policies</li>
              </ul>

              <div class="contact-info">
                <h4 style="margin-top: 0; color: #0369a1;">Need Help?</h4>
                <p>If you believe this suspension was made in error or have questions about this decision, please contact our support team at <a href="mailto:contact@bridge-mentor.com" style="color: #0369a1;">contact@bridge-mentor.com</a></p>
              </div>

              <p>We value our community and look forward to welcoming you back after the suspension period.</p>
              
              <p>Best regards,<br>The BridgeMentor Administration Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>© ${new Date().getFullYear()} BridgeMentor. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
  }

  const result = await sendEmail(emailData, {
    mode: 'queued',
    metadata: {
      action: 'user_suspended',
    },
  })

  if (result.success) {
    logger.info("Suspension email queued successfully", { to: email, jobId: result.jobId })
  } else {
    logger.error("Failed to queue suspension email", { error: result.error, to: email })
  }

  return result
}

export async function sendBlacklistEmail({
  email,
  firstName,
  lastName,
  reason,
  adminMessage,
}: {
  email: string
  firstName: string
  lastName: string
  reason: string
  adminMessage: string
}) {
  const emailData = {
      to: email,
      subject: "Account Permanently Suspended - BridgeMentor",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Permanently Suspended</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .content {
              padding: 30px 0;
            }
            .danger-box {
              background: #fef2f2;
              border: 2px solid #dc2626;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .danger-icon {
              font-size: 48px;
              color: #dc2626;
              margin-bottom: 10px;
            }
            .blacklist-details {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .admin-message {
              background: #fffbeb;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px 0;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .contact-info {
              background: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BridgeMentor</div>
              <h2 style="color: #dc2626; margin: 0;">Account Permanently Suspended</h2>
            </div>
            
            <div class="content">
              <div class="danger-box">
                <div class="danger-icon">🚫</div>
                <h3 style="color: #dc2626; margin: 10px 0;">Your Account Has Been Permanently Suspended</h3>
              </div>

              <p>Dear ${firstName} ${lastName},</p>
              
              <p>We regret to inform you that your BridgeMentor account has been permanently suspended due to a serious violation of our community guidelines and terms of service.</p>
              
              <div class="blacklist-details">
                <h4 style="margin-top: 0; color: #374151;">Suspension Details:</h4>
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Action Taken:</strong> Permanent Account Suspension</p>
                <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</p>
              </div>

              ${
                adminMessage
                  ? `
                <div class="admin-message">
                  <h4 style="margin-top: 0; color: #92400e;">Message from Administration:</h4>
                  <p style="font-style: italic;">"${adminMessage}"</p>
                </div>
              `
                  : ""
              }

              <h4>What This Means:</h4>
              <ul>
                <li>Your account access has been permanently revoked</li>
                <li>All scheduled sessions have been cancelled and refunded</li>
                <li>Your profile and content have been removed from the platform</li>
                <li>You are prohibited from creating new accounts on BridgeMentor</li>
                <li>Any attempts to circumvent this suspension may result in legal action</li>
              </ul>

              <h4>This Decision:</h4>
              <ul>
                <li>Has been made after careful review by our administration team</li>
                <li>Is final and not subject to appeal</li>
                <li>Is necessary to maintain the safety and integrity of our community</li>
              </ul>

              <div class="contact-info">
                <h4 style="margin-top: 0; color: #0369a1;">Questions?</h4>
                <p>If you have questions about this decision (though it cannot be reversed), you may contact our support team at <a href="mailto:contact@bridge-mentor.com" style="color: #0369a1;">contact@bridge-mentor.com</a></p>
              </div>

              <p>We take the safety and well-being of our community seriously, and this action was necessary to protect our users.</p>
              
              <p>BridgeMentor Administration Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>© ${new Date().getFullYear()} BridgeMentor. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
  }

  const result = await sendEmail(emailData, {
    mode: 'queued',
    metadata: {
      action: 'user_blacklisted',
    },
  })

  if (result.success) {
    logger.info("Blacklist email queued successfully", { to: email, jobId: result.jobId })
  } else {
    logger.error("Failed to queue blacklist email", { error: result.error, to: email })
  }

  return result
}

export async function sendContactFormNotification({
  name,
  email,
  subject,
  message,
}: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const emailData = {
      to: process.env.FROM_EMAIL || "contact@bridge-mentor.com",
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .content {
              padding: 30px 0;
            }
            .info-box {
              background: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .message-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px 0;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BridgeMentor</div>
              <h2 style="color: #2563eb; margin: 0;">New Contact Form Submission</h2>
            </div>

            <div class="content">
              <p>You have received a new message from the contact form.</p>

              <div class="info-box">
                <h4 style="margin-top: 0; color: #0369a1;">Contact Information:</h4>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #0369a1;">${email}</a></p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</p>
              </div>

              <div class="message-box">
                <h4 style="margin-top: 0; color: #374151;">Message:</h4>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                <strong>Note:</strong> You can reply to this email directly to respond to the sender.
              </p>
            </div>

            <div class="footer">
              <p>This notification was sent from your contact form at ${process.env.NEXT_PUBLIC_BASE_URL || "https://bridge-mentor.com"}</p>
              <p>© ${new Date().getFullYear()} BridgeMentor. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}
Date: ${new Date().toLocaleString()}

Message:
${message}

---
You can reply to this email directly to respond to the sender.
      `,
  }

  const result = await sendEmail(emailData, {
    mode: 'queued',
    metadata: {
      action: 'contact_form',
    },
  })

  if (result.success) {
    logger.info("Contact form notification queued successfully", { to: process.env.FROM_EMAIL, jobId: result.jobId })
  } else {
    logger.error("Failed to queue contact form notification", { error: result.error })
  }

  return result
}

export async function sendUnsuspensionEmail({
  email,
  firstName,
  lastName,
  reason,
  adminMessage,
}: {
  email: string
  firstName: string
  lastName: string
  reason: string
  adminMessage: string
}) {
  const emailData = {
    to: email,
    subject: "Account Unsuspended - BridgeMentor",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Unsuspended</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .content {
            padding: 30px 0;
          }
          .success-box {
            background: #f0fdf4;
            border: 2px solid #86efac;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .success-icon {
            font-size: 48px;
            color: #16a34a;
            margin-bottom: 10px;
          }
          .details-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .admin-message {
            background: #eff6ff;
            border: 1px solid #60a5fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .btn {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BridgeMentor</div>
            <h2 style="color: #16a34a; margin: 0;">Account Unsuspended</h2>
          </div>

          <div class="content">
            <div class="success-box">
              <div class="success-icon">✅</div>
              <h3 style="color: #16a34a; margin: 10px 0;">Your Account Has Been Unsuspended</h3>
            </div>

            <p>Dear ${firstName} ${lastName},</p>

            <p>Good news! Your BridgeMentor account suspension has been lifted, and you now have full access to your account.</p>

            <div class="details-box">
              <h4 style="margin-top: 0; color: #374151;">Unsuspension Details:</h4>
              <p><strong>Reason for Unsuspension:</strong> ${reason}</p>
              <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
              <p><strong>Account Status:</strong> Active</p>
            </div>

            ${
              adminMessage
                ? `
              <div class="admin-message">
                <h4 style="margin-top: 0; color: #1e40af;">Message from Administration:</h4>
                <p style="font-style: italic;">"${adminMessage}"</p>
              </div>
            `
                : ""
            }

            <h4>What This Means:</h4>
            <ul>
              <li>You can now log into your account</li>
              <li>Your profile is visible to other users</li>
              <li>You can schedule and attend sessions</li>
              <li>All platform features are now available</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" class="btn">Log In to Your Account</a>
            </div>

            <p><strong>Moving Forward:</strong></p>
            <p>Please ensure that your future activities comply with our <a href="${process.env.NEXT_PUBLIC_BASE_URL}/terms" style="color: #2563eb;">Terms of Service</a> and <a href="${process.env.NEXT_PUBLIC_BASE_URL}/community-guidelines" style="color: #2563eb;">Community Guidelines</a> to maintain your account in good standing.</p>

            <p>We're glad to have you back and look forward to seeing you thrive in our community!</p>

            <p>Best regards,<br>The BridgeMentor Administration Team</p>
          </div>

          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>© ${new Date().getFullYear()} BridgeMentor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  const result = await sendEmail(emailData, {
    mode: "queued",
    metadata: {
      action: "user_unsuspended",
    },
  })

  if (result.success) {
    logger.info("Unsuspension email queued successfully", { to: email, jobId: result.jobId })
  } else {
    logger.error("Failed to queue unsuspension email", { error: result.error, to: email })
  }

  return result
}

export async function sendUnblacklistEmail({
  email,
  firstName,
  lastName,
  reason,
  adminMessage,
}: {
  email: string
  firstName: string
  lastName: string
  reason: string
  adminMessage: string
}) {
  const emailData = {
    to: email,
    subject: "Account Reactivated - BridgeMentor",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Reactivated</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .content {
            padding: 30px 0;
          }
          .success-box {
            background: #eff6ff;
            border: 2px solid #60a5fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .success-icon {
            font-size: 48px;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .details-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .admin-message {
            background: #eff6ff;
            border: 1px solid #60a5fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .btn {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BridgeMentor</div>
            <h2 style="color: #2563eb; margin: 0;">Account Reactivated</h2>
          </div>

          <div class="content">
            <div class="success-box">
              <div class="success-icon">🎉</div>
              <h3 style="color: #2563eb; margin: 10px 0;">Your Account Has Been Reactivated</h3>
            </div>

            <p>Dear ${firstName} ${lastName},</p>

            <p>We are writing to inform you that your BridgeMentor account has been removed from the blacklist and fully reactivated. You now have complete access to all platform features.</p>

            <div class="details-box">
              <h4 style="margin-top: 0; color: #374151;">Reactivation Details:</h4>
              <p><strong>Reason for Reactivation:</strong> ${reason}</p>
              <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
              <p><strong>Account Status:</strong> Active</p>
            </div>

            ${
              adminMessage
                ? `
              <div class="admin-message">
                <h4 style="margin-top: 0; color: #1e40af;">Message from Administration:</h4>
                <p style="font-style: italic;">"${adminMessage}"</p>
              </div>
            `
                : ""
            }

            <h4>What This Means:</h4>
            <ul>
              <li>You can now log into your account immediately</li>
              <li>Your profile will be visible to other users</li>
              <li>You can schedule and attend sessions</li>
              <li>All platform features and services are available</li>
              <li>Your account is in good standing</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" class="btn">Log In to Your Account</a>
            </div>

            <p><strong>Important Reminder:</strong></p>
            <p>Please ensure that all future activities comply with our <a href="${process.env.NEXT_PUBLIC_BASE_URL}/terms" style="color: #2563eb;">Terms of Service</a> and <a href="${process.env.NEXT_PUBLIC_BASE_URL}/community-guidelines" style="color: #2563eb;">Community Guidelines</a>. Violations may result in immediate suspension or permanent removal.</p>

            <p>We appreciate your commitment to being a valuable member of our community and look forward to your participation!</p>

            <p>Best regards,<br>The BridgeMentor Administration Team</p>
          </div>

          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>© ${new Date().getFullYear()} BridgeMentor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  const result = await sendEmail(emailData, {
    mode: "queued",
    metadata: {
      action: "user_unblacklisted",
    },
  })

  if (result.success) {
    logger.info("Unblacklist email queued successfully", { to: email, jobId: result.jobId })
  } else {
    logger.error("Failed to queue unblacklist email", { error: result.error, to: email })
  }

  return result
}
