import { sendEmail } from "./email-service"
import { logger } from "@/lib/monitoring/logger"

export async function sendMentorApprovedEmail(email: string, name: string) {
  const emailData = {
    to: email,
    subject: "Your Mentor Application Has Been Approved",
    html: `
        <p>Hi ${name},</p>
        <p>Congratulations! Your mentor application has been approved by the BridgeMentor admin team.</p>
        <p>You can now log in to your account and start mentoring learners.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/login">Log in to your dashboard</a></p>
        <br />
        <p>Welcome aboard,<br />The BridgeMentor Team</p>
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
