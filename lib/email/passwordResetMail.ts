import { sendEmail } from "./email-service"
import { logger } from "@/lib/monitoring/logger"

export async function sendPasswordResetEmail(email: string, firstName: string, resetCode: string) {
  const emailData = {
    to: email,
    subject: "Skillbridge - Password Reset Code",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Code</title>
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
            .reset-code {
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
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Skillbridge</div>
          </div>
          
          <div class="content">
            <h1>Password Reset Request</h1>
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password. Use the verification code below to proceed with resetting your password:</p>
            
            <div class="code-container">
              <div class="reset-code">${resetCode}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">This code will expire in 15 minutes</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Never share this code with anyone</li>
                <li>If you didn't request this reset, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you're having trouble, you can copy and paste the code directly into the verification form.</p>
            
            <p>Best regards,<br>Skillbridge Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
        </body>
        </html>
      `,
  }

  const result = await sendEmail(emailData, {
    mode: 'direct', // Use direct mode for time-sensitive password resets
    metadata: {
      action: 'password_reset',
    },
  })

  if (result.success) {
    logger.info("Password reset email sent successfully", { to: email })
  } else {
    logger.error("Failed to send password reset email", { error: result.error, to: email })
  }

  return result
}
