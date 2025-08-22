import { toast } from "@/lib/toast"

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  retryAfter?: number
}

interface FetchOptions extends RequestInit {
  showSuccessToast?: boolean
  successMessage?: string
  showErrorToast?: boolean
  customErrorHandler?: (error: any, response?: Response) => void
}

/**
 * Enhanced fetch wrapper with automatic toast notifications and error handling
 */
export async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    showSuccessToast = false,
    successMessage = "Operation completed successfully",
    showErrorToast = true,
    customErrorHandler,
    ...fetchOptions
  } = options

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    })

    // Handle rate limiting
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}))
      if (showErrorToast) {
        toast.rateLimited(errorData.retryAfter)
      }
      return {
        success: false,
        error: "Rate limited",
        retryAfter: errorData.retryAfter
      }
    }

    // Handle authentication errors
    if (response.status === 401) {
      if (showErrorToast) {
        toast.sessionExpired()
      }
      return {
        success: false,
        error: "Unauthorized"
      }
    }

    // Handle permission errors
    if (response.status === 403) {
      if (showErrorToast) {
        toast.unauthorized()
      }
      return {
        success: false,
        error: "Forbidden"
      }
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMessage = data.error || data.message || `HTTP ${response.status}`
      
      if (customErrorHandler) {
        customErrorHandler(errorMessage, response)
      } else if (showErrorToast) {
        toast.error(errorMessage)
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    // Success case
    if (showSuccessToast) {
      toast.success(successMessage)
    }

    return {
      success: true,
      data
    }

  } catch (error: any) {
    // Network or other errors
    const errorMessage = error.message || "Network error occurred"
    
    if (customErrorHandler) {
      customErrorHandler(error)
    } else if (showErrorToast) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.networkError()
      } else {
        toast.error(errorMessage)
      }
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Helper for form submissions with loading states and validation error handling
 */
export async function submitForm<T = any>(
  url: string,
  formData: any,
  options: {
    method?: 'POST' | 'PUT' | 'PATCH'
    successMessage?: string
    onValidationError?: (errors: Record<string, string[]>) => void
  } = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'POST',
    successMessage = "Form submitted successfully",
    onValidationError
  } = options

  const response = await apiFetch<T>(url, {
    method,
    body: JSON.stringify(formData),
    showSuccessToast: true,
    successMessage,
    customErrorHandler: (error, response) => {
      // Handle validation errors (422)
      if (response?.status === 422) {
        const validationErrors = error.errors || {}
        if (onValidationError) {
          onValidationError(validationErrors)
        } else {
          toast.validationError(validationErrors)
        }
      } else {
        toast.error(error)
      }
    }
  })

  return response
}

/**
 * Helper for file uploads with progress tracking
 */
export async function uploadFile(
  url: string,
  file: File,
  options: {
    onProgress?: (progress: number) => void
    additionalFields?: Record<string, string>
  } = {}
): Promise<ApiResponse> {
  const { onProgress, additionalFields } = options
  
  const formData = new FormData()
  formData.append('file', file)
  
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value)
    })
  }

  const progressToastId = toast.uploadProgress(file.name)

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    toast.dismiss(progressToastId)

    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}))
      toast.rateLimited(errorData.retryAfter)
      return { success: false, error: "Rate limited" }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || "Upload failed"
      toast.uploadError(file.name, errorMessage)
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    toast.uploadSuccess(file.name)
    
    return { success: true, data }

  } catch (error: any) {
    toast.dismiss(progressToastId)
    const errorMessage = error.message || "Upload failed"
    toast.uploadError(file.name, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Helper for DELETE operations with confirmation
 */
export async function deleteResource(
  url: string,
  resourceName: string = "item"
): Promise<ApiResponse> {
  return apiFetch(url, {
    method: 'DELETE',
    showSuccessToast: true,
    successMessage: `${resourceName} deleted successfully`,
    showErrorToast: true
  })
}

/**
 * Retry helper for failed requests
 */
export async function retryRequest<T>(
  requestFn: () => Promise<ApiResponse<T>>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<ApiResponse<T>> {
  let lastError: ApiResponse<T> | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await requestFn()
      
      if (result.success) {
        return result
      }
      
      lastError = result
      
      // Don't retry on certain error types
      if (result.error === "Rate limited" || result.error === "Unauthorized" || result.error === "Forbidden") {
        break
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    } catch (error: any) {
      lastError = { success: false, error: error.message }
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  }

  return lastError || { success: false, error: "Request failed after retries" }
}