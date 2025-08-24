import { SafeError, toSafeError } from '../types'

export class VideoCallLogger {
  private static prefix = '[VideoCall]'

  static log(message: string, data?: any) {
    if (data) {
      console.log(`${this.prefix} ${message}`, data)
    } else {
      console.log(`${this.prefix} ${message}`)
    }
  }

  static error(message: string, error?: unknown) {
    if (error) {
      const safeError = toSafeError(error)
      console.error(`${this.prefix} ${message}:`, safeError)
    } else {
      console.error(`${this.prefix} ${message}`)
    }
  }

  static warn(message: string, data?: any) {
    if (data) {
      console.warn(`${this.prefix} ${message}`, data)
    } else {
      console.warn(`${this.prefix} ${message}`)
    }
  }

  static debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      if (data) {
        console.log(`${this.prefix} [DEBUG] ${message}`, data)
      } else {
        console.log(`${this.prefix} [DEBUG] ${message}`)
      }
    }
  }
}