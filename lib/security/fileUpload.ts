import { fileTypeFromBuffer } from 'file-type'
import crypto from 'crypto'

// Allowed file types configuration
const ALLOWED_FILE_TYPES = {
  images: {
    'image/jpeg': { extensions: ['jpg', 'jpeg'], maxSize: 5 * 1024 * 1024 }, // 5MB
    'image/png': { extensions: ['png'], maxSize: 5 * 1024 * 1024 },
    'image/gif': { extensions: ['gif'], maxSize: 2 * 1024 * 1024 }, // 2MB for GIFs
    'image/webp': { extensions: ['webp'], maxSize: 5 * 1024 * 1024 },
  },
  documents: {
    'application/pdf': { extensions: ['pdf'], maxSize: 10 * 1024 * 1024 }, // 10MB
    'text/plain': { extensions: ['txt'], maxSize: 1 * 1024 * 1024 }, // 1MB
    'application/msword': { extensions: ['doc'], maxSize: 10 * 1024 * 1024 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      extensions: ['docx'],
      maxSize: 10 * 1024 * 1024
    },
    'application/vnd.ms-excel': { extensions: ['xls'], maxSize: 10 * 1024 * 1024 },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      extensions: ['xlsx'],
      maxSize: 10 * 1024 * 1024
    },
  }
}

// Get all allowed MIME types
const getAllowedMimeTypes = (): string[] => {
  return [
    ...Object.keys(ALLOWED_FILE_TYPES.images),
    ...Object.keys(ALLOWED_FILE_TYPES.documents)
  ]
}

// File validation result interface
export interface FileValidationResult {
  isValid: boolean
  error?: string
  sanitizedFileName?: string
  detectedMimeType?: string
  fileSize?: number
  category?: 'image' | 'document'
}

// Sanitize filename to prevent path traversal and other attacks
export function sanitizeFileName(originalName: string): string {
  if (!originalName || typeof originalName !== 'string') {
    return 'unnamed_file'
  }

  // Remove path components and dangerous characters
  const sanitized = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .slice(0, 100) // Limit length

  // Ensure we have a name
  if (sanitized.length === 0) {
    return 'unnamed_file'
  }

  // Add timestamp to make unique
  const timestamp = Date.now()
  const randomSuffix = crypto.randomBytes(4).toString('hex')
  const extension = sanitized.includes('.')
    ? '.' + sanitized.split('.').pop()
    : ''
  const baseName = sanitized.includes('.')
    ? sanitized.substring(0, sanitized.lastIndexOf('.'))
    : sanitized

  return `${baseName}_${timestamp}_${randomSuffix}${extension}`
}

