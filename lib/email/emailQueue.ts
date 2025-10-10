import type { Queue, Worker, Job } from "bullmq"
import { getEmailTransporter, DEFAULT_SENDER } from "./transporter"
import { logger } from "@/lib/monitoring/logger"
import { getRedisConnection } from "@/lib/cache/redis-safe"

// Email job data interface
export interface EmailJob {
  to: string | string[]
  subject: string
  html: string
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

// Email queue configuration
const QUEUE_NAME = "email-queue"
const MAX_RETRIES = 3
const BACKOFF_DELAY = 5000 // 5 seconds

let emailQueue: Queue<EmailJob> | null = null
let emailWorker: Worker<EmailJob> | null = null
let workerInitializing = false
let queueInitializing = false

// Lazy load BullMQ to avoid instrumentation hook issues
async function loadBullMQ() {
  try {
    return await import("bullmq")
  } catch (error) {
    logger.error("Failed to load BullMQ module", { error })
    return null
  }
}

// Initialize the email queue
export async function getEmailQueue(): Promise<Queue<EmailJob> | null> {
  if (emailQueue) {
    return emailQueue
  }

  // Wait if already initializing
  if (queueInitializing) {
    const maxWait = 5000 // 5 seconds max wait
    const startTime = Date.now()
    while (queueInitializing && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return emailQueue
  }

  queueInitializing = true
  try {
    const connection = getRedisConnection()

    if (!connection) {
      logger.warn("Redis connection not available, email queue disabled")
      return null
    }

    const bullmq = await loadBullMQ()
    if (!bullmq) {
      logger.warn("BullMQ module not available, email queue disabled")
      return null
    }

    emailQueue = new bullmq.Queue<EmailJob>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: {
          type: "exponential",
          delay: BACKOFF_DELAY,
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
          count: 5000, // Keep last 5000 failed jobs
        },
      },
    })

    logger.info("Email queue initialized successfully")
    return emailQueue
  } catch (error) {
    logger.error("Failed to initialize email queue", { error })
    return null
  } finally {
    queueInitializing = false
  }
}

// Initialize the email worker
export async function initEmailWorker(): Promise<Worker<EmailJob> | null> {
  if (emailWorker) {
    return emailWorker
  }

  // Wait if already initializing
  if (workerInitializing) {
    const maxWait = 5000 // 5 seconds max wait
    const startTime = Date.now()
    while (workerInitializing && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return emailWorker
  }

  workerInitializing = true
  try {
    const connection = getRedisConnection()

    if (!connection) {
      logger.warn("Redis connection not available, email worker disabled")
      return null
    }

    const bullmq = await loadBullMQ()
    if (!bullmq) {
      logger.warn("BullMQ module not available, email worker disabled")
      return null
    }

    emailWorker = new bullmq.Worker<EmailJob>(
      QUEUE_NAME,
      async (job: Job<EmailJob>) => {
        const { to, subject, html, from, cc, bcc, replyTo, attachments } = job.data

        try {
          const transporter = getEmailTransporter()

          const mailOptions = {
            from: from || DEFAULT_SENDER,
            to,
            subject,
            html,
            ...(cc && { cc }),
            ...(bcc && { bcc }),
            ...(replyTo && { replyTo }),
            ...(attachments && { attachments }),
          }

          const info = await transporter.sendMail(mailOptions)

          logger.info("Email sent successfully", {
            jobId: job.id,
            to: Array.isArray(to) ? to.join(", ") : to,
            subject,
            messageId: info.messageId,
            response: info.response,
          })

          return { success: true, messageId: info.messageId }
        } catch (error: any) {
          logger.error("Failed to send email", {
            jobId: job.id,
            to: Array.isArray(to) ? to.join(", ") : to,
            subject,
            error: error.message,
            attempt: job.attemptsMade,
          })

          // Throw error to trigger retry
          throw error
        }
      },
      {
        connection,
        concurrency: process.env.NODE_ENV === 'production' ? 10 : 5, // Process up to 10 emails concurrently in production
        limiter: {
          max: process.env.NODE_ENV === 'production' ? 50 : 10, // Max jobs per duration
          duration: 1000, // Per second
        },
      }
    )

    // Worker event listeners
    emailWorker.on("completed", (job) => {
      logger.info("Email job completed", {
        jobId: job.id,
        returnvalue: job.returnvalue,
      })
    })

    emailWorker.on("failed", (job, error) => {
      logger.error("Email job failed", {
        jobId: job?.id,
        error: error.message,
        attempts: job?.attemptsMade,
      })
    })

    emailWorker.on("error", (error) => {
      logger.error("Email worker error", { error: error.message })
    })

    logger.info("Email worker initialized successfully")
    return emailWorker
  } catch (error) {
    logger.error("Failed to initialize email worker", { error })
    return null
  } finally {
    workerInitializing = false
  }
}

// Send email via queue (recommended for production)
export async function sendEmailQueued(emailData: EmailJob): Promise<Job<EmailJob> | null> {
  try {
    // Initialize worker on first use if not already initialized
    if (!emailWorker) {
      await initEmailWorker()
    }

    const queue = await getEmailQueue()

    if (!queue) {
      logger.warn("Email queue not available, cannot queue email")
      throw new Error("Email queue not initialized")
    }

    const job = await queue.add("send-email", emailData, {
      priority: emailData.subject.toLowerCase().includes("verification") ||
                emailData.subject.toLowerCase().includes("activation") ? 1 : 5, // Higher priority for verification emails
    })

    logger.info("Email queued successfully", {
      jobId: job.id,
      to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
      subject: emailData.subject,
    })

    return job
  } catch (error) {
    logger.error("Failed to queue email", {
      to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
      subject: emailData.subject,
      error,
    })
    throw error
  }
}

// Send email immediately (for critical emails, fallback if queue fails)
export async function sendEmailDirect(emailData: EmailJob): Promise<{ success: boolean; messageId?: string; error?: any }> {
  try {
    const transporter = getEmailTransporter()

    const mailOptions = {
      from: emailData.from || DEFAULT_SENDER,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      ...(emailData.cc && { cc: emailData.cc }),
      ...(emailData.bcc && { bcc: emailData.bcc }),
      ...(emailData.replyTo && { replyTo: emailData.replyTo }),
      ...(emailData.attachments && { attachments: emailData.attachments }),
    }

    const info = await transporter.sendMail(mailOptions)

    logger.info("Email sent directly", {
      to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
      subject: emailData.subject,
      messageId: info.messageId,
    })

    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    logger.error("Failed to send email directly", {
      to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
      subject: emailData.subject,
      error: error.message,
    })

    return { success: false, error }
  }
}

// Graceful shutdown
export async function closeEmailQueue() {
  try {
    if (emailWorker) {
      await emailWorker.close()
      emailWorker = null
      logger.info("Email worker closed")
    }

    if (emailQueue) {
      await emailQueue.close()
      emailQueue = null
      logger.info("Email queue closed")
    }
  } catch (error) {
    logger.error("Error closing email queue/worker", { error })
  }
}
