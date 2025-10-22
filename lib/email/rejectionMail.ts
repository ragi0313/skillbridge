import { sendEmail } from "./email-service"
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
