import { sendEmailQueued, sendEmailDirect } from "./emailQueue"
import { DEFAULT_SENDER } from "./transporter"
import { logger } from "@/lib/monitoring/logger"

export async function sendMentorRejectionEmail(email: string, name: string, notes: string) {
  const emailData = {
    to: email,
    subject: "Your BridgeMentor Mentor Application",
    html: `
      <p>Dear ${name},</p>
      <p>Thank you for applying to become a mentor on BridgeMentor.</p>
      <p>Unfortunately, your application has been declined. Here's a message from our review team:</p>
      <blockquote style="border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em;">
        ${notes}
      </blockquote>
      <p>You're welcome to apply again in the future or reach out if you have any questions.</p>
      <p>Best regards,<br/>BridgeMentor Admin Team</p>
    `,
    from: DEFAULT_SENDER,
  }

  try {
    await sendEmailQueued(emailData)
    logger.info("Mentor rejection email queued", { to: email, name })
  } catch (queueError) {
    logger.warn("Email queue failed, falling back to direct send", { error: queueError })
    try {
      await sendEmailDirect(emailData)
      logger.info("Mentor rejection email sent directly", { to: email, name })
    } catch (directError) {
      logger.error("Email sending completely failed", { error: directError, to: email, name })
      // Don't throw - admin action should still complete
    }
  }
}
