import nodemailer from 'nodemailer'

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendBlacklistNotificationEmail(
  userEmail: string,
  firstName: string,
  reason: string
) {
  const transporter = createTransporter()
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillbridge.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillbridge.com'

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Restriction Notice</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 30px 20px; line-height: 1.6; color: #374151; }
            .alert-box { background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; }
            .appeal-section { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .appeal-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 15px 0; }
            .appeal-button:hover { background: #1d4ed8; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .warning-icon { font-size: 24px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="warning-icon">⚠️</div>
                <h1>Account Restriction Notice</h1>
            </div>
            
            <div class="content">
                <h2>Hello ${firstName},</h2>
                
                <div class="alert-box">
                    <p><strong>Your SkillBridge account has been permanently restricted.</strong></p>
                    <p><strong>Reason:</strong> ${reason}</p>
                </div>
                
                <p>This action was taken to maintain the safety and integrity of our platform community. When you attempted to log in, our system detected this restriction and is now notifying you via email.</p>
                
                <div class="appeal-section">
                    <h3>🔄 Appeal This Decision</h3>
                    <p>If you believe this restriction was made in error, you can submit an appeal for review by our support team.</p>
                    
                    <a href="mailto:${adminEmail}?subject=Account%20Restriction%20Appeal%20-%20${encodeURIComponent(userEmail)}&body=Dear%20SkillBridge%20Support%2C%0A%0AI%20am%20writing%20to%20appeal%20the%20restriction%20placed%20on%20my%20account%20(${encodeURIComponent(userEmail)}).%0A%0AReason%20for%20restriction%3A%20${encodeURIComponent(reason)}%0A%0AMy%20appeal%20explanation%3A%0A[Please%20explain%20why%20you%20believe%20this%20restriction%20was%20made%20in%20error]%0A%0AThank%20you%20for%20your%20consideration.%0A%0ABest%20regards%2C%0A${encodeURIComponent(firstName)}" 
                       class="appeal-button">
                        📧 Submit Appeal
                    </a>
                    
                    <p><small>The appeal button will open your email client with a pre-filled template. You can also manually email <a href="mailto:${adminEmail}">${adminEmail}</a> with your appeal.</small></p>
                </div>
                
                <h3>What happens next?</h3>
                <ul>
                    <li>If you submit an appeal, our team will review your case within 3-5 business days</li>
                    <li>You will receive an email notification about the decision</li>
                    <li>If your appeal is successful, your account will be reinstated</li>
                    <li>If no appeal is submitted, this restriction remains permanent</li>
                </ul>
                
                <p>We take these decisions seriously and only restrict accounts when necessary to protect our community.</p>
            </div>
            
            <div class="footer">
                <p><strong>SkillBridge Support Team</strong></p>
                <p>This is an automated notification. For questions, contact us at <a href="mailto:${adminEmail}">${adminEmail}</a></p>
            </div>
        </div>
    </body>
    </html>
  `

  const textContent = `
Account Restriction Notice

Hello ${firstName},

Your SkillBridge account has been permanently restricted.
Reason: ${reason}

This action was taken to maintain the safety and integrity of our platform community.

APPEAL THIS DECISION:
If you believe this restriction was made in error, you can submit an appeal by emailing:
${adminEmail}

Subject: Account Restriction Appeal - ${userEmail}

Please include:
- Your explanation of why you believe this was made in error
- Any additional context you'd like us to consider

Our team will review appeals within 3-5 business days.

Best regards,
SkillBridge Support Team

Contact us: ${adminEmail}
  `

  await transporter.sendMail({
    from: `"SkillBridge Support" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: '🚨 Account Restriction Notice - Action Required',
    text: textContent,
    html: htmlContent,
  })
}

