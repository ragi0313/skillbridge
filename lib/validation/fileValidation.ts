import { z } from 'zod'

// Supported file types for chat attachments
export const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  documents: [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  archives: [
    'application/zip',
    'application/x-zip-compressed'
  ]
} as const

export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.archives
]

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5MB for images
  document: 10 * 1024 * 1024,   // 10MB for documents
  archive: 25 * 1024 * 1024,    // 25MB for archives
  default: 5 * 1024 * 1024      // 5MB default
} as const

// Dangerous file extensions to block
export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.rpm', '.run', '.bin', '.sh', '.ps1',
  '.msi', '.dll', '.sys', '.drv', '.ini', '.reg', '.lnk', '.url'
]

// Validate file type schema
export const fileValidationSchema = z.object({
  originalFilename: z.string().min(1).max(255),
  mimeType: z.enum(ALL_ALLOWED_MIME_TYPES as [string, ...string[]]),
  fileSize: z.number().positive().max(FILE_SIZE_LIMITS.archive),
  fileData: z.string().optional(), // base64 data
})

export type FileValidationInput = z.infer<typeof fileValidationSchema>

// Validation result interface
export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedFilename?: string
  fileCategory?: 'image' | 'document' | 'archive'
}

/**
 * Comprehensive file validation for chat attachments
 */
export function validateChatFile(file: FileValidationInput): FileValidationResult {
  const result: FileValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  try {
    // Basic schema validation
    fileValidationSchema.parse(file)
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.isValid = false
      result.errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return result
    }
  }

  // Filename validation
  const filenameValidation = validateFilename(file.originalFilename)
  if (!filenameValidation.isValid) {
    result.isValid = false
    result.errors.push(...filenameValidation.errors)
  } else {
    result.sanitizedFilename = filenameValidation.sanitizedFilename
  }

  // MIME type validation
  const mimeValidation = validateMimeType(file.mimeType, file.fileSize)
  if (!mimeValidation.isValid) {
    result.isValid = false
    result.errors.push(...mimeValidation.errors)
  } else {
    result.fileCategory = mimeValidation.category
    result.warnings.push(...mimeValidation.warnings)
  }

  // File size validation
  const sizeValidation = validateFileSize(file.fileSize, file.mimeType)
  if (!sizeValidation.isValid) {
    result.isValid = false
    result.errors.push(...sizeValidation.errors)
  }

  // Content validation (if file data is provided)
  if (file.fileData) {
    const contentValidation = validateFileContent(file.fileData, file.mimeType)
    if (!contentValidation.isValid) {
      result.isValid = false
      result.errors.push(...contentValidation.errors)
    }
    result.warnings.push(...contentValidation.warnings)
  }

  return result
}

/**
 * Validate and sanitize filename
 */
function validateFilename(filename: string): { isValid: boolean; errors: string[]; sanitizedFilename?: string } {
  const errors: string[] = []

  // Check for dangerous extensions
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    errors.push(`File type '${extension}' is not allowed for security reasons`)
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|com|pif|vbs|js|jar)$/i,
    /\x00/,                    // Null bytes
    /[<>:"|?*]/,              // Windows forbidden characters
    /^\./,                     // Hidden files starting with dot
    /\.(php|asp|jsp|py|rb|pl|cgi)$/i  // Server-side scripts
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filename)) {
      errors.push(`Filename contains suspicious patterns or characters`)
      break
    }
  }

  // Sanitize filename
  let sanitized = filename
    .replace(/[<>:"|?*\x00-\x1f]/g, '_')  // Replace forbidden chars
    .replace(/^\.+/, '')                   // Remove leading dots
    .replace(/\.+$/, '')                   // Remove trailing dots
    .replace(/\s+/g, '_')                  // Replace spaces with underscores
    .substring(0, 200)                     // Limit length

  // Ensure we have an extension
  if (!sanitized.includes('.') && filename.includes('.')) {
    const originalExt = filename.substring(filename.lastIndexOf('.'))
    if (!BLOCKED_EXTENSIONS.includes(originalExt.toLowerCase())) {
      sanitized += originalExt
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedFilename: sanitized
  }
}

/**
 * Validate MIME type and categorize file
 */
function validateMimeType(mimeType: string, fileSize: number): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  category?: 'image' | 'document' | 'archive'
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!ALL_ALLOWED_MIME_TYPES.includes(mimeType as any)) {
    errors.push(`File type '${mimeType}' is not supported`)
    return { isValid: false, errors, warnings }
  }

  let category: 'image' | 'document' | 'archive'

  if (ALLOWED_MIME_TYPES.images.includes(mimeType as any)) {
    category = 'image'
  } else if (ALLOWED_MIME_TYPES.documents.includes(mimeType as any)) {
    category = 'document'
  } else if (ALLOWED_MIME_TYPES.archives.includes(mimeType as any)) {
    category = 'archive'
    warnings.push('Archive files are allowed but cannot be previewed')
  } else {
    errors.push(`Unknown file category for MIME type: ${mimeType}`)
    return { isValid: false, errors, warnings }
  }

  // Additional warnings for large files
  if (fileSize > 20 * 1024 * 1024) { // 20MB
    warnings.push('Large file detected - upload may take longer')
  }

  return { isValid: true, errors, warnings, category }
}

