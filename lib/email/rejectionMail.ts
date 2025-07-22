import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: parseInt(process.env.SMTP_PORT || "587") === 465,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
})

export async function sendMentorRejectionEmail(email: string, name: string, notes: string) {
  const mailOptions = {
    from: "no-reply@skillbridge.com",
    to: email,
    subject: "Your SkillBridge Mentor Application",
    html: `
      <p>Dear ${name},</p>
      <p>Thank you for applying to become a mentor on SkillBridge.</p>
      <p>Unfortunately, your application has been declined. Here's a message from our review team:</p>
      <blockquote style="border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em;">
        ${notes}
      </blockquote>
      <p>You’re welcome to apply again in the future or reach out if you have any questions.</p>
      <p>Best regards,<br/>SkillBridge Admin Team</p>
    `,
  }

  await transporter.sendMail(mailOptions)
}