export async function sendSuspensionNotificationEmail(
  userEmail: string,
  firstName: string,
  reason: string,
  suspensionEndsAt: Date
) {
  const transporter = createTransporter()
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillbridge.com'
  
  const endDate = suspensionEndsAt.toLocaleDateString("en-US", {
    weekday: 'long',
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: '2-digit',
    minute: '2-digit'
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Suspension Notice</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 30px 20px; line-height: 1.6; color: #374151; }
            .alert-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0; }
            .appeal-section { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .appeal-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 15px 0; }
            .appeal-button:hover { background: #1d4ed8; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .warning-icon { font-size: 24px; margin-bottom: 10px; }
            .countdown { background: #fee2e2; padding: 15px; border-radius: 8px; text-align: center; font-weight: 600; color: #dc2626; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="warning-icon">⏸️</div>
                <h1>Account Suspension Notice</h1>
            </div>
            
            <div class="content">
                <h2>Hello ${firstName},</h2>
                
                <div class="alert-box">
                    <p><strong>Your SkillBridge account has been temporarily suspended.</strong></p>
                    <p><strong>Reason:</strong> ${reason}</p>
                </div>
                
                <div class="countdown">
                    <p>🕐 Suspension ends: ${endDate}</p>
                </div>
                
                <p>This temporary restriction was applied to ensure the safety and integrity of our platform. You will not be able to access your account until the suspension period ends.</p>
                
                <div class="appeal-section">
                    <h3>🔄 Appeal This Suspension</h3>
                    <p>If you believe this suspension was made in error, you can submit an appeal for immediate review.</p>
                    
                    <a href="mailto:${adminEmail}?subject=Account%20Suspension%20Appeal%20-%20${encodeURIComponent(userEmail)}&body=Dear%20SkillBridge%20Support%2C%0A%0AI%20am%20writing%20to%20appeal%20the%20suspension%20placed%20on%20my%20account%20(${encodeURIComponent(userEmail)}).%0A%0AReason%20for%20suspension%3A%20${encodeURIComponent(reason)}%0ASuspension%20ends%3A%20${encodeURIComponent(endDate)}%0A%0AMy%20appeal%20explanation%3A%0A[Please%20explain%20why%20you%20believe%20this%20suspension%20was%20made%20in%20error]%0A%0AThank%20you%20for%20your%20consideration.%0A%0ABest%20regards%2C%0A${encodeURIComponent(firstName)}" 
                       class="appeal-button">
                        📧 Submit Appeal
                    </a>
                    
                    <p><small>The appeal button will open your email client with a pre-filled template. You can also manually email <a href="mailto:${adminEmail}">${adminEmail}</a> with your appeal.</small></p>
                </div>
                
                <h3>What happens next?</h3>
                <ul>
                    <li><strong>Automatic reinstatement:</strong> Your account will be automatically restored on ${endDate}</li>
                    <li><strong>Appeal process:</strong> If you submit an appeal, our team will review it within 1-2 business days</li>
                    <li><strong>Early reinstatement:</strong> Successful appeals may result in immediate account restoration</li>
                    <li><strong>Future violations:</strong> Additional policy violations may result in longer suspensions or permanent restrictions</li>
                </ul>
                
                <p>Please take this time to review our <a href="${process.env.NEXT_PUBLIC_APP_URL}/terms">Community Guidelines</a> to avoid future issues.</p>
            </div>
            
            <div class="footer">
                <p><strong>SkillBridge Support Team</strong></p>
                <p>This is an automated notification. For questions, contact us at <a href="mailto:${adminEmail}">${adminEmail}</a></p>
            </div>
        </div>
    </body>
    </html>
  `

  const textContent = `
Account Suspension Notice

Hello ${firstName},

Your SkillBridge account has been temporarily suspended.
Reason: ${reason}
Suspension ends: ${endDate}

This temporary restriction was applied to ensure platform safety. You cannot access your account until the suspension ends.

APPEAL THIS SUSPENSION:
If you believe this suspension was made in error, email: ${adminEmail}

Subject: Account Suspension Appeal - ${userEmail}

What happens next:
- Your account will automatically restore on ${endDate}
- Appeals are reviewed within 1-2 business days
- Successful appeals may result in immediate restoration

Please review our Community Guidelines to avoid future issues.

Best regards,
SkillBridge Support Team

Contact us: ${adminEmail}
  `

  await transporter.sendMail({
    from: `"SkillBridge Support" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: '⏸️ Account Suspension Notice - Appeal Available',
    text: textContent,
    html: htmlContent,
  })
}