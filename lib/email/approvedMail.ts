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

export async function sendMentorApprovedEmail(email: string, name: string) {
  try {
    await transporter.sendMail({
      from: '"SkillBridge" <no-reply@skillbridge.com>',
      to: email,
      subject: "Your Mentor Application Has Been Approved 🎉",
      html: `
        <p>Hi ${name},</p>
        <p>Congratulations! Your mentor application has been approved by the SkillBridge admin team.</p>
        <p>You can now log in to your account and start mentoring learners.</p>
        <p><a href="https://skillbridge.com/login">👉 Log in to your dashboard</a></p>
        <br />
        <p>Welcome aboard,<br />The SkillBridge Team</p>
      `,
    })
  } catch (error) {
    console.error("Failed to send approval email:", error)
  }
}
