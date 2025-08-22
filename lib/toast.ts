import { toast as sonnerToast } from "sonner"
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react"

interface ToastOptions {
  duration?: number
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

class ToastManager {
  private static instance: ToastManager
  private defaultDuration = 4000

  private constructor() {}

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager()
    }
    return ToastManager.instance
  }

  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, {
      duration: options?.duration || this.defaultDuration,
      position: options?.position,
      dismissible: options?.dismissible ?? true,
      icon: CheckCircle,
      action: options?.action,
      className: "bg-green-50 border-green-200 text-green-800",
    })
  }

  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, {
      duration: options?.duration || 6000, // Longer for errors
      position: options?.position,
      dismissible: options?.dismissible ?? true,
      icon: AlertCircle,
      action: options?.action,
      className: "bg-red-50 border-red-200 text-red-800",
    })
  }

  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, {
      duration: options?.duration || this.defaultDuration,
      position: options?.position,
      dismissible: options?.dismissible ?? true,
      icon: AlertTriangle,
      action: options?.action,
      className: "bg-yellow-50 border-yellow-200 text-yellow-800",
    })
  }

  info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, {
      duration: options?.duration || this.defaultDuration,
      position: options?.position,
      dismissible: options?.dismissible ?? true,
      icon: Info,
      action: options?.action,
      className: "bg-blue-50 border-blue-200 text-blue-800",
    })
  }

  promise<T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
      ...options
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    } & ToastOptions
  ) {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error,
      duration: options?.duration || this.defaultDuration,
      position: options?.position,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    })
  }

  loading(message: string, options?: ToastOptions) {
    return sonnerToast.loading(message, {
      duration: options?.duration || Infinity, // Loading toasts don't auto-dismiss
      position: options?.position,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    })
  }

  dismiss(toastId?: string | number) {
    if (toastId) {
      sonnerToast.dismiss(toastId)
    } else {
      sonnerToast.dismiss()
    }
  }

  // API-specific toast helpers
  apiSuccess(message: string = "Operation completed successfully") {
    return this.success(message)
  }

  apiError(error: any, fallbackMessage: string = "Something went wrong") {
    const message = error?.response?.data?.error || error?.message || fallbackMessage
    return this.error(message)
  }

  // Rate limiting specific toast
  rateLimited(retryAfter?: number) {
    const message = retryAfter 
      ? `Too many requests. Please try again in ${retryAfter} seconds.`
      : "Too many requests. Please slow down and try again."
    
    return this.warning(message, {
      duration: 8000,
      action: {
        label: "Dismiss",
        onClick: () => {}
      }
    })
  }

  // Session/Auth specific toasts
  sessionExpired() {
    return this.warning("Your session has expired. Please log in again.", {
      duration: 6000,
      action: {
        label: "Login",
        onClick: () => window.location.href = "/login"
      }
    })
  }

  unauthorized() {
    return this.error("You don't have permission to perform this action.")
  }

  // Network specific toasts
  networkError() {
    return this.error("Network error. Please check your connection and try again.", {
      action: {
        label: "Retry",
        onClick: () => window.location.reload()
      }
    })
  }

  // Form validation helper
  validationError(errors: Record<string, string[]>) {
    const firstError = Object.values(errors)[0]?.[0]
    if (firstError) {
      return this.error(firstError)
    }
  }

  // File upload helpers
  uploadProgress(filename: string) {
    return this.loading(`Uploading ${filename}...`)
  }

  uploadSuccess(filename: string) {
    return this.success(`${filename} uploaded successfully`)
  }

  uploadError(filename: string, error?: string) {
    return this.error(`Failed to upload ${filename}${error ? `: ${error}` : ""}`)
  }
}

// Export singleton instance
export const toast = ToastManager.getInstance()

// Export individual methods for convenience
export const {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  promise: toastPromise,
  loading: toastLoading,
  dismiss: toastDismiss,
  apiSuccess,
  apiError,
  rateLimited,
  sessionExpired,
  unauthorized,
  networkError,
  validationError,
  uploadProgress,
  uploadSuccess,
  uploadError,
} = toast