import { sendEmail } from "./email-service"
import { logger } from "@/lib/monitoring/logger"

export async function sendMentorRejectionEmail(email: string, name: string, notes: string) {
  const emailData = {
    to: email,
    subject: "Update on Your BridgeMentor Mentor Application",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mentor Application Update</title>
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
            .feedback-box {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .next-steps-box {
              background: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
              padding: 20px;
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
              <h2 style="color: #374151; margin: 0;">Mentor Application Update</h2>
            </div>

            <div class="content">
              <p>Dear ${name},</p>

              <p>Thank you for taking the time to apply to become a mentor on BridgeMentor. We appreciate your interest in sharing your knowledge and expertise with our learning community.</p>

              <p>After careful review, we have decided not to move forward with your application at this time. We understand this may be disappointing, and we want to provide you with feedback from our review team:</p>

              <div class="feedback-box">
                <h4 style="margin-top: 0; color: #92400e;">📝 Feedback from Review Team:</h4>
                <p style="font-style: italic; margin: 0;">${notes}</p>
              </div>

              <div class="next-steps-box">
                <h4 style="margin-top: 0; color: #0369a1;">💪 What You Can Do Next:</h4>
                <ul style="padding-left: 20px; margin: 10px 0;">
                  <li>Consider the feedback provided and work on those areas</li>
                  <li>You're welcome to reapply in the future (we recommend waiting at least 30 days)</li>
                  <li>Reach out to our support team if you have questions about the decision</li>
                  <li>Continue as a learner and build your profile within our community</li>
                </ul>
              </div>

              <p>We encourage you to stay engaged with the BridgeMentor community. Many of our successful mentors started as learners and reapplied after gaining more experience.</p>

              <div class="button-container">
                <a href="mailto:contact@bridge-mentor.com" class="button" style="color: white; text-decoration: none;">
                  Contact Support
                </a>
              </div>

              <p>Thank you again for your interest in becoming a mentor. We wish you the best in your professional journey.</p>

              <p>Best regards,<br><strong>The BridgeMentor Admin Team</strong></p>
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
      action: 'mentor_rejected',
    },
  })

  if (result.success) {
    logger.info("Mentor rejection email queued successfully", { to: email, name, jobId: result.jobId })
  } else {
    logger.error("Failed to queue mentor rejection email", { error: result.error, to: email, name })
    // Don't throw - admin action should still complete
  }
}
