import { Queue, Worker, QueueEvents } from 'bullmq'
import { getRedisConnection } from '@/lib/cache/redis-safe'
import { sendEmail as sendEmailDirect, sendBatchEmails as sendBatchEmailsDirect, EmailData } from '@/lib/email/resend'
import { logger } from '@/lib/monitoring/logger'

const isServer = typeof window === 'undefined'

// Job types
export interface EmailJob {
  type: 'single'
  data: EmailData
  metadata?: {
    userId?: string
    action?: string
  }
}

export interface BatchEmailJob {
  type: 'batch'
  emails: EmailData[]
  metadata?: {
    userId?: string
    action?: string
  }
}

export type EmailQueueJob = EmailJob | BatchEmailJob

// Queue configuration
const QUEUE_NAME = 'email-queue'
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 5000, 15000] // 1s, 5s, 15s

// Singleton instances
let emailQueue: Queue<EmailQueueJob> | null = null
let emailWorker: Worker<EmailQueueJob> | null = null
let queueEvents: QueueEvents | null = null

/**
 * Initialize email queue (only on server-side)
 */
export function getEmailQueue(): Queue<EmailQueueJob> | null {
  if (!isServer) {
    return null
  }

  if (emailQueue) {
    return emailQueue
  }

  const connection = getRedisConnection()

  if (!connection) {
    logger.warn('[EMAIL QUEUE] Redis not available, email queue disabled. Emails will be sent synchronously.')
    return null
  }

  try {
    emailQueue = new Queue<EmailQueueJob>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
          count: 5000, // Keep last 5000 failed jobs
        },
      },
    })

    logger.info('[EMAIL QUEUE] Email queue initialized successfully')
    return emailQueue
  } catch (error) {
    logger.error('[EMAIL QUEUE] Failed to initialize email queue', { error })
    return null
  }
}

/**
 * Initialize email worker (processes jobs from the queue)
 */
export function initEmailWorker(): Worker<EmailQueueJob> | null {
  if (!isServer) {
    return null
  }

  if (emailWorker) {
    return emailWorker
  }

  const connection = getRedisConnection()

  if (!connection) {
    logger.warn('[EMAIL WORKER] Redis not available, email worker disabled')
    return null
  }

  try {
    emailWorker = new Worker<EmailQueueJob>(
      QUEUE_NAME,
      async (job) => {
        const startTime = Date.now()
        const { data } = job

        logger.info('[EMAIL WORKER] Processing email job', {
          jobId: job.id,
          type: data.type,
          attempt: job.attemptsMade + 1,
          maxAttempts: MAX_RETRIES,
        })

        try {
          let result

          if (data.type === 'single') {
            // Send single email
            result = await sendEmailDirect(data.data)

            if (!result.success) {
              throw new Error(result.error || 'Failed to send email')
            }

            logger.info('[EMAIL WORKER] Single email sent successfully', {
              jobId: job.id,
              to: data.data.to,
              subject: data.data.subject,
              duration: Date.now() - startTime,
              emailId: result.data?.id,
            })
          } else if (data.type === 'batch') {
            // Send batch emails
            result = await sendBatchEmailsDirect(data.emails)

            if (!result.success) {
              throw new Error(result.error || 'Failed to send batch emails')
            }

            logger.info('[EMAIL WORKER] Batch emails sent successfully', {
              jobId: job.id,
              count: data.emails.length,
              duration: Date.now() - startTime,
            })
          }

          return result
        } catch (error: any) {
          const duration = Date.now() - startTime

          logger.error('[EMAIL WORKER] Email job failed', {
            jobId: job.id,
            type: data.type,
            error: error.message,
            attempt: job.attemptsMade + 1,
            maxAttempts: MAX_RETRIES,
            duration,
            willRetry: job.attemptsMade + 1 < MAX_RETRIES,
          })

          // Re-throw to trigger BullMQ retry mechanism
          throw error
        }
      },
      {
        connection,
        concurrency: 5, // Process up to 5 email jobs concurrently
        limiter: {
          max: 10, // Maximum 10 jobs
          duration: 1000, // Per second (prevents rate limit issues)
        },
      }
    )

    // Event listeners
    emailWorker.on('completed', (job) => {
      logger.info('[EMAIL WORKER] Job completed', {
        jobId: job.id,
        duration: Date.now() - job.timestamp,
      })
    })

    emailWorker.on('failed', (job, error) => {
      if (job) {
        logger.error('[EMAIL WORKER] Job failed permanently', {
          jobId: job.id,
          error: error.message,
          attempts: job.attemptsMade,
          data: job.data,
        })
      }
    })

    emailWorker.on('error', (error) => {
      logger.error('[EMAIL WORKER] Worker error', { error: error.message })
    })

    logger.info('[EMAIL WORKER] Email worker initialized successfully')
    return emailWorker
  } catch (error) {
    logger.error('[EMAIL WORKER] Failed to initialize email worker', { error })
    return null
  }
}