/**
 * Validate file size based on type
 */
function validateFileSize(fileSize: number, mimeType: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  let limit = FILE_SIZE_LIMITS.default

  if (ALLOWED_MIME_TYPES.images.includes(mimeType as any)) {
    limit = FILE_SIZE_LIMITS.image
  } else if (ALLOWED_MIME_TYPES.documents.includes(mimeType as any)) {
    limit = FILE_SIZE_LIMITS.document
  } else if (ALLOWED_MIME_TYPES.archives.includes(mimeType as any)) {
    limit = FILE_SIZE_LIMITS.archive
  }

  if (fileSize > limit) {
    const limitMB = Math.round(limit / (1024 * 1024))
    const fileMB = Math.round(fileSize / (1024 * 1024))
    errors.push(`File size (${fileMB}MB) exceeds the ${limitMB}MB limit for this file type`)
  }

  if (fileSize === 0) {
    errors.push('File appears to be empty')
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Basic content validation for uploaded files
 */
function validateFileContent(base64Data: string, mimeType: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      errors.push('Invalid file data format')
      return { isValid: false, errors, warnings }
    }

    // Decode and check file signature (magic bytes)
    const binaryString = atob(base64Data.substring(0, Math.min(base64Data.length, 100)))
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const signature = validateFileSignature(bytes, mimeType)
    if (!signature.isValid) {
      errors.push(...signature.errors)
    }
    warnings.push(...signature.warnings)

  } catch (error) {
    errors.push('Failed to validate file content')
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate file signature (magic bytes) against MIME type
 */
function validateFileSignature(bytes: Uint8Array, mimeType: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // File signatures (magic bytes)
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // Note: WEBP also has "WEBP" at offset 8
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]]
  }

  const expectedSignatures = signatures[mimeType]
  if (!expectedSignatures) {
    warnings.push(`No signature validation available for ${mimeType}`)
    return { isValid: true, errors, warnings }
  }

  const fileSignatureMatches = expectedSignatures.some(signature =>
    signature.every((byte, index) => index < bytes.length && bytes[index] === byte)
  )

  if (!fileSignatureMatches) {
    errors.push(`File signature does not match the declared MIME type (${mimeType})`)
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Scan file content for potentially malicious patterns
 */
export function scanForMaliciousContent(content: string): {
  isClean: boolean;
  threats: string[];
  warnings: string[]
} {
  const threats: string[] = []
  const warnings: string[] = []

  // Suspicious patterns that might indicate malicious content
  const maliciousPatterns = [
    // Script patterns
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,

    // Executable signatures
    /MZ[\x00-\xFF]{58}PE/g,  // PE executable
    /\x7fELF/g,              // ELF executable

    // Suspicious strings
    /eval\s*\(/gi,
    /document\.write/gi,
    /window\.location/gi,
    /innerHTML/gi,

    // URL patterns
    /https?:\/\/[^\s<>"']+\.(tk|ml|ga|cf|bit\.ly|tinyurl\.com)/gi
  ]

  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      threats.push(`Suspicious pattern detected: ${pattern.source.substring(0, 50)}...`)
    }
  }

  // Additional heuristics
  if (content.includes('eval(') && content.includes('fromCharCode')) {
    threats.push('Potential obfuscated JavaScript code detected')
  }

  if (content.match(/[a-zA-Z0-9+/]{100,}/)) {
    warnings.push('Long base64-like strings detected - may contain embedded content')
  }

  return {
    isClean: threats.length === 0,
    threats,
    warnings
  }
}