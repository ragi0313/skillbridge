import nodemailer from "nodemailer"
import { logger } from "@/lib/monitoring/logger"

// Centralized email transporter instance (singleton pattern)
// This ensures connection pooling and reuse across the application

let transporter: nodemailer.Transporter | null = null

export function getEmailTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter
  }

  // Validate required environment variables
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.error("Missing required SMTP environment variables")
    throw new Error("Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS")
  }

  const port = parseInt(process.env.SMTP_PORT || "587")
  const isSecure = port === 465

  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: isSecure, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true, // Enable connection pooling for better performance
      maxConnections: process.env.NODE_ENV === 'production' ? 20 : 5, // Max simultaneous connections
      maxMessages: 100, // Max messages per connection
      rateDelta: 1000, // Time window for rate limiting (1 second)
      rateLimit: process.env.NODE_ENV === 'production' ? 20 : 5, // Max messages per rateDelta
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 30000, // 30 seconds
    })

    // Verify transporter configuration on initialization
    transporter.verify((error) => {
      if (error) {
        logger.error("Email transporter verification failed", { error: error.message })
      } else {
        logger.info("Email transporter is ready", {
          host: process.env.SMTP_HOST,
          port: port,
          secure: isSecure
        })
      }
    })

    return transporter
  } catch (error) {
    logger.error("Failed to create email transporter", { error })
    throw new Error("Failed to initialize email service")
  }
}

// Close the transporter connection pool (useful for graceful shutdown)
export async function closeEmailTransporter() {
  if (transporter) {
    try {
      transporter.close()
      transporter = null
      logger.info("Email transporter closed successfully")
    } catch (error) {
      logger.error("Error closing email transporter", { error })
    }
  }
}

// Default sender email
export const DEFAULT_SENDER = process.env.SMTP_FROM || '"BridgeMentor" <no-reply@bridgementor.com>'
