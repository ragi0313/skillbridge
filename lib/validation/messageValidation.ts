import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Message size limits
export const MESSAGE_LIMITS = {
  content: {
    min: 1,
    max: 4000,           // 4000 characters for message content
    warning: 3000        // Warning threshold
  },
  attachments: {
    max: 5,              // Maximum attachments per message
    totalSize: 50 * 1024 * 1024  // 50MB total size per message
  }
} as const

// Message validation schema
export const messageValidationSchema = z.object({
  content: z.string()
    .min(MESSAGE_LIMITS.content.min, 'Message cannot be empty')
    .max(MESSAGE_LIMITS.content.max, `Message cannot exceed ${MESSAGE_LIMITS.content.max} characters`),
  messageType: z.enum(['text', 'file', 'image']).default('text'),
  attachments: z.array(z.object({
    originalFilename: z.string().min(1).max(255),
    systemFilename: z.string().min(1).max(255),
    fileUrl: z.string().url(),
    fileSize: z.number().positive(),
    mimeType: z.string().min(1),
    storagePath: z.string().optional(),
  })).max(MESSAGE_LIMITS.attachments.max, `Maximum ${MESSAGE_LIMITS.attachments.max} attachments per message`).optional(),
})

export type MessageValidationInput = z.infer<typeof messageValidationSchema>

// Validation result interface
export interface MessageValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedContent?: string
  isSpam?: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

/**
 * Comprehensive message validation for chat
 */
export function validateChatMessage(message: MessageValidationInput): MessageValidationResult {
  const result: MessageValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    riskLevel: 'low'
  }

  try {
    // Basic schema validation
    messageValidationSchema.parse(message)
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.isValid = false
      result.errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return result
    }
  }

  // Content validation and sanitization
  const contentValidation = validateMessageContent(message.content)
  result.sanitizedContent = contentValidation.sanitizedContent
  result.isSpam = contentValidation.isSpam
  result.riskLevel = contentValidation.riskLevel

  if (!contentValidation.isValid) {
    result.isValid = false
    result.errors.push(...contentValidation.errors)
  }
  result.warnings.push(...contentValidation.warnings)

  // Attachment validation
  if (message.attachments && message.attachments.length > 0) {
    const attachmentValidation = validateAttachments(message.attachments)
    if (!attachmentValidation.isValid) {
      result.isValid = false
      result.errors.push(...attachmentValidation.errors)
    }
    result.warnings.push(...attachmentValidation.warnings)

    // Upgrade risk level if attachments present
    if (result.riskLevel === 'low') {
      result.riskLevel = 'medium'
    }
  }

  return result
}

/**
 * Validate and sanitize message content
 */
function validateMessageContent(content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedContent: string;
  isSpam: boolean;
  riskLevel: 'low' | 'medium' | 'high'
} {
  const errors: string[] = []
  const warnings: string[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  // Basic length validation
  if (content.length > MESSAGE_LIMITS.content.warning) {
    warnings.push(`Message is quite long (${content.length} characters)`)
  }

  // Sanitize HTML content
  let sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],           // No HTML tags allowed
    ALLOWED_ATTR: [],           // No attributes allowed
    RETURN_DOM: false,          // Return string
    RETURN_DOM_FRAGMENT: false,
  })

  // Additional content checks
  const contentChecks = performContentSecurityChecks(content)
  if (contentChecks.hasThreats) {
    errors.push(...contentChecks.threats)
    riskLevel = 'high'
  }

  warnings.push(...contentChecks.warnings)

  // Spam detection
  const spamCheck = detectSpam(content)
  if (spamCheck.isSpam) {
    if (spamCheck.confidence > 0.8) {
      errors.push('Message appears to be spam')
      riskLevel = 'high'
    } else {
      warnings.push('Message may contain spam-like content')
      if (riskLevel === 'low') riskLevel = 'medium'
    }
  }

  // Check for repeated patterns
  const repetitionCheck = checkForExcessiveRepetition(content)
  if (repetitionCheck.isExcessive) {
    warnings.push('Message contains excessive repetition')
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedContent,
    isSpam: spamCheck.isSpam && spamCheck.confidence > 0.8,
    riskLevel
  }
}

/**
 * Perform security checks on message content
 */
function performContentSecurityChecks(content: string): {
  hasThreats: boolean;
  threats: string[];
  warnings: string[]
} {
  const threats: string[] = []
  const warnings: string[] = []

  // Suspicious patterns
  const suspiciousPatterns = [
    // Potential XSS
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,

    // Potential injection
    /union\s+select/gi,
    /insert\s+into/gi,
    /drop\s+table/gi,
    /delete\s+from/gi,

    // Suspicious protocols
    /file:\/\//gi,
    /ftp:\/\//gi,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      threats.push(`Suspicious pattern detected in message content`)
      break
    }
  }

  // Check for suspicious URLs
  const urlPattern = /https?:\/\/[^\s<>"']+/gi
  const urls = content.match(urlPattern) || []

  for (const url of urls) {
    if (isUrlSuspicious(url)) {
      warnings.push(`Suspicious URL detected: ${url.substring(0, 50)}...`)
    }
  }

  // Check for base64 content
  const base64Pattern = /[A-Za-z0-9+/]{50,}={0,2}/g
  if (base64Pattern.test(content)) {
    warnings.push('Message contains base64-encoded content')
  }

  return {
    hasThreats: threats.length > 0,
    threats,
    warnings
  }
}

