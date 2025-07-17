import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: parseInt(process.env.SMTP_PORT || "587") === 465,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
})

export async function sendVerificationEmail({
  to,
  token,
  id,
}: {
  to: string
  token: string
  id: string | number
}) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/register/learner/activate/${id}/${token}`

  await transporter.sendMail({
    from: '"SkillBridge" <no-reply@skillbridge.com>',
    to,
    subject: "Verify your SkillBridge account",
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="color: #333;">Activate Your SkillBridge Account</h1>
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
            <p>– The SkillBridge Team</p>
        </div>
    `

  })
}
