import { z, type ZodIssue } from 'zod'

// Environment validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid database URL'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),

  // Pusher (optional for real-time features like video session chat)
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_KEY: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  PUSHER_CLUSTER: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),

  // File storage (Cloudinary - required for profile pictures)
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required for file uploads'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required for file uploads'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required for file uploads'),

  // Vercel Blob storage (for chat files - required in production)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // Cron jobs
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters long'),

  // Payment providers
  XENDIT_SECRET_KEY: z.string().min(1, 'XENDIT_SECRET_KEY is required'),
  XENDIT_PLATFORM_ACCOUNT_NUMBER: z.string().min(1, 'XENDIT_PLATFORM_ACCOUNT_NUMBER is required'),
  XENDIT_PLATFORM_BANK_CODE: z.string().default('BPI'),
  XENDIT_PLATFORM_ACCOUNT_NAME: z.string().default('BridgeMentor Inc'),
  XENDIT_WEBHOOK_TOKEN: z.string().optional(),

  // Agora (for video calls)
  AGORA_APP_ID: z.string().optional(),
  AGORA_APP_CERTIFICATE: z.string().optional(),

  // Email (Resend - optional but recommended for production)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Redis/Cache (optional)
  REDIS_URL: z.string().url().optional(),
  KV_URL: z.string().url().optional(),
})

export type EnvConfig = z.infer<typeof envSchema>

// Environment variable validation for production safety
export class EnvironmentValidator {
  private static readonly OPTIONAL_VARS_WITH_DEFAULTS = {
    'XENDIT_PLATFORM_BANK_CODE': 'BPI',
    'XENDIT_PLATFORM_ACCOUNT_NAME': 'BridgeMentor Inc',
    'NODE_ENV': 'development'
  }

  static validateEnvironment(): {
    isValid: boolean
    config?: EnvConfig
    errors?: string[]
    warnings?: string[]
  } {
    const warnings: string[] = []

    try {
      const config = envSchema.parse(process.env)

      // Additional production checks
      if (config.NODE_ENV === 'production') {
        // Redis/KV is optional now - we use Resend directly (no queue needed)
        if (!config.REDIS_URL && !config.KV_URL) {
          warnings.push('Redis/KV not configured. Rate limiting and caching will use fallbacks.')
        }

        if (!config.RESEND_API_KEY) {
          warnings.push('RESEND_API_KEY not configured. Email functionality will not work.')
        }

        if (!config.AGORA_APP_ID || !config.AGORA_APP_CERTIFICATE) {
          warnings.push('No Agora configuration provided. Video call functionality will be disabled')
        }

        // Security checks
        if (config.JWT_SECRET.length < 64) {
          warnings.push('JWT_SECRET should be at least 64 characters in production')
        }

        // Check that we're not using default values in production
        if (config.XENDIT_PLATFORM_ACCOUNT_NAME === 'BridgeMentor Inc') {
          warnings.push('Using default XENDIT_PLATFORM_ACCOUNT_NAME in production')
        }
      }

      return {
        isValid: true,
        config,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      console.error('[ENV_VALIDATION] Environment validation error:', error)

      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err: ZodIssue) =>
          `${err.path?.join('.') || 'unknown'}: ${err.message || 'Validation error'}`
        )
        return {
          isValid: false,
          errors: errors.length > 0 ? errors : ['Zod validation failed with no specific errors']
        }
      }