/**
 * Initialize queue events (for monitoring)
 */
export function initQueueEvents(): QueueEvents | null {
  if (!isServer) {
    return null
  }

  if (queueEvents) {
    return queueEvents
  }

  const connection = getRedisConnection()

  if (!connection) {
    return null
  }

  try {
    queueEvents = new QueueEvents(QUEUE_NAME, { connection })

    queueEvents.on('completed', ({ jobId }) => {
      logger.info('[QUEUE EVENTS] Job completed event', { jobId })
    })

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error('[QUEUE EVENTS] Job failed event', { jobId, failedReason })
    })

    logger.info('[QUEUE EVENTS] Queue events initialized successfully')
    return queueEvents
  } catch (error) {
    logger.error('[QUEUE EVENTS] Failed to initialize queue events', { error })
    return null
  }
}

/**
 * Add email to queue (async, non-blocking)
 */
export async function queueEmail(
  emailData: EmailData,
  metadata?: { userId?: string; action?: string }
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const queue = getEmailQueue()

  if (!queue) {
    // Fallback to synchronous sending if queue is not available
    logger.warn('[EMAIL QUEUE] Queue not available, falling back to synchronous send')
    const result = await sendEmailDirect(emailData)
    return {
      success: result.success,
      error: result.error,
    }
  }

  try {
    const job = await queue.add('send-email', {
      type: 'single',
      data: emailData,
      metadata,
    })

    logger.info('[EMAIL QUEUE] Email queued successfully', {
      jobId: job.id,
      to: emailData.to,
      subject: emailData.subject,
      metadata,
    })

    return {
      success: true,
      jobId: job.id,
    }
  } catch (error: any) {
    logger.error('[EMAIL QUEUE] Failed to queue email', {
      error: error.message,
      to: emailData.to,
      subject: emailData.subject,
    })

    // Fallback to synchronous sending
    logger.warn('[EMAIL QUEUE] Falling back to synchronous send')
    const result = await sendEmailDirect(emailData)
    return {
      success: result.success,
      error: result.error,
    }
  }
}

/**
 * Add batch emails to queue
 */
export async function queueBatchEmails(
  emails: EmailData[],
  metadata?: { userId?: string; action?: string }
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const queue = getEmailQueue()

  if (!queue) {
    logger.warn('[EMAIL QUEUE] Queue not available, falling back to synchronous send')
    const result = await sendBatchEmailsDirect(emails)
    return {
      success: result.success,
      error: result.error,
    }
  }

  try {
    const job = await queue.add('send-batch-emails', {
      type: 'batch',
      emails,
      metadata,
    })

    logger.info('[EMAIL QUEUE] Batch emails queued successfully', {
      jobId: job.id,
      count: emails.length,
      metadata,
    })

    return {
      success: true,
      jobId: job.id,
    }
  } catch (error: any) {
    logger.error('[EMAIL QUEUE] Failed to queue batch emails', {
      error: error.message,
      count: emails.length,
    })

    // Fallback to synchronous sending
    logger.warn('[EMAIL QUEUE] Falling back to synchronous send')
    const result = await sendBatchEmailsDirect(emails)
    return {
      success: result.success,
      error: result.error,
    }
  }
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const queue = getEmailQueue()

  if (!queue) {
    return null
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    }
  } catch (error) {
    logger.error('[EMAIL QUEUE] Failed to get queue metrics', { error })
    return null
  }
}

/**
 * Cleanup - close connections gracefully
 */
export async function closeEmailQueue() {
  try {
    if (emailWorker) {
      await emailWorker.close()
      emailWorker = null
      logger.info('[EMAIL QUEUE] Worker closed')
    }

    if (queueEvents) {
      await queueEvents.close()
      queueEvents = null
      logger.info('[EMAIL QUEUE] Queue events closed')
    }

    if (emailQueue) {
      await emailQueue.close()
      emailQueue = null
      logger.info('[EMAIL QUEUE] Queue closed')
    }
  } catch (error) {
    logger.error('[EMAIL QUEUE] Error during cleanup', { error })
  }
}

// Graceful shutdown on process termination
if (isServer) {
  process.on('SIGTERM', async () => {
    logger.info('[EMAIL QUEUE] SIGTERM received, closing queue...')
    await closeEmailQueue()
  })

  process.on('SIGINT', async () => {
    logger.info('[EMAIL QUEUE] SIGINT received, closing queue...')
    await closeEmailQueue()
  })
}
