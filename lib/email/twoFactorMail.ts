import { sendEmail } from "./email-service"
import { logger } from "@/lib/monitoring/logger"

export async function send2FACodeEmail(email: string, firstName: string, code: string) {
  const emailData = {
    to: email,
    subject: "Skillbridge - Two-Factor Authentication Code",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Two-Factor Authentication Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .content {
              padding: 30px 0;
            }
            .code-container {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .verification-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #1e40af;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
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
          <div class="header">
            <div class="logo">Skillbridge</div>
          </div>

          <div class="content">
            <h1>Two-Factor Authentication Code</h1>
            <p>Hello ${firstName},</p>
            <p>You are attempting to sign in to your Skillbridge account. Please use the verification code below to complete your login:</p>

            <div class="code-container">
              <div class="verification-code">${code}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">This code will expire in 10 minutes</p>
            </div>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Never share this code with anyone</li>
                <li>Skillbridge staff will never ask for this code</li>
                <li>If you didn't attempt to sign in, please secure your account immediately</li>
              </ul>
            </div>

            <p>If you're having trouble, you can copy and paste the code directly into the verification form.</p>

            <p>Best regards,<br>Skillbridge Team</p>
          </div>

          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>If you didn't attempt to sign in, please secure your account or contact support immediately.</p>
          </div>
        </body>
        </html>
      `,
  }

  const result = await sendEmail(emailData, {
    mode: 'direct', // Use direct mode for time-sensitive 2FA codes
    metadata: {
      action: 'two_factor_authentication',
    },
  })

  if (result.success) {
    logger.info("2FA code email sent successfully", { to: email })
  } else {
    logger.error("Failed to send 2FA code email", { error: result.error, to: email })
  }

  return result
}