      return {
        isValid: false,
        errors: [`Unknown environment validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  static logEnvironmentStatus(): void {
    const { isValid, config, errors, warnings } = this.validateEnvironment()

    if (isValid && config) {
      console.log('✅ Environment validation passed')
    } else {
      console.error('❌ Environment validation failed:')
      errors?.forEach(error => console.error(`  - ${error}`))
    }

    if (warnings && warnings.length > 0) {
      console.warn('⚠️  Environment warnings:')
      warnings.forEach(warning => console.warn(`  - ${warning}`))
    }

    // Log what optional variables are using defaults
    if (isValid && config) {
      for (const [varName, defaultValue] of Object.entries(this.OPTIONAL_VARS_WITH_DEFAULTS)) {
        if (!process.env[varName]) {
          console.log(`ℹ️  Using default for ${varName}: ${defaultValue}`)
        }
      }
    }
  }

  static ensureValidEnvironment(): EnvConfig {
    const { isValid, config, errors } = this.validateEnvironment()

    if (!isValid) {
      console.error('[ENV_VALIDATION] Critical environment variables missing or invalid:')
      errors?.forEach(error => console.error(`  - ${error}`))
      console.error('[ENV_VALIDATION] Application cannot start safely')

      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      } else {
        // In development, return a minimal config to allow the app to start
        // This allows developers to see what's missing in the logs
        return {
          NODE_ENV: process.env.NODE_ENV || 'development',
          DATABASE_URL: process.env.DATABASE_URL || '',
          JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-please-change-in-production',
          PUSHER_APP_ID: process.env.PUSHER_APP_ID,
          PUSHER_KEY: process.env.PUSHER_KEY,
          PUSHER_SECRET: process.env.PUSHER_SECRET,
          PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
          NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
          NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
          CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
          CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
          CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
          BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
          CRON_SECRET: process.env.CRON_SECRET || 'dev-cron-secret',
          XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY || '',
          XENDIT_PLATFORM_ACCOUNT_NUMBER: process.env.XENDIT_PLATFORM_ACCOUNT_NUMBER || '',
          XENDIT_PLATFORM_BANK_CODE: process.env.XENDIT_PLATFORM_BANK_CODE || 'BPI',
          XENDIT_PLATFORM_ACCOUNT_NAME: process.env.XENDIT_PLATFORM_ACCOUNT_NAME || 'BridgeMentor Inc',
          XENDIT_WEBHOOK_TOKEN: process.env.XENDIT_WEBHOOK_TOKEN,
          AGORA_APP_ID: process.env.AGORA_APP_ID,
          AGORA_APP_CERTIFICATE: process.env.AGORA_APP_CERTIFICATE,
          RESEND_API_KEY: process.env.RESEND_API_KEY,
          FROM_EMAIL: process.env.FROM_EMAIL,
          REDIS_URL: process.env.REDIS_URL,
          KV_URL: process.env.KV_URL,
        } as EnvConfig
      }
    }

    return config!
  }

  // Health check for required services
  static async validateServiceHealth(): Promise<{
    database: boolean
    pusher: boolean
    cache: boolean
    email: boolean
    storage: boolean
    overall: boolean
  }> {
    const health = {
      database: false,
      pusher: false,
      cache: false,
      email: false,
      storage: false,
      overall: false
    }

    try {
      // Database check
      const { db } = await import('@/db')
      await db.execute('SELECT 1')
      health.database = true
    } catch (error) {
      console.error('Database health check failed:', error)
    }

    try {
      // Pusher check
      const { pusherServer } = await import('@/lib/pusher/config')
      if (pusherServer) {
        // Simple Pusher API call to verify credentials
        await pusherServer.get({ path: '/channels' })
        health.pusher = true
      }
    } catch (error) {
      console.error('Pusher health check failed:', error)
    }

    try {
      // Cache check
      const { getSafeCache } = await import('@/lib/cache/redis-safe')
      const cache = getSafeCache()
      await cache.set('health_check', 'ok', 5000)
      const result = await cache.get('health_check')
      health.cache = result === 'ok'
      await cache.del('health_check') // Cleanup
    } catch (error) {
      console.error('Cache health check failed:', error)
    }

    try {
      // Storage check (Cloudinary)
      const config = this.ensureValidEnvironment()
      if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
        health.storage = true // Basic check - credentials exist
      }
    } catch (error) {
      console.error('Storage health check failed:', error)
    }

    try {
      // Email check (basic config validation)
      const config = this.ensureValidEnvironment()
      if (config.RESEND_API_KEY) {
        health.email = true // Basic check - config exists
      }
    } catch (error) {
      console.error('Email health check failed:', error)
    }

    // Overall health - database is critical, pusher is optional
    health.overall = health.database

    return health
  }
}

// Convenience functions for easier import
export function validateEnvironmentOrThrow(): EnvConfig {
  return EnvironmentValidator.ensureValidEnvironment()
}

export function getEnvConfig(): EnvConfig {
  return EnvironmentValidator.ensureValidEnvironment()
}

export async function validateServiceHealth() {
  return EnvironmentValidator.validateServiceHealth()
}