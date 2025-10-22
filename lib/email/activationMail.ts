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
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="color: #333;">Activate Your BridgeMentor Account</h1>
            <p>Hi there,</p>
            <p>Click the button below to activate your account:</p>
            <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center" bgcolor="#3B82F6" style="border-radius: 8px;">
                <a
                    href="${verifyUrl}"
                    target="_blank"
                    style="
                    display: inline-block;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: bold;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    background-color: #3B82F6;
                    "
                >
                    Activate Account
                </a>
                </td>
            </tr>
            </table>
            <p style="margin-top: 24px;">This link will expire in <strong>24 hours</strong>.</p>
            <p>If you did not sign up, you can safely ignore this email.</p>
            <br />
            <p>– The BridgeMentor Team</p>
        </div>
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
