import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: parseInt(process.env.SMTP_PORT || "587") === 465,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
})

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
  try {
    const suspensionEndDate = suspensionEndsAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const mailOptions = {
      from: process.env.SMTP_FROM || '"SkillBridge" <no-reply@skillbridge.com>',
      to: email,
      subject: "Account Suspension Notice - SkillBridge",
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
              <div class="logo">SkillBridge</div>
              <h2 style="color: #dc2626; margin: 0;">Account Suspension Notice</h2>
            </div>
            
            <div class="content">
              <div class="warning-box">
                <div class="warning-icon">⚠️</div>
                <h3 style="color: #dc2626; margin: 10px 0;">Your Account Has Been Suspended</h3>
              </div>

              <p>Dear ${firstName} ${lastName},</p>
              
              <p>We are writing to inform you that your SkillBridge account has been temporarily suspended due to a violation of our community guidelines and terms of service.</p>
              
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
                <p>If you believe this suspension was made in error or have questions about this decision, please contact our support team at <a href="mailto:support@skillbridge.com" style="color: #0369a1;">support@skillbridge.com</a></p>
              </div>

              <p>We value our community and look forward to welcoming you back after the suspension period.</p>
              
              <p>Best regards,<br>The SkillBridge Administration Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>© ${new Date().getFullYear()} SkillBridge. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error("Error sending suspension email:", error)
    return { success: false, error }
  }
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
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"SkillBridge" <no-reply@skillbridge.com>',
      to: email,
      subject: "Account Permanently Suspended - SkillBridge",
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
              <div class="logo">SkillBridge</div>
              <h2 style="color: #dc2626; margin: 0;">Account Permanently Suspended</h2>
            </div>
            
            <div class="content">
              <div class="danger-box">
                <div class="danger-icon">🚫</div>
                <h3 style="color: #dc2626; margin: 10px 0;">Your Account Has Been Permanently Suspended</h3>
              </div>

              <p>Dear ${firstName} ${lastName},</p>
              
              <p>We regret to inform you that your SkillBridge account has been permanently suspended due to a serious violation of our community guidelines and terms of service.</p>
              
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
                <li>You are prohibited from creating new accounts on SkillBridge</li>
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
                <p>If you have questions about this decision (though it cannot be reversed), you may contact our support team at <a href="mailto:support@skillbridge.com" style="color: #0369a1;">support@skillbridge.com</a></p>
              </div>

              <p>We take the safety and well-being of our community seriously, and this action was necessary to protect our users.</p>
              
              <p>SkillBridge Administration Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>© ${new Date().getFullYear()} SkillBridge. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error("Error sending blacklist email:", error)
    return { success: false, error }
  }
}