// Validate file buffer against MIME type and size constraints
export async function validateFileUpload(
  buffer: Buffer,
  originalFileName: string,
  reportedMimeType?: string
): Promise<FileValidationResult> {
  try {
    // Basic validations
    if (!buffer || buffer.length === 0) {
      return { isValid: false, error: 'File is empty' }
    }

    if (!originalFileName) {
      return { isValid: false, error: 'Filename is required' }
    }

    // Detect actual file type from buffer (more reliable than extension/reported type)
    const detectedFileType = await fileTypeFromBuffer(buffer)

    if (!detectedFileType) {
      return {
        isValid: false,
        error: 'Could not determine file type. File may be corrupted or unsupported.'
      }
    }

    const { mime: detectedMimeType } = detectedFileType
    const fileSize = buffer.length

    // Check if detected MIME type is allowed
    const allowedMimeTypes = getAllowedMimeTypes()
    if (!allowedMimeTypes.includes(detectedMimeType)) {
      return {
        isValid: false,
        error: `File type '${detectedMimeType}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        detectedMimeType
      }
    }

    // Find the file type configuration
    let fileConfig: { extensions: string[], maxSize: number } | null = null
    let category: 'image' | 'document' | undefined = undefined

    if (ALLOWED_FILE_TYPES.images[detectedMimeType as keyof typeof ALLOWED_FILE_TYPES.images]) {
      fileConfig = ALLOWED_FILE_TYPES.images[detectedMimeType as keyof typeof ALLOWED_FILE_TYPES.images]
      category = 'image'
    } else if (ALLOWED_FILE_TYPES.documents[detectedMimeType as keyof typeof ALLOWED_FILE_TYPES.documents]) {
      fileConfig = ALLOWED_FILE_TYPES.documents[detectedMimeType as keyof typeof ALLOWED_FILE_TYPES.documents]
      category = 'document'
    }

    if (!fileConfig) {
      return {
        isValid: false,
        error: `Configuration not found for MIME type '${detectedMimeType}'`,
        detectedMimeType
      }
    }

    // Check file size
    if (fileSize > fileConfig.maxSize) {
      const maxSizeMB = (fileConfig.maxSize / (1024 * 1024)).toFixed(1)
      const currentSizeMB = (fileSize / (1024 * 1024)).toFixed(1)
      return {
        isValid: false,
        error: `File size (${currentSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
        detectedMimeType,
        fileSize
      }
    }

    // Validate reported MIME type matches detected (if provided)
    if (reportedMimeType && reportedMimeType !== detectedMimeType) {
      }

    // Additional security checks for images
    if (category === 'image') {
      const securityCheck = await validateImageSecurity(buffer, detectedMimeType)
      if (!securityCheck.isValid) {
        return securityCheck
      }
    }

    // Generate sanitized filename
    const sanitizedFileName = sanitizeFileName(originalFileName)

    return {
      isValid: true,
      sanitizedFileName,
      detectedMimeType,
      fileSize,
      category
    }
  } catch (error) {
    console.error('File validation error:', error)
    return {
      isValid: false,
      error: 'File validation failed due to internal error'
    }
  }
}

// Additional security validation for images
async function validateImageSecurity(buffer: Buffer, mimeType: string): Promise<FileValidationResult> {
  try {
    // Check for embedded scripts or suspicious patterns in image files
    const bufferString = buffer.toString('utf8')

    // Look for script tags, javascript, or other suspicious content
    const suspiciousPatterns = [
      /<script/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /data:text\/html/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bufferString)) {
        return {
          isValid: false,
          error: 'Image file contains suspicious content that may be malicious'
        }
      }
    }

    // Basic image header validation
    if (mimeType === 'image/jpeg') {
      // JPEG files should start with FFD8 and end with FFD9
      if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
        return {
          isValid: false,
          error: 'Invalid JPEG file header'
        }
      }
    } else if (mimeType === 'image/png') {
      // PNG files should start with PNG signature
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
      if (!buffer.subarray(0, 8).equals(pngSignature)) {
        return {
          isValid: false,
          error: 'Invalid PNG file signature'
        }
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: 'Image security validation failed'
    }
  }
}

// Check if file type is an image
export function isImageFile(mimeType: string): boolean {
  return Object.keys(ALLOWED_FILE_TYPES.images).includes(mimeType)
}

// Check if file type is a document
export function isDocumentFile(mimeType: string): boolean {
  return Object.keys(ALLOWED_FILE_TYPES.documents).includes(mimeType)
}

// Get maximum allowed file size for a MIME type
export function getMaxFileSize(mimeType: string): number {
  const imageConfig = ALLOWED_FILE_TYPES.images[mimeType as keyof typeof ALLOWED_FILE_TYPES.images]
  if (imageConfig) return imageConfig.maxSize

  const documentConfig = ALLOWED_FILE_TYPES.documents[mimeType as keyof typeof ALLOWED_FILE_TYPES.documents]
  if (documentConfig) return documentConfig.maxSize

  return 0 // Not allowed
}

import { getSafeCache } from '@/lib/cache/redis-safe'

// Rate limiting for file uploads (per user)
export async function checkUploadRateLimit(userId: number, maxUploads: number = 5, windowMs: number = 600000): Promise<boolean> {
  const cache = getSafeCache()
  const key = `upload_rate_limit:${userId}`
  const now = Date.now()

  try {
    const timestampsJson = await cache.get(key)
    let timestamps: number[] = timestampsJson ? JSON.parse(timestampsJson) : []

    // Remove timestamps outside the window
    const recentTimestamps = timestamps.filter(timestamp => timestamp > now - windowMs)

    // Check if user has exceeded rate limit
    if (recentTimestamps.length >= maxUploads) {
      return false
    }

    // Add current timestamp
    recentTimestamps.push(now)

    // Update cache with expiry slightly longer than window to handle edge cases
    await cache.set(key, JSON.stringify(recentTimestamps), windowMs + 60000)

    return true
  } catch (error) {
    console.error('Upload rate limit cache error:', error)
    // If cache fails, allow the request (fail open)
    return true
  }
}