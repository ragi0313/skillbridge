import { sendEmail } from "./email-service"
import { logger } from "@/lib/monitoring/logger"

export async function sendVerificationEmail({
  to,
  token,
  id,
}: {
  to: string
  token: string
  id: string | number
}): Promise<{ success: boolean; jobId?: string; error?: any }> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/register/learner/activate/${id}/${token}`

  const emailData = {
    to,
    subject: "Verify your BridgeMentor account",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 10px;
            }
            .content {
              padding: 30px 0;
            }
            .welcome-icon {
              font-size: 64px;
              text-align: center;
              margin: 20px 0;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
              transition: all 0.3s ease;
            }
            .info-box {
              background: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
              padding: 15px;
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
              <h2 style="color: #374151; margin: 0;">Welcome! Verify Your Account</h2>
            </div>

            <div class="content">
              <div class="welcome-icon">👋</div>

              <p>Hi there,</p>

              <p>Thank you for signing up for BridgeMentor! We're excited to have you join our community of learners and mentors.</p>

              <p>To get started, please verify your email address by clicking the button below:</p>

              <div class="button-container">
                <a href="${verifyUrl}" class="button" style="color: white; text-decoration: none;">
                  Activate My Account
                </a>
              </div>

              <div class="info-box">
                <p style="margin: 0;"><strong>⏰ Important:</strong> This verification link will expire in <strong>24 hours</strong>.</p>
              </div>

              <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #2563eb; font-size: 12px;">${verifyUrl}</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with BridgeMentor, you can safely ignore this email.</p>

              <p>Best regards,<br><strong>The BridgeMentor Team</strong></p>
            </div>

            <div class="footer">
              <p>This email was sent to ${to}</p>
              <p>© ${new Date().getFullYear()} BridgeMentor. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
    `,
  }

  const result = await sendEmail(emailData, {
    mode: 'queued', // Use queued mode for non-blocking sends
    metadata: {
      userId: id.toString(),
      action: 'account_verification',
    },
  })

  if (result.success) {
    logger.info("Verification email queued successfully", { to, userId: id, jobId: result.jobId })
  } else {
    logger.error("Failed to queue verification email", { error: result.error, to, userId: id })
  }

  return result
}