/**
 * Basic spam detection
 */
function detectSpam(content: string): { isSpam: boolean; confidence: number } {
  let spamScore = 0
  const factors = []

  // Common spam indicators
  const spamPatterns = [
    /\b(buy now|click here|limited time|act fast|urgent|winner|congratulations)\b/gi,
    /\b(money|cash|prize|lottery|million|bitcoin|investment)\b/gi,
    /\b(free|100%|guarantee|risk-free|no catch)\b/gi,
    /\$[\d,]+|\b\d+\s*USD\b/gi,  // Money amounts
    /\b(call now|visit|website|link|subscribe)\b/gi,
  ]

  spamPatterns.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) {
      spamScore += matches.length * 0.1
      factors.push(`Spam keywords: ${matches.join(', ')}`)
    }
  })

  // Excessive capitalization
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
  if (capsRatio > 0.5 && content.length > 20) {
    spamScore += 0.3
    factors.push('Excessive capitalization')
  }

  // Excessive punctuation
  const punctRatio = (content.match(/[!?]{2,}/g) || []).length
  if (punctRatio > 2) {
    spamScore += 0.2
    factors.push('Excessive punctuation')
  }

  // Very short messages with URLs
  const hasUrl = /https?:\/\//gi.test(content)
  if (hasUrl && content.length < 50) {
    spamScore += 0.4
    factors.push('Short message with URL')
  }

  const confidence = Math.min(spamScore, 1)

  return {
    isSpam: confidence > 0.5,
    confidence
  }
}

/**
 * Check for excessive repetition in content
 */
function checkForExcessiveRepetition(content: string): { isExcessive: boolean; details: string[] } {
  const details: string[] = []

  // Check for repeated characters
  const repeatedChars = content.match(/(.)\1{5,}/g)
  if (repeatedChars) {
    details.push(`Repeated characters: ${repeatedChars.join(', ')}`)
  }

  // Check for repeated words
  const words = content.toLowerCase().split(/\s+/)
  const wordCounts: Record<string, number> = {}

  words.forEach(word => {
    if (word.length > 2) {  // Only count words longer than 2 characters
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }
  })

  const repeatedWords = Object.entries(wordCounts)
    .filter(([word, count]) => count > 5)
    .map(([word, count]) => `${word} (${count} times)`)

  if (repeatedWords.length > 0) {
    details.push(`Repeated words: ${repeatedWords.join(', ')}`)
  }

  return {
    isExcessive: details.length > 0,
    details
  }
}

/**
 * Check if URL is suspicious
 */
function isUrlSuspicious(url: string): boolean {
  // Known suspicious TLDs
  const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.bit']

  // URL shorteners (can be used to hide destination)
  const urlShorteners = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
    'short.link', 'rebrand.ly', 'cutt.ly', 'tiny.cc'
  ]

  // Check for suspicious TLDs
  for (const tld of suspiciousTlds) {
    if (url.includes(tld)) {
      return true
    }
  }

  // Check for URL shorteners
  for (const shortener of urlShorteners) {
    if (url.includes(shortener)) {
      return true
    }
  }

  // Check for IP addresses instead of domains
  const ipPattern = /https?:\/\/\d+\.\d+\.\d+\.\d+/
  if (ipPattern.test(url)) {
    return true
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /[a-z]{10,}\.com/i,  // Very long domain names
    /\d{5,}/,            // Lots of numbers in domain
    /-{3,}/,             // Multiple consecutive hyphens
  ]

  return suspiciousPatterns.some(pattern => pattern.test(url))
}

/**
 * Validate message attachments
 */
function validateAttachments(attachments: MessageValidationInput['attachments']): {
  isValid: boolean;
  errors: string[];
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!attachments) {
    return { isValid: true, errors, warnings }
  }

  // Check total attachment size
  const totalSize = attachments.reduce((sum, att) => sum + att.fileSize, 0)
  if (totalSize > MESSAGE_LIMITS.attachments.totalSize) {
    const totalMB = Math.round(totalSize / (1024 * 1024))
    const limitMB = Math.round(MESSAGE_LIMITS.attachments.totalSize / (1024 * 1024))
    errors.push(`Total attachment size (${totalMB}MB) exceeds ${limitMB}MB limit`)
  }

  // Validate individual attachments
  attachments.forEach((attachment, index) => {
    // Check for valid URLs
    try {
      new URL(attachment.fileUrl)
    } catch {
      errors.push(`Attachment ${index + 1}: Invalid file URL`)
    }

    // Check filename for suspicious patterns
    if (attachment.originalFilename.includes('..') || attachment.originalFilename.includes('/')) {
      errors.push(`Attachment ${index + 1}: Suspicious filename detected`)
    }

    // Warn about large files
    if (attachment.fileSize > 10 * 1024 * 1024) { // 10MB
      warnings.push(`Attachment ${index + 1}: Large file (${Math.round(attachment.fileSize / (1024 * 1024))}MB)`)
    }
  })

  return { isValid: errors.length === 0, errors, warnings }
}