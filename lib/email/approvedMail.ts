import { sendEmail } from "./email-service"
import { logger } from "@/lib/monitoring/logger"

export async function sendMentorApprovedEmail(email: string, name: string) {
  const emailData = {
    to: email,
    subject: "🎉 Your Mentor Application Has Been Approved!",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mentor Application Approved</title>
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
            .success-box {
              background: #f0fdf4;
              border: 2px solid #10b981;
              border-radius: 12px;
              padding: 25px;
              margin: 20px 0;
              text-align: center;
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 10px;
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
            }
            .steps-box {
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
            </div>

            <div class="content">
              <div class="success-box">
                <div class="success-icon">🎉</div>
                <h2 style="color: #059669; margin: 10px 0;">Congratulations, ${name}!</h2>
                <p style="margin: 10px 0; color: #065f46;">Your mentor application has been approved!</p>
              </div>

              <p>We're thrilled to welcome you to the BridgeMentor community as an official mentor. Your expertise and willingness to share knowledge will make a real difference in learners' lives.</p>

              <div class="steps-box">
                <h3 style="color: #374151; margin-top: 0;">🚀 Next Steps:</h3>
                <ol style="padding-left: 20px; margin: 10px 0;">
                  <li><strong>Log in to your dashboard</strong> - Access your new mentor control panel</li>
                  <li><strong>Complete your profile details</strong> - Add more about your expertise and achievements</li>
                  <li><strong>Confirm your availability</strong> - Make sure your schedule is up to date</li>
                  <li><strong>Review and optimize your rates</strong> - Ensure your pricing is competitive</li>
                  <li><strong>Start accepting mentorship sessions</strong> - Learners can now book sessions with you</li>
                </ol>
              </div>

              <div class="button-container">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" class="button" style="color: white; text-decoration: none;">
                  Go to My Dashboard
                </a>
              </div>

              <p style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <strong>💡 Pro Tip:</strong> Complete profiles with detailed expertise, verified credentials, and consistent availability receive 3x more booking requests. Update your profile today!
              </p>

              <p>We're excited to see the impact you'll make. If you have any questions, feel free to reach out to our support team.</p>

              <p>Welcome aboard!<br><strong>The BridgeMentor Team</strong></p>
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
      action: 'mentor_approved',
    },
  })

  if (result.success) {
    logger.info("Mentor approval email queued successfully", { to: email, name, jobId: result.jobId })
  } else {
    logger.error("Failed to queue mentor approval email", { error: result.error, to: email, name })
    // Don't throw - admin action should still complete
  }
}
