// Environment variable validation for production safety
export class EnvironmentValidator {
  private static readonly REQUIRED_VARS = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'CRON_SECRET',
    'XENDIT_SECRET_KEY',
    'XENDIT_PLATFORM_ACCOUNT_NUMBER'
  ]

  private static readonly OPTIONAL_VARS_WITH_DEFAULTS = {
    'XENDIT_PLATFORM_BANK_CODE': 'BPI',
    'XENDIT_PLATFORM_ACCOUNT_NAME': 'SkillBridge Inc',
    'NODE_ENV': 'development'
  }

  static validateEnvironment(): {
    isValid: boolean
    missingVars: string[]
    warnings: string[]
  } {
    const missingVars: string[] = []
    const warnings: string[] = []

    // Check required variables
    for (const varName of this.REQUIRED_VARS) {
      if (!process.env[varName]) {
        missingVars.push(varName)
      }
    }

    // Check production-specific requirements
    if (process.env.NODE_ENV === 'production') {
      // Ensure CRON_SECRET is strong in production
      if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32) {
        warnings.push('CRON_SECRET should be at least 32 characters in production')
      }

      // Validate Xendit configuration
      if (!process.env.XENDIT_PLATFORM_ACCOUNT_NUMBER) {
        missingVars.push('XENDIT_PLATFORM_ACCOUNT_NUMBER (required in production)')
      }

      // Check that we're not using default values in production
      if (process.env.XENDIT_PLATFORM_ACCOUNT_NAME === 'SkillBridge Inc') {
        warnings.push('Using default XENDIT_PLATFORM_ACCOUNT_NAME in production')
      }
    }

    return {
      isValid: missingVars.length === 0,
      missingVars,
      warnings
    }
  }

  static logEnvironmentStatus(): void {
    const { isValid, missingVars, warnings } = this.validateEnvironment()

    console.log('[ENV_VALIDATION] Environment validation results:')
    
    if (isValid) {
      console.log('✅ All required environment variables are present')
    } else {
      console.error('❌ Missing required environment variables:', missingVars)
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Environment warnings:', warnings)
    }

    // Log what optional variables are using defaults
    for (const [varName, defaultValue] of Object.entries(this.OPTIONAL_VARS_WITH_DEFAULTS)) {
      if (!process.env[varName]) {
        console.log(`📝 Using default for ${varName}: ${defaultValue}`)
      }
    }
  }

  static ensureValidEnvironment(): void {
    const { isValid, missingVars } = this.validateEnvironment()
    
    if (!isValid) {
      console.error('[ENV_VALIDATION] Critical environment variables missing:', missingVars)
      console.error('[ENV_VALIDATION] Application cannot start safely')
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      } else {
        console.warn('[ENV_VALIDATION] Continuing in development mode with missing variables')
      }
    }
  }
}