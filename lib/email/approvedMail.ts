import { sendEmailQueued, sendEmailDirect } from "./emailQueue"
import { DEFAULT_SENDER } from "./transporter"
import { logger } from "@/lib/monitoring/logger"

export async function sendMentorApprovedEmail(email: string, name: string) {
  const emailData = {
    to: email,
    subject: "Your Mentor Application Has Been Approved 🎉",
    html: `
        <p>Hi ${name},</p>
        <p>Congratulations! Your mentor application has been approved by the BridgeMentor admin team.</p>
        <p>You can now log in to your account and start mentoring learners.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/login">👉 Log in to your dashboard</a></p>
        <br />
        <p>Welcome aboard,<br />The BridgeMentor Team</p>
      `,
    from: DEFAULT_SENDER,
  }

  try {
    await sendEmailQueued(emailData)
    logger.info("Mentor approval email queued", { to: email, name })
  } catch (queueError) {
    logger.warn("Email queue failed, falling back to direct send", { error: queueError })
    try {
      await sendEmailDirect(emailData)
      logger.info("Mentor approval email sent directly", { to: email, name })
    } catch (directError) {
      logger.error("Email sending completely failed", { error: directError, to: email, name })
      // Don't throw - admin action should still complete
    }
  }
}
